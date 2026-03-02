/**
 * BroBlock V2 — DOM Extractor
 * Multi-strategy extraction for tweet text, handle, signals, and timestamp anchor.
 * Each function uses 3 strategies with graceful fallback.
 */

/* eslint-disable no-unused-vars */
const BroBlockExtractor = (() => {

  /**
   * Extract tweet text using multiple strategies.
   * Returns empty string if no text found (article will be retried on next mutation).
   */
  function extractText(article) {
    // Strategy 1: Twitter's data-testid (fast, current as of 2025)
    const byTestId = article.querySelector('[data-testid="tweetText"]');
    if (byTestId) {
      const text = (byTestId.innerText || byTestId.textContent || "").trim();
      if (text) return text;
    }

    // Strategy 2: div with lang attribute (Twitter sets lang on tweet text containers)
    const byLang = article.querySelector("div[lang]");
    if (byLang && byLang.closest("article") === article) {
      const text = (byLang.innerText || byLang.textContent || "").trim();
      if (text.length > 10) return text;
    }

    // Strategy 3: Largest text block in dir="auto" divs (structural heuristic)
    const candidates = article.querySelectorAll('div[dir="auto"]');
    let best = "";
    for (const el of candidates) {
      const text = (el.innerText || "").trim();
      if (text.length > best.length && text.length > 20) {
        // Skip if inside the username area
        if (!el.closest('[data-testid="User-Name"]')) {
          best = text;
        }
      }
    }
    return best;
  }

  /**
   * Extract @handle from article.
   * Returns handle string (without @) or null.
   */
  function extractHandle(article) {
    // Strategy 1: Profile links matching /<handle> pattern
    const links = article.querySelectorAll('a[role="link"][href^="/"]');
    for (const link of links) {
      const href = link.getAttribute("href");
      if (!href) continue;
      const match = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
      if (match) return match[1];
    }

    // Strategy 2: Any link with short path
    const allLinks = article.querySelectorAll('a[href^="/"]');
    for (const link of allLinks) {
      const href = link.getAttribute("href");
      if (!href) continue;
      const match = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
      if (match) return match[1];
    }

    // Strategy 3: @username text in the header area
    const header = article.querySelector('[data-testid="User-Name"]') ||
      article.querySelector("div:first-child");
    if (header) {
      const text = header.textContent || "";
      const atMatch = text.match(/@([A-Za-z0-9_]{1,15})/);
      if (atMatch) return atMatch[1];
    }

    return null;
  }

  /**
   * Extract profile signals (blue check, display name).
   */
  function extractSignals(article) {
    const signals = { hasBlueCheck: false, displayName: "" };

    // Blue check: various selectors Twitter has used
    const verified = article.querySelector(
      '[data-testid="icon-verified"], ' +
      'svg[aria-label*="Verified"], ' +
      'svg[aria-label*="verified"], ' +
      '[data-testid="icon-verified-stroke"]'
    );
    if (verified) signals.hasBlueCheck = true;

    // Display name: first visible text in User-Name area
    const userNameArea = article.querySelector('[data-testid="User-Name"]');
    if (userNameArea) {
      const nameSpan = userNameArea.querySelector("a span");
      if (nameSpan) {
        signals.displayName = (nameSpan.textContent || "").trim();
      }
    }

    return signals;
  }

  /**
   * Find the timestamp anchor element for inline pill injection.
   * On feed tweets, the timestamp link is in the User-Name row.
   * On detail pages (tweet's own page), the timestamp is in a lower
   * metadata section — so we fall back to the User-Name container.
   * Returns the element or null.
   */
  function findTimestampAnchor(article) {
    const userNameArea = article.querySelector('[data-testid="User-Name"]');

    // Strategy 1: data-testid
    const byTestId = article.querySelector('[data-testid="tweet-timestamp"]');
    if (byTestId) {
      // Check if timestamp is in the User-Name row (feed layout)
      if (userNameArea && userNameArea.contains(byTestId)) return byTestId;
      // Detail page: timestamp is below, use User-Name fallback
      if (userNameArea) return userNameArea;
      return byTestId;
    }

    // Strategy 2: <a> containing <time>
    const links = article.querySelectorAll('a[role="link"]');
    for (const a of links) {
      if (a.querySelector("time")) {
        if (userNameArea && userNameArea.contains(a)) return a;
        if (userNameArea) return userNameArea;
        return a;
      }
    }

    // Strategy 3: <time> element, walk up to nearest <a>
    const timeEl = article.querySelector("time");
    if (timeEl) {
      const parentA = timeEl.closest("a");
      if (parentA) {
        if (userNameArea && userNameArea.contains(parentA)) return parentA;
        if (userNameArea) return userNameArea;
        return parentA;
      }
    }

    // Strategy 4: User-Name area directly
    if (userNameArea) return userNameArea;

    return null;
  }

  /**
   * Check if an article is a reply (not an original tweet).
   * Twitter shows "Replying to @handle" above reply content.
   */
  function isReply(article) {
    // Strategy 1: Twitter's socialContext data-testid
    const socialContext = article.querySelector('[data-testid="socialContext"]');
    if (socialContext && /replying\s+to/i.test(socialContext.textContent || "")) {
      return true;
    }

    // Strategy 2: "Replying to" text near the user name area
    const userNameArea = article.querySelector('[data-testid="User-Name"]');
    if (userNameArea && userNameArea.parentElement) {
      const siblings = userNameArea.parentElement.children;
      for (const el of siblings) {
        if (el === userNameArea) continue;
        if (/replying\s+to\s+@/i.test(el.textContent || "")) return true;
      }
    }

    return false;
  }

  return { extractText, extractHandle, extractSignals, findTimestampAnchor, isReply };
})();
