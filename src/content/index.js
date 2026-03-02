/**
 * BroBlock V2 — Content Script Entry Point
 * Manages state, boots the observer, listens for settings changes.
 * Loaded last in manifest content_scripts array.
 * Depends on: BB, BroBlockObserver, BroBlockCleanup, BroBlockUI
 */

(() => {
  // Shared state — passed to all content modules
  const state = {
    enabled: true,
    threshold: BB.LIMITS.THRESHOLD_DEFAULT,
    knownBros: new Set(),
    trustedUsers: new Set(),
    interestedCategories: new Set(),
    userCache: new Map(), // handle_lowercase -> { followers, following }
    shadowCSS: null,
  };

  // ── Theme Detection ──
  // Detects Twitter light/dark mode and sets data-bb-theme on :root.
  // CSS custom properties on :root cascade into shadow DOM, so both
  // content.css and shadow.css adapt automatically.

  function detectTheme() {
    const bg = getComputedStyle(document.body).backgroundColor;
    const match = bg.match(/\d+/g);
    if (!match) return "dark";
    const [r, g, b] = match.map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "light" : "dark";
  }

  function applyTheme() {
    document.documentElement.dataset.bbTheme = detectTheme();
  }

  // Apply immediately and watch for Twitter theme changes
  applyTheme();
  let themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  // Debounce rescan to prevent rapid-fire when multiple settings change at once
  let rescanTimer = null;
  function debouncedRescan() {
    if (rescanTimer) clearTimeout(rescanTimer);
    rescanTimer = setTimeout(() => {
      rescanTimer = null;
      if (state.enabled) BroBlockObserver.rescan(state);
    }, 100);
  }

  // Load settings and boot
  chrome.storage.sync.get(BB.DEFAULTS.sync, (settings) => {
    state.enabled = settings.enabled;
    state.threshold = settings.threshold;
    state.knownBros = new Set(settings.knownBros.map((h) => h.toLowerCase()));
    state.trustedUsers = new Set(settings.trustedUsers.map((h) => h.toLowerCase()));
    state.interestedCategories = new Set(settings.interestedCategories || []);

    if (state.enabled) boot();
  });

  // Listen for live settings changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;

    let needsRescan = false;

    if (changes.enabled) {
      state.enabled = changes.enabled.newValue;
      if (state.enabled) {
        if (!themeObserver) {
          themeObserver = new MutationObserver(applyTheme);
          themeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ["style", "class"],
          });
        }
        boot();
        needsRescan = true;
      } else {
        BroBlockObserver.stop();
        BroBlockCleanup.cleanAll();
        if (themeObserver) {
          themeObserver.disconnect();
          themeObserver = null;
        }
        return;
      }
    }

    if (changes.threshold) {
      state.threshold = changes.threshold.newValue;
      needsRescan = true;
    }

    if (changes.knownBros) {
      state.knownBros = new Set(
        (changes.knownBros.newValue || []).map((h) => h.toLowerCase())
      );
      needsRescan = true;
    }

    if (changes.trustedUsers) {
      state.trustedUsers = new Set(
        (changes.trustedUsers.newValue || []).map((h) => h.toLowerCase())
      );
      needsRescan = true;
    }

    if (changes.interestedCategories) {
      state.interestedCategories = new Set(changes.interestedCategories.newValue || []);
      needsRescan = true;
    }

    if (needsRescan && state.enabled) {
      debouncedRescan();
    }
  });

  // Listen for test-frost command from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "bb-test-frost") {
      const count = testFrost();
      sendResponse({ count });
      return true;
    }
  });

  function testFrost() {
    const articles = document.querySelectorAll("article:not(.bb-frosted)");
    let count = 0;

    for (const article of articles) {
      // Remove any existing inline pill
      const pill = article.querySelector(".bb-pill");
      if (pill) pill.remove();

      const handle = BroBlockExtractor.extractHandle(article) || "testuser";
      const normalized = handle.toLowerCase();
      const userMeta = state.userCache.get(normalized) || null;

      BroBlockUI.renderFrost(article, {
        score: 85,
        handle: handle,
        state: "scored",
        reasons: ["This is a test frost"],
        categories: ["Test"],
        breakdown: [{ id: "test", category: "Test", points: 85, reasons: ["This is a test"] }],
        userMeta: userMeta,
      }, state);
      count++;
    }

    // Auto-unfrost after 3 seconds and restore normal scoring
    setTimeout(() => {
      BroBlockCleanup.cleanAll();
      if (state.enabled) BroBlockObserver.rescan(state);
    }, 3000);

    return count;
  }

  // Listen for user metadata from MAIN-world API interceptor
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== "bb-user-data") return;
    const users = event.data.users;
    if (!users || typeof users !== "object") return;
    const newHandles = new Set();
    for (const [handle, meta] of Object.entries(users)) {
      if (!state.userCache.has(handle)) newHandles.add(handle);
      state.userCache.set(handle, meta);
    }
    // Update any already-rendered frost tabs that were missing metadata
    if (newHandles.size > 0) {
      BroBlockUI.updateFrostMeta(newHandles);
    }
  });

  async function boot() {
    if (!state.shadowCSS) {
      state.shadowCSS = await loadShadowCSS();
    }
    BroBlockUI.init(state);
    BroBlockObserver.start(state);
  }

  async function loadShadowCSS() {
    try {
      const url = chrome.runtime.getURL("src/shadow.css");
      const resp = await fetch(url);
      let css = await resp.text();
      // Replace font base URL placeholder
      css = css.replaceAll("__FONT_BASE__", chrome.runtime.getURL("fonts"));
      return css;
    } catch (e) {
      console.error("[BroBlock] Failed to load shadow CSS:", e);
      return "";
    }
  }
})();
