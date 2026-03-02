/**
 * BroBlock V2 — UI Module
 * All DOM injection: frost layers, inline pills, popup menu, actions.
 * Depends on: BB, BroBlockExtractor, BroBlockCleanup, BroBlockObserver
 */

/* eslint-disable no-unused-vars */
const BroBlockUI = (() => {
  let state = null;
  let shadowCSS = "";
  let menuHost = null;
  let menuRoot = null;

  function init(s) {
    state = s;
    shadowCSS = s.shadowCSS || "";
  }

  function hasInterestDiscount(data) {
    return data.breakdown && data.breakdown.some((b) => b.interested);
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
    backdrop.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    article.appendChild(backdrop);

    // Layer 2: Floating pill (Shadow DOM) — clickable, opens menu
    const pillHost = document.createElement("div");
    pillHost.className = "bb-pill-host";
    article.appendChild(pillHost);
    const pillRoot = pillHost.attachShadow({ mode: "open" });
    injectShadowStyles(pillRoot);
    buildFloatingPill(pillRoot, data, s);
  }

  function buildFloatingPill(shadowRoot, data, s) {
    // Folder-tab bar: handle on left, score pill on right
    const tab = document.createElement("div");
    tab.className = "bb-frost-tab";
    const severity = BB.getSeverity(data.score, data.state, state.threshold);
    tab.dataset.severity = severity;

    // Handle text (left side)
    const handleEl = document.createElement("span");
    handleEl.className = "bb-frost-tab-handle";
    handleEl.textContent = data.handle ? "@" + data.handle : "Unknown";
    tab.appendChild(handleEl);

    // Follower/following counts (from API interceptor cache)
    if (data.userMeta) {
      const meta = document.createElement("span");
      meta.className = "bb-frost-tab-meta";
      meta.textContent =
        formatCount(data.userMeta.following) + " following \u00b7 " +
        formatCount(data.userMeta.followers) + " followers";
      tab.appendChild(meta);
    }

    // Score pill (right side)
    const pill = document.createElement("div");
    pill.className = "bb-floating-pill";
    pill.dataset.severity = severity;
    pill.setAttribute("role", "button");
    pill.setAttribute("tabindex", "0");
    pill.setAttribute("aria-haspopup", "menu");
    pill.setAttribute("aria-label", "Bro Score " + data.score + ", click for details");

    const label = document.createElement("span");
    label.className = "bb-floating-pill-label";

    const score = document.createElement("span");
    score.className = "bb-floating-pill-score";

    if (data.state === "knownBro") {
      label.textContent = "Known";
      score.textContent = "Bro";
    } else {
      label.textContent = "Bro Score:";
      score.textContent = data.score + (hasInterestDiscount(data) ? " \u2665" : "");
    }

    pill.appendChild(label);
    pill.appendChild(score);
    tab.appendChild(pill);

    // Click handler — unfrost tweet + open menu
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      doUnfrostAndMenu(data);
    });

    // Keyboard: Enter/Space
    pill.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        doUnfrostAndMenu(data);
      }
    });

    shadowRoot.appendChild(tab);
  }

  // ═══════════════════════════════════════
  // INLINE PILL (non-frosted tweets)
  // ═══════════════════════════════════════

  function renderPill(article, data) {
    const severity = BB.getSeverity(data.score, data.state, state.threshold);

    // Store article ref for actions
    data._article = article;

    const pill = document.createElement("span");
    pill.className = "bb-pill";
    pill.dataset.severity = severity;
    pill.dataset.score = data.score;
    pill.setAttribute("role", "button");
    pill.setAttribute("aria-haspopup", "menu");
    pill.setAttribute("aria-expanded", "false");
    pill.setAttribute("tabindex", "0");

    // Label span
    const label = document.createElement("span");
    label.className = "bb-pill-label";
    if (data.state === "trusted") {
      label.textContent = "\u2665 Trusted";
    } else {
      label.textContent = "Bro Score: " + data.score + (hasInterestDiscount(data) ? " \u2665" : "");
    }
    pill.appendChild(label);

    // Toggle switch for quick blacklist/unblacklist (hidden for trusted/no handle)
    if (data.state !== "trusted" && data.handle) {
      const isBlacklisted = data.state === "knownBro";
      const toggle = document.createElement("span");
      toggle.className = "bb-pill-toggle";
      toggle.setAttribute("role", "switch");
      toggle.setAttribute("aria-checked", isBlacklisted ? "true" : "false");
      toggle.setAttribute("aria-label", (isBlacklisted ? "Unblock @" : "Block @") + data.handle);
      toggle.setAttribute("tabindex", "0");

      const knob = document.createElement("span");
      knob.className = "bb-pill-toggle-knob";
      toggle.appendChild(knob);

      const action = isBlacklisted
        ? () => doUnblacklist(data.handle)
        : () => doBlacklist(data.handle, data._article);

      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        action();
      });
      toggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          action();
        }
      });
      pill.appendChild(toggle);
    }

    pill.setAttribute("aria-label", "Bro Score " + data.score + ", click for details");

    // Click → open menu (blacklist/trust/topics all live in menu)
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleMenu(pill, data);
    });

    // Keyboard: Enter/Space opens menu
    pill.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(pill, data);
      }
    });

    // Inject after timestamp
    const anchor = BroBlockExtractor.findTimestampAnchor(article);
    if (anchor && anchor.parentElement) {
      const next = anchor.nextElementSibling;
      if (next) {
        anchor.parentElement.insertBefore(pill, next);
      } else {
        anchor.parentElement.appendChild(pill);
      }
    } else {
      // Timestamp not in DOM yet — unmark so next mutation retries
      article.removeAttribute("data-bb-scored");
    }
  }

  // ═══════════════════════════════════════
  // POPUP MENU (singleton, fixed position)
  // ═══════════════════════════════════════

  function toggleMenu(pill, data) {
    // Close existing menu
    dismissMenu();

    // Mark pill as expanded for accessibility
    pill.setAttribute("aria-expanded", "true");

    // Create singleton menu host
    menuHost = document.createElement("div");
    menuHost.id = "bb-menu-host";
    document.body.appendChild(menuHost);
    menuRoot = menuHost.attachShadow({ mode: "open" });
    injectShadowStyles(menuRoot);

    // Backdrop (closes menu on click)
    const backdrop = document.createElement("div");
    backdrop.className = "bb-menu-backdrop";
    backdrop.addEventListener("click", dismissMenu);
    menuRoot.appendChild(backdrop);

    // Menu element
    const menu = document.createElement("div");
    menu.className = "bb-menu";
    menu.setAttribute("role", "menu");

    // Position relative to pill
    const rect = pill.getBoundingClientRect();
    menu.style.top = (rect.bottom + 4) + "px";
    menu.style.left = rect.left + "px";

    // Reposition if off-screen
    requestAnimationFrame(() => {
      const menuRect = menu.getBoundingClientRect();
      if (menuRect.right > window.innerWidth - 8) {
        menu.style.left = (window.innerWidth - menuRect.width - 8) + "px";
      }
      if (menuRect.bottom > window.innerHeight - 8) {
        menu.style.top = (rect.top - menuRect.height - 4) + "px";
      }
    });

    // Header
    const header = document.createElement("div");
    header.className = "bb-menu-header";

    if (data.handle) {
      const handle = document.createElement("div");
      handle.className = "bb-menu-handle";
      handle.textContent = "@" + data.handle;
      header.appendChild(handle);
    }

    const scoreDiv = document.createElement("div");
    scoreDiv.className = "bb-menu-score";
    scoreDiv.dataset.severity = BB.getSeverity(data.score, data.state, state.threshold);
    if (data.state === "trusted") {
      scoreDiv.textContent = "\u2665 Trusted";
    } else if (data.state === "knownBro") {
      scoreDiv.textContent = "Known Bro";
    } else {
      scoreDiv.textContent = "Bro Score " + data.score + (hasInterestDiscount(data) ? " \u2665" : "");
    }
    header.appendChild(scoreDiv);

    // Topics detected with interest hearts
    const topics = data.breakdown;
    if (topics && topics.length > 0 && data.state !== "trusted") {
      const topicSection = document.createElement("div");
      topicSection.className = "bb-menu-topics";

      const topicLabel = document.createElement("div");
      topicLabel.className = "bb-menu-topics-label";
      topicLabel.textContent = "Topics detected";
      topicSection.appendChild(topicLabel);

      for (const entry of topics.slice(0, 4)) {
        const isInterested = state.interestedCategories.has(entry.id);

        const row = document.createElement("div");
        row.className = "bb-menu-topic-row";

        const info = document.createElement("div");
        info.className = "bb-menu-topic-info";

        const name = document.createElement("span");
        name.className = "bb-menu-topic-name";
        name.textContent = entry.category;
        if (isInterested) name.classList.add("bb-interested");
        info.appendChild(name);

        if (entry.reasons[0]) {
          const reason = document.createElement("span");
          reason.className = "bb-menu-topic-reason";
          reason.textContent = entry.reasons[0];
          info.appendChild(reason);
        }

        row.appendChild(info);

        // Heart toggle — interested = cleared (0 points)
        const heart = document.createElement("button");
        heart.className = "bb-menu-topic-heart" + (isInterested ? " bb-interested" : "");
        heart.textContent = isInterested ? "\u2665" : "\u2661";
        heart.setAttribute("aria-label", (isInterested ? "Remove interest in " : "Interested in ") + entry.category);
        heart.addEventListener("click", (e) => {
          e.stopPropagation();
          dismissMenu();
          doToggleInterest(entry.id);
        });
        row.appendChild(heart);

        topicSection.appendChild(row);
      }

      header.appendChild(topicSection);
    }

    menu.appendChild(header);

    // Menu actions
    if (data.handle) {
      const divider = document.createElement("div");
      divider.className = "bb-menu-divider";
      menu.appendChild(divider);

      // "Definitely Bro" — blacklist (not shown if already known bro or trusted)
      if (data.state !== "knownBro" && data.state !== "trusted") {
        const broItem = document.createElement("button");
        broItem.className = "bb-menu-item bb-menu-item-bro";
        broItem.setAttribute("role", "menuitem");
        const broLabel = document.createElement("span");
        broLabel.className = "bb-menu-item-label";
        broLabel.textContent = "Definitely Bro";
        const broDesc = document.createElement("span");
        broDesc.className = "bb-menu-item-desc";
        broDesc.textContent = "Always frost @" + data.handle;
        broItem.appendChild(broLabel);
        broItem.appendChild(broDesc);
        broItem.addEventListener("click", () => {
          dismissMenu();
          doBlacklist(data.handle, data._article);
        });
        menu.appendChild(broItem);
      }

      // "Trust" — whitelist (not shown if already trusted)
      if (data.state !== "trusted") {
        const trustItem = document.createElement("button");
        trustItem.className = "bb-menu-item bb-menu-item-trust";
        trustItem.setAttribute("role", "menuitem");
        const trustLabel = document.createElement("span");
        trustLabel.className = "bb-menu-item-label";
        trustLabel.textContent = "Trust @" + data.handle;
        const trustDesc = document.createElement("span");
        trustDesc.className = "bb-menu-item-desc";
        trustDesc.textContent = "Never flag this person again";
        trustItem.appendChild(trustLabel);
        trustItem.appendChild(trustDesc);
        trustItem.addEventListener("click", () => {
          dismissMenu();
          doWhitelist(data.handle, state);
        });
        menu.appendChild(trustItem);
      }
    }

    menuRoot.appendChild(menu);

    // Keyboard navigation
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        dismissMenu();
        pill.focus();
      } else if (e.key === "Tab") {
        const focusable = menu.querySelectorAll("button");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = menuRoot ? menuRoot.activeElement : document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    menu.addEventListener("keydown", handleKeydown);

    // Focus first item
    const firstItem = menu.querySelector("button.bb-menu-item");
    if (firstItem) firstItem.focus();
  }

  function dismissMenu() {
    if (menuHost) {
      // Reset aria on inline pills
      const pills = document.querySelectorAll('.bb-pill[aria-expanded="true"]');
      for (const p of pills) p.setAttribute("aria-expanded", "false");

      menuHost.remove();
      menuHost = null;
      menuRoot = null;
    }
  }

  // Close menu on Escape at document level
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuHost) dismissMenu();
  });

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

  function doUnfrostAndMenu(data) {
    const article = data._article;
    if (!article) return;

    // Remove frost (backdrop + pill host)
    BroBlockCleanup.cleanArticle(article);
    article.setAttribute("data-bb-scored", "1");
    article.setAttribute("data-bb-peeked", "1");
    data.isFrosted = false;

    // Re-render as inline pill
    renderPill(article, data);

    // Open menu on the new inline pill
    const inlinePill = article.querySelector(".bb-pill");
    if (inlinePill) {
      requestAnimationFrame(() => toggleMenu(inlinePill, data));
    }
  }

  function doBlacklist(handle, article) {
    const normalized = handle.toLowerCase();

    // Update in-memory state
    state.knownBros.add(normalized);
    state.trustedUsers.delete(normalized);

    // Persist to storage (single atomic read+write for lists + threshold)
    chrome.storage.sync.get({ knownBros: [], trustedUsers: [], threshold: BB.LIMITS.THRESHOLD_DEFAULT }, (data) => {
      const trusted = data.trustedUsers.filter((h) => h.toLowerCase() !== normalized);
      const bros = data.knownBros.filter((h) => h.toLowerCase() !== normalized);
      bros.push(normalized);
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

    // Update in-memory state
    s.trustedUsers.add(normalized);
    s.knownBros.delete(normalized);

    // Persist to storage (single atomic read+write for lists + threshold)
    chrome.storage.sync.get({ knownBros: [], trustedUsers: [], threshold: BB.LIMITS.THRESHOLD_DEFAULT }, (data) => {
      const bros = data.knownBros.filter((h) => h.toLowerCase() !== normalized);
      const trusted = data.trustedUsers.filter((h) => h.toLowerCase() !== normalized);
      trusted.push(normalized);
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

    // Persist
    chrome.storage.sync.get({ interestedCategories: [] }, (data) => {
      const list = data.interestedCategories || [];
      const idx = list.indexOf(categoryId);
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        list.push(categoryId);
      }
      chrome.storage.sync.set({ interestedCategories: list });
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

      // Already has meta? Skip.
      if (pillHost.shadowRoot.querySelector(".bb-frost-tab-meta")) continue;

      const handleEl = pillHost.shadowRoot.querySelector(".bb-frost-tab-handle");
      if (!handleEl) continue;

      // Extract handle from text (strip leading @)
      const handle = handleEl.textContent.replace(/^@/, "").toLowerCase();
      if (!updatedHandles.has(handle)) continue;

      const userMeta = state.userCache.get(handle);
      if (!userMeta) continue;

      const tab = pillHost.shadowRoot.querySelector(".bb-frost-tab");
      if (!tab) continue;

      const meta = document.createElement("span");
      meta.className = "bb-frost-tab-meta";
      meta.textContent =
        formatCount(userMeta.following) + " following \u00b7 " +
        formatCount(userMeta.followers) + " followers";

      // Insert after the handle, before the pill
      const pill = tab.querySelector(".bb-floating-pill");
      if (pill) {
        tab.insertBefore(meta, pill);
      } else {
        tab.appendChild(meta);
      }
    }
  }

  return { init, renderFrost, renderPill, updateFrostMeta };
})();
