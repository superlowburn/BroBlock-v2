/**
 * BroBlock V2 — UI Module
 * All DOM injection: frost layers, inline pills, popup menu, actions.
 * Depends on: BB, BroBlockExtractor, BroBlockCleanup, BroBlockObserver
 */

/* eslint-disable no-unused-vars */
const BroBlockUI = (() => {
  let state = null;
  let shadowCSS = "";

  function init(s) {
    state = s;
    shadowCSS = s.shadowCSS || "";
  }

  function formatCount(n) {
    if (typeof n !== "number") return "?";
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  function injectShadowStyles(shadowRoot) {
    const style = document.createElement("style");
    style.textContent = shadowCSS;
    shadowRoot.appendChild(style);
  }

  /** Build title tooltip string: BroScore + follower counts. */
  function buildTooltip(score, userMeta) {
    const lines = [];
    if (typeof score === "number" && score > 0) {
      lines.push("BroScore: " + score);
    }
    if (userMeta && typeof userMeta.following === "number") {
      lines.push(
        formatCount(userMeta.following) + " following · " +
        formatCount(userMeta.followers) + " followers"
      );
    }
    return lines.join("\n");
  }

  // ═══════════════════════════════════════
  // FROST RENDERING
  // ═══════════════════════════════════════

  function renderFrost(article, data, s) {
    article.classList.add("bb-frosted");

    data.isFrosted = true;
    data._article = article;

    // Layer 1: Blur backdrop (must be in Twitter's DOM for backdrop-filter)
    const backdrop = document.createElement("div");
    backdrop.className = "bb-frost-backdrop";
    // Click backdrop to peek (unfrost and show tweet content)
    backdrop.addEventListener("click", (e) => {
      e.stopPropagation();
      doUnfrost(data);
    });
    article.appendChild(backdrop);

    // Layer 2: Floating pill (Shadow DOM) — bro toggle
    const pillHost = document.createElement("div");
    pillHost.className = "bb-pill-host";
    article.appendChild(pillHost);
    const pillRoot = pillHost.attachShadow({ mode: "open" });
    injectShadowStyles(pillRoot);
    buildFloatingPill(pillRoot, data, s);
  }

  function buildFloatingPill(shadowRoot, data, s) {
    const normalized = data.handle ? data.handle.toLowerCase() : null;
    const isKnownBro = normalized && state.knownBros.has(normalized);

    // Frost tab: handle · follower counts · pill
    const tab = document.createElement("div");
    tab.className = "bb-frost-tab";
    tab.dataset.state = isKnownBro ? "bro" : "clean";

    // Handle (left)
    const handleEl = document.createElement("span");
    handleEl.className = "bb-frost-tab-handle";
    handleEl.textContent = data.handle ? "@" + data.handle : "Unknown";
    tab.appendChild(handleEl);

    // Follower/following counts (center) — from API interceptor cache
    if (data.userMeta) {
      const meta = document.createElement("span");
      meta.className = "bb-frost-tab-meta";
      meta.textContent =
        formatCount(data.userMeta.following) + " following \u00b7 " +
        formatCount(data.userMeta.followers) + " followers";
      tab.appendChild(meta);
    }

    // Floating pill (right) — simple Bro toggle
    const pill = document.createElement("div");
    pill.className = "bb-floating-pill";
    pill.dataset.state = isKnownBro ? "bro" : "clean";
    pill.setAttribute("role", "button");
    pill.setAttribute("tabindex", "0");
    pill.setAttribute(
      "aria-label",
      isKnownBro ? "Marked as bro \u2014 click to unmark" : "Mark as bro"
    );
    // "Bro" only when confirmed; ghost dot when untagged (action, not status)
    pill.textContent = isKnownBro ? "Bro" : "\u00b7";

    const tooltip = buildTooltip(data.score, data.userMeta);
    if (tooltip) pill.title = tooltip;

    const toggle = () => {
      if (!normalized) return;
      if (state.knownBros.has(normalized)) {
        doUnblacklist(data.handle);
      } else {
        doBlacklist(data.handle, data._article);
      }
    };
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggle();
    });
    pill.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    });

    tab.appendChild(pill);
    shadowRoot.appendChild(tab);
  }

  // ═══════════════════════════════════════
  // INLINE PILL (non-frosted tweets)
  // ═══════════════════════════════════════

  function renderPill(article, data) {
    // Remove existing pill
    article.querySelector(".bb-pill")?.remove();

    const handle = data.handle;
    const normalized = handle ? handle.toLowerCase() : null;
    const isKnownBro = normalized && state.knownBros.has(normalized);
    const isTrusted  = normalized && state.trustedUsers.has(normalized);

    // Store article ref for actions
    data._article = article;

    const pill = document.createElement("span");
    pill.className = "bb-pill";
    pill.setAttribute("role", "button");
    pill.setAttribute("tabindex", "0");
    pill.setAttribute(
      "aria-label",
      isKnownBro ? "Marked as bro \u2014 click to unmark" : "Mark as bro"
    );
    // "Bro" only when confirmed; ghost dot when untagged (action, not status)
    pill.textContent = isKnownBro ? "Bro" : "\u00b7";

    // Binary state → color
    pill.dataset.state = isKnownBro ? "bro" : isTrusted ? "trusted" : "clean";

    // Tooltip: score + follower counts
    const tooltip = buildTooltip(data.score, data.userMeta);
    if (tooltip) pill.title = tooltip;

    // One-click toggle (no action for trusted users)
    if (!isTrusted && normalized) {
      const toggle = () => {
        if (state.knownBros.has(normalized)) {
          doUnblacklist(handle);
        } else {
          doBlacklist(handle, article);
        }
      };
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      pill.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    }

    // Insert after timestamp anchor
    const anchor = BroBlockExtractor.findTimestampAnchor(article);
    if (anchor && anchor.parentElement) {
      const next = anchor.nextElementSibling;
      if (next) {
        anchor.parentElement.insertBefore(pill, next);
      } else {
        anchor.parentElement.appendChild(pill);
      }
    } else {
      // Timestamp not in DOM yet — unmark so next mutation retries,
      // but cap retries to avoid infinite loop on unusual layouts
      const retries = parseInt(article.getAttribute("data-bb-pill-retries") || "0", 10);
      if (retries < 3) {
        article.setAttribute("data-bb-pill-retries", String(retries + 1));
        article.removeAttribute("data-bb-scored");
      }
    }
  }

  // ═══════════════════════════════════════
  // UNDO TOAST
  // ═══════════════════════════════════════

  let toastEl = null;
  let toastTimer = null;

  function showUndoToast(message, onUndo) {
    dismissToast();

    toastEl = document.createElement("div");
    toastEl.className = "bb-undo-toast";

    const text = document.createElement("span");
    text.className = "bb-undo-toast-text";
    text.textContent = message;
    toastEl.appendChild(text);

    const btn = document.createElement("button");
    btn.className = "bb-undo-toast-btn";
    btn.textContent = "Undo";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissToast();
      if (onUndo) onUndo();
    });
    toastEl.appendChild(btn);

    document.body.appendChild(toastEl);

    toastTimer = setTimeout(dismissToast, 5000);
  }

  function dismissToast() {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (toastEl) {
      toastEl.remove();
      toastEl = null;
    }
  }

  // ═══════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════

  /** Remove frost overlay and render inline pill — click backdrop to peek. */
  function doUnfrost(data) {
    const article = data._article;
    if (!article) return;

    BroBlockCleanup.cleanArticle(article);
    article.setAttribute("data-bb-scored", "1");
    article.setAttribute("data-bb-peeked", "1");
    data.isFrosted = false;

    // Render inline pill so the bro toggle remains accessible
    renderPill(article, data);
  }

  function doBlacklist(handle, article) {
    const normalized = handle.toLowerCase();

    // Update in-memory state (including threshold so rescan uses fresh value)
    state.knownBros.add(normalized);
    state.trustedUsers.delete(normalized);
    state.threshold = Math.max(BB.LIMITS.THRESHOLD_MIN, state.threshold - BB.LIMITS.THRESHOLD_BRO_STEP);

    // Persist to storage (single atomic read+write for lists + threshold)
    chrome.storage.sync.get({ knownBros: [], trustedUsers: [], threshold: BB.LIMITS.THRESHOLD_DEFAULT }, (data) => {
      const trusted = data.trustedUsers.filter((h) => h.toLowerCase() !== normalized);
      let bros = data.knownBros.filter((h) => h.toLowerCase() !== normalized);
      bros.push(normalized);
      // Enforce list size limit — keep most recent entries
      if (bros.length > BB.LIMITS.MAX_LIST_SIZE) {
        bros = bros.slice(bros.length - BB.LIMITS.MAX_LIST_SIZE);
      }
      const t = Math.max(BB.LIMITS.THRESHOLD_MIN, data.threshold - BB.LIMITS.THRESHOLD_BRO_STEP);
      chrome.storage.sync.set({ knownBros: bros, trustedUsers: trusted, threshold: t });
    });

    // Rescan all visible articles — frosts every tweet by this handle
    BroBlockObserver.rescan(state);

    // Show undo toast
    showUndoToast("Tagged @" + handle + " as bro", () => {
      doUnblacklist(handle);
    });
  }

  function doUnblacklist(handle) {
    const normalized = handle.toLowerCase();

    // Update in-memory state
    state.knownBros.delete(normalized);

    // Persist to storage
    chrome.storage.sync.get({ knownBros: [] }, (data) => {
      const bros = data.knownBros.filter((h) => h.toLowerCase() !== normalized);
      chrome.storage.sync.set({ knownBros: bros });
    });

    // Rescan — removes frost, re-scores normally
    BroBlockObserver.rescan(state);
  }

  function doWhitelist(handle, s) {
    const normalized = handle.toLowerCase();

    // Update in-memory state (including threshold so rescan uses fresh value)
    s.trustedUsers.add(normalized);
    s.knownBros.delete(normalized);
    s.threshold = Math.min(BB.LIMITS.THRESHOLD_MAX, s.threshold + BB.LIMITS.THRESHOLD_TRUST_STEP);

    // Persist to storage (single atomic read+write for lists + threshold)
    chrome.storage.sync.get({ knownBros: [], trustedUsers: [], threshold: BB.LIMITS.THRESHOLD_DEFAULT }, (data) => {
      const bros = data.knownBros.filter((h) => h.toLowerCase() !== normalized);
      let trusted = data.trustedUsers.filter((h) => h.toLowerCase() !== normalized);
      trusted.push(normalized);
      // Enforce list size limit — keep most recent entries
      if (trusted.length > BB.LIMITS.MAX_LIST_SIZE) {
        trusted = trusted.slice(trusted.length - BB.LIMITS.MAX_LIST_SIZE);
      }
      const t = Math.min(BB.LIMITS.THRESHOLD_MAX, data.threshold + BB.LIMITS.THRESHOLD_TRUST_STEP);
      chrome.storage.sync.set({ knownBros: bros, trustedUsers: trusted, threshold: t });
    });

    // Rescan all visible articles — removes frost for this handle
    BroBlockObserver.rescan(s);

    // Show undo toast
    showUndoToast("Trusted @" + handle, () => {
      doUntrust(handle);
    });
  }

  function doUntrust(handle) {
    const normalized = handle.toLowerCase();

    // Update in-memory state
    state.trustedUsers.delete(normalized);

    // Persist to storage
    chrome.storage.sync.get({ trustedUsers: [] }, (data) => {
      const trusted = data.trustedUsers.filter((h) => h.toLowerCase() !== normalized);
      chrome.storage.sync.set({ trustedUsers: trusted });
    });

    // Rescan — re-scores normally
    BroBlockObserver.rescan(state);
  }

  function doToggleInterest(categoryId) {
    // Toggle in-memory
    if (state.interestedCategories.has(categoryId)) {
      state.interestedCategories.delete(categoryId);
    } else {
      state.interestedCategories.add(categoryId);
    }

    // Persist in-memory state directly (avoids read-then-toggle race)
    chrome.storage.sync.set({ interestedCategories: [...state.interestedCategories] });
  }

  /**
   * Lazily update frost tabs with user metadata that arrived after rendering.
   * Called when the MAIN-world interceptor sends new user data.
   */
  function updateFrostMeta(updatedHandles) {
    const frosted = document.querySelectorAll("article.bb-frosted");
    for (const article of frosted) {
      const pillHost = article.querySelector(".bb-pill-host");
      if (!pillHost || !pillHost.shadowRoot) continue;

      const handleEl = pillHost.shadowRoot.querySelector(".bb-frost-tab-handle");
      if (!handleEl) continue;

      // Extract handle from text (strip leading @)
      const handle = handleEl.textContent.replace(/^@/, "").toLowerCase();
      if (!updatedHandles.has(handle)) continue;

      const userMeta = state.userCache.get(handle);
      if (!userMeta) continue;

      const tab = pillHost.shadowRoot.querySelector(".bb-frost-tab");
      if (!tab) continue;

      // Upsert meta element
      let meta = tab.querySelector(".bb-frost-tab-meta");
      if (!meta) {
        meta = document.createElement("span");
        meta.className = "bb-frost-tab-meta";
        const floatingPill = tab.querySelector(".bb-floating-pill");
        if (floatingPill) {
          tab.insertBefore(meta, floatingPill);
        } else {
          tab.appendChild(meta);
        }
      }
      meta.textContent =
        formatCount(userMeta.following) + " following \u00b7 " +
        formatCount(userMeta.followers) + " followers";

      // Also update the floating pill tooltip with fresh follower data
      const floatingPill = tab.querySelector(".bb-floating-pill");
      if (floatingPill) {
        // Read score from existing title line if present
        const existing = floatingPill.title || "";
        const scoreMatch = existing.match(/^BroScore: \d+/);
        const score = scoreMatch ? parseInt(scoreMatch[0].split(": ")[1], 10) : 0;
        const tooltip = buildTooltip(score, userMeta);
        if (tooltip) floatingPill.title = tooltip;
      }
    }

    // Also update inline pills on non-frosted tweets
    const pills = document.querySelectorAll(".bb-pill");
    for (const pill of pills) {
      const article = pill.closest("article");
      if (!article) continue;

      // Find handle from pill's aria-label or surrounding context
      const timestampAnchor = BroBlockExtractor.findTimestampAnchor(article);
      if (!timestampAnchor) continue;
      const handle = BroBlockExtractor.extractHandle(article);
      if (!handle) continue;
      if (!updatedHandles.has(handle.toLowerCase())) continue;

      const userMeta = state.userCache.get(handle.toLowerCase());
      if (!userMeta) continue;

      // Rebuild tooltip with fresh data
      const scoreMatch = (pill.title || "").match(/^BroScore: (\d+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
      const tooltip = buildTooltip(score, userMeta);
      if (tooltip) pill.title = tooltip;
    }
  }

  return { init, renderFrost, renderPill, updateFrostMeta };
})();
