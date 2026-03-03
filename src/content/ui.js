/**
 * BroBlock V2 — UI Module
 * All DOM injection: frost layers, inline pills, popup menu, actions.
 * Depends on: BB, BroBlockExtractor, BroBlockCleanup, BroBlockObserver
 */

/* eslint-disable no-unused-vars */
const BroBlockUI = (() => {
  let state = null;
  let shadowCSS = "";
  let _instantMode = false;
  const _pillData = new WeakMap();
  let _menuHost = null;
  let _menuRoot = null;
  let _menuHideTimer = null;
  let _menuActivePill = null;

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
    if (data.state === "knownBro") {
      article.classList.add("bb-collapsed");
    }

    data.isFrosted = true;
    data._article = article;

    // Layer 1: Blur backdrop (must be in Twitter's DOM for backdrop-filter)
    const backdrop = document.createElement("div");
    backdrop.className = "bb-frost-backdrop";
    if (_instantMode) backdrop.style.setProperty("animation", "none", "important");
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
    if (data.state === "knownBro") tab.dataset.collapsed = "true";

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

    // Floating pill (right) — two-segment toggle
    const pill = document.createElement("div");
    pill.className = "bb-floating-pill";
    pill.dataset.state = isKnownBro ? "bro" : "clean";
    pill.setAttribute("role", "group");
    pill.setAttribute("aria-label", "Bro toggle");

    const tooltip = buildTooltip(data.score, data.userMeta);
    if (tooltip) pill.title = tooltip;

    // Left segment: green / OK
    const segOk = document.createElement("span");
    segOk.className = "bb-fp-seg bb-fp-seg-ok";
    segOk.textContent = "\u2713";
    segOk.setAttribute("role", "button");
    segOk.setAttribute("tabindex", "0");
    segOk.setAttribute("aria-pressed", String(!isKnownBro));
    segOk.setAttribute("aria-label", isKnownBro ? "Unmark as bro" : "Not a bro");

    // Right segment: Bro
    const segBro = document.createElement("span");
    segBro.className = "bb-fp-seg bb-fp-seg-bro";
    segBro.textContent = "Bro";
    segBro.setAttribute("role", "button");
    segBro.setAttribute("tabindex", "0");
    segBro.setAttribute("aria-pressed", String(isKnownBro));
    segBro.setAttribute("aria-label", isKnownBro ? "Marked as bro" : "Mark as bro");

    pill.appendChild(segOk);
    pill.appendChild(segBro);

    // Click handlers
    const onOkClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!normalized) return;
      if (state.knownBros.has(normalized)) doUnblacklist(data.handle);
    };
    segOk.addEventListener("click", onOkClick);
    segOk.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOkClick(e); }
    });

    const onBroClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!normalized) return;
      if (!state.knownBros.has(normalized)) doBlacklist(data.handle, data._article);
    };
    segBro.addEventListener("click", onBroClick);
    segBro.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onBroClick(e); }
    });

    // Store data + attach hover menu
    _pillData.set(pill, data);
    attachMenuHover(pill);

    tab.appendChild(pill);
    shadowRoot.appendChild(tab);
  }

  // ═══════════════════════════════════════
  // SHARED PILL BUILDER
  // ═══════════════════════════════════════

  /**
   * Build a pill element with segments and click handlers.
   * Used by both renderPill() (inline, on tweets) and renderProfilePill() (profile header).
   */
  function buildPillElement(data, articleOrNull) {
    const handle = data.handle;
    const normalized = handle ? handle.toLowerCase() : null;
    const isKnownBro = normalized && state.knownBros.has(normalized);
    const isTrusted  = normalized && state.trustedUsers.has(normalized);

    const pill = document.createElement("span");
    pill.className = "bb-pill";
    pill.setAttribute("role", "group");
    pill.setAttribute("aria-label", "Bro toggle");
    pill.dataset.state = isKnownBro ? "bro" : isTrusted ? "trusted" : "clean";

    const tooltip = buildTooltip(data.score, data.userMeta);
    if (tooltip) pill.title = tooltip;

    // Left segment: green / OK
    const segOk = document.createElement("span");
    segOk.className = "bb-pill-seg bb-pill-seg-ok";
    segOk.textContent = "\u2713";
    segOk.setAttribute("role", "button");
    segOk.setAttribute("tabindex", "0");
    segOk.setAttribute("aria-pressed", String(!isKnownBro));
    segOk.setAttribute("aria-label", isKnownBro ? "Unmark as bro" : "Not a bro");

    // Right segment: Bro
    const segBro = document.createElement("span");
    segBro.className = "bb-pill-seg bb-pill-seg-bro";
    segBro.textContent = "Bro";
    segBro.setAttribute("role", "button");
    segBro.setAttribute("tabindex", isTrusted ? "-1" : "0");
    segBro.setAttribute("aria-pressed", String(isKnownBro));
    segBro.setAttribute("aria-label", isKnownBro ? "Marked as bro" : "Mark as bro");

    pill.appendChild(segOk);
    pill.appendChild(segBro);

    // Click handlers (no action for trusted users)
    if (!isTrusted && normalized) {
      const onOkClick = (e) => {
        e.stopPropagation();
        if (state.knownBros.has(normalized)) doUnblacklist(handle);
      };
      segOk.addEventListener("click", onOkClick);
      segOk.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOkClick(e); }
      });

      const onBroClick = (e) => {
        e.stopPropagation();
        if (!state.knownBros.has(normalized)) doBlacklist(handle, articleOrNull);
      };
      segBro.addEventListener("click", onBroClick);
      segBro.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onBroClick(e); }
      });
    }

    // Store data + attach hover menu
    _pillData.set(pill, data);
    attachMenuHover(pill);

    return pill;
  }

  // ═══════════════════════════════════════
  // INLINE PILL (non-frosted tweets)
  // ═══════════════════════════════════════

  function renderPill(article, data) {
    // Remove existing pill
    article.querySelector(".bb-pill")?.remove();

    // Store article ref for actions
    data._article = article;

    const pill = buildPillElement(data, article);

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
  // PROFILE PILL (account holder page)
  // ═══════════════════════════════════════

  function renderProfilePill(userNameEl, data) {
    userNameEl.querySelector(".bb-pill")?.remove();

    data._article = null; // No article context for profile pills

    const pill = buildPillElement(data, null);

    // Find the @handle row — insert pill next to it so it reads "@handle [✓|Bro]"
    // Strategy 1: link whose text starts with @
    let handleContainer = null;
    const handleLinks = userNameEl.querySelectorAll('a[href^="/"]');
    for (const link of handleLinks) {
      if (link.textContent.trim().startsWith("@")) {
        handleContainer = link.parentElement;
        break;
      }
    }
    // Strategy 2: leaf span containing @ text
    if (!handleContainer) {
      const spans = userNameEl.querySelectorAll("span");
      for (const span of spans) {
        if (span.textContent.trim().startsWith("@") && span.children.length === 0) {
          handleContainer = span.parentElement;
          break;
        }
      }
    }

    if (handleContainer) {
      handleContainer.appendChild(pill);
    } else {
      userNameEl.appendChild(pill); // fallback
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

    // Rescan all visible articles — frosts every tweet by this handle (instant, no animation)
    _instantMode = true;
    BroBlockObserver.rescan(state);
    _instantMode = false;

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

    // Rescan — removes frost, re-scores normally (instant, no animation)
    _instantMode = true;
    BroBlockObserver.rescan(state);
    _instantMode = false;
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

    // Rescan all visible articles — removes frost for this handle (instant)
    _instantMode = true;
    BroBlockObserver.rescan(s);
    _instantMode = false;

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

    // Rescan — re-scores normally (instant)
    _instantMode = true;
    BroBlockObserver.rescan(state);
    _instantMode = false;
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

  // ═══════════════════════════════════════
  // HOVER MENU
  // ═══════════════════════════════════════

  function getSeverity(score) {
    if (score <= 15) return "none";
    if (score <= 40) return "low";
    if (score <= 70) return "moderate";
    if (score <= 100) return "high";
    return "extreme";
  }

  function ensureMenuHost() {
    if (_menuHost && _menuHost.isConnected) return;
    _menuHost = document.createElement("div");
    _menuHost.id = "bb-menu-host";
    _menuHost.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;z-index:99999;pointer-events:none;";
    document.body.appendChild(_menuHost);
    _menuRoot = _menuHost.attachShadow({ mode: "open" });
    injectShadowStyles(_menuRoot);
  }

  function buildMenu(data) {
    const frag = document.createDocumentFragment();

    // Backdrop — click to dismiss
    const backdrop = document.createElement("div");
    backdrop.className = "bb-menu-backdrop";
    backdrop.addEventListener("click", (e) => { e.stopPropagation(); dismissMenu(); });
    frag.appendChild(backdrop);

    const menu = document.createElement("div");
    menu.className = "bb-menu";
    menu.style.pointerEvents = "auto";

    // Keep menu open while hovering it
    menu.addEventListener("mouseenter", () => { cancelMenuHide(); });
    menu.addEventListener("mouseleave", () => { scheduleMenuHide(); });

    // ── Header ──
    const header = document.createElement("div");
    header.className = "bb-menu-header";

    const handleEl = document.createElement("div");
    handleEl.className = "bb-menu-handle";
    handleEl.textContent = data.handle ? "@" + data.handle : "Unknown";
    header.appendChild(handleEl);

    if (typeof data.score === "number" && data.score > 0) {
      const scoreEl = document.createElement("div");
      scoreEl.className = "bb-menu-score";
      scoreEl.dataset.severity = getSeverity(data.score);
      scoreEl.textContent = String(data.score);
      header.appendChild(scoreEl);
    }

    menu.appendChild(header);

    // ── Topics ──
    if (data.breakdown && data.breakdown.length > 0) {
      const activeTopics = data.breakdown.filter((b) => b.points > 0 || b.interested);
      if (activeTopics.length > 0) {
        const topics = document.createElement("div");
        topics.className = "bb-menu-topics";

        const label = document.createElement("div");
        label.className = "bb-menu-topics-label";
        label.textContent = "Topics";
        topics.appendChild(label);

        for (const b of activeTopics) {
          const row = document.createElement("div");
          row.className = "bb-menu-topic-row";

          const info = document.createElement("div");
          info.className = "bb-menu-topic-info";

          const name = document.createElement("span");
          name.className = "bb-menu-topic-name";
          if (b.interested) name.classList.add("bb-interested");
          name.textContent = b.category;
          info.appendChild(name);

          if (b.reasons && b.reasons.length > 0) {
            const reason = document.createElement("span");
            reason.className = "bb-menu-topic-reason";
            reason.textContent = b.reasons[0];
            info.appendChild(reason);
          }

          row.appendChild(info);

          // Heart toggle
          const heart = document.createElement("button");
          heart.className = "bb-menu-topic-heart";
          if (b.interested || state.interestedCategories.has(b.id)) {
            heart.classList.add("bb-interested");
          }
          heart.textContent = "\u2661";
          heart.setAttribute("aria-label", "Toggle interest in " + b.category);
          heart.addEventListener("click", (e) => {
            e.stopPropagation();
            doToggleInterest(b.id);
            heart.classList.toggle("bb-interested");
            name.classList.toggle("bb-interested");
          });
          row.appendChild(heart);

          topics.appendChild(row);
        }

        menu.appendChild(topics);
      }
    }

    // ── Divider ──
    const divider = document.createElement("div");
    divider.className = "bb-menu-divider";
    menu.appendChild(divider);

    // ── Action items ──
    const normalized = data.handle ? data.handle.toLowerCase() : null;
    const isKnownBro = normalized && state.knownBros.has(normalized);
    const isTrusted = normalized && state.trustedUsers.has(normalized);

    if (normalized && !isTrusted) {
      const broBtn = document.createElement("button");
      broBtn.className = "bb-menu-item bb-menu-item-bro";
      const broLabel = document.createElement("span");
      broLabel.className = "bb-menu-item-label";
      broLabel.textContent = isKnownBro ? "Unmark as Bro" : "Mark as Bro";
      broBtn.appendChild(broLabel);
      const broDesc = document.createElement("span");
      broDesc.className = "bb-menu-item-desc";
      broDesc.textContent = isKnownBro ? "Remove from blocklist" : "Always frost this user\u2019s tweets";
      broBtn.appendChild(broDesc);
      broBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dismissMenu();
        if (isKnownBro) {
          doUnblacklist(data.handle);
        } else {
          doBlacklist(data.handle, data._article);
        }
      });
      menu.appendChild(broBtn);
    }

    if (normalized && !isKnownBro) {
      const trustBtn = document.createElement("button");
      trustBtn.className = "bb-menu-item bb-menu-item-trust";
      const trustLabel = document.createElement("span");
      trustLabel.className = "bb-menu-item-label";
      trustLabel.textContent = isTrusted ? "Untrust @" + data.handle : "Trust @" + data.handle;
      trustBtn.appendChild(trustLabel);
      const trustDesc = document.createElement("span");
      trustDesc.className = "bb-menu-item-desc";
      trustDesc.textContent = isTrusted ? "Resume scoring this user" : "Never hide tweets from this user";
      trustBtn.appendChild(trustDesc);
      trustBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dismissMenu();
        if (isTrusted) {
          doUntrust(data.handle);
        } else {
          doWhitelist(data.handle, state);
        }
      });
      menu.appendChild(trustBtn);
    }

    frag.appendChild(menu);
    return { frag, menu };
  }

  function showMenu(pill) {
    const data = _pillData.get(pill);
    if (!data) return;

    // Don't re-open for same pill
    if (_menuActivePill === pill && _menuRoot && _menuRoot.querySelector(".bb-menu")) {
      cancelMenuHide();
      return;
    }

    dismissMenu();
    ensureMenuHost();

    const { frag, menu } = buildMenu(data);

    // Position near pill
    const rect = pill.getBoundingClientRect();
    const menuW = 260; // approximate width (min 220, max 300)
    let left = Math.max(8, Math.min(rect.left, window.innerWidth - menuW - 8));
    let top = rect.bottom + 6;

    // If below viewport, flip above pill
    if (top + 300 > window.innerHeight) {
      top = Math.max(8, rect.top - 300 - 6);
    }

    menu.style.top = top + "px";
    menu.style.left = left + "px";

    _menuRoot.appendChild(frag);
    _menuActivePill = pill;
  }

  function dismissMenu() {
    cancelMenuHide();
    if (_menuRoot) {
      while (_menuRoot.firstChild) {
        // Keep the <style> element
        if (_menuRoot.firstChild.tagName === "STYLE") {
          if (_menuRoot.firstChild.nextSibling) {
            _menuRoot.removeChild(_menuRoot.firstChild.nextSibling);
          } else {
            break;
          }
        } else {
          _menuRoot.removeChild(_menuRoot.firstChild);
        }
      }
    }
    _menuActivePill = null;
  }

  function scheduleMenuHide() {
    cancelMenuHide();
    _menuHideTimer = setTimeout(dismissMenu, 200);
  }

  function cancelMenuHide() {
    if (_menuHideTimer) {
      clearTimeout(_menuHideTimer);
      _menuHideTimer = null;
    }
  }

  function attachMenuHover(pill) {
    pill.addEventListener("mouseenter", () => {
      cancelMenuHide();
      showMenu(pill);
    });
    pill.addEventListener("mouseleave", () => {
      scheduleMenuHide();
    });
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

  return { init, renderFrost, renderPill, renderProfilePill, updateFrostMeta, dismissMenu };
})();
