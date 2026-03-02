/**
 * BroBlock V2 — Cleanup Module
 * Removes all BroBlock-injected DOM from articles.
 * Loaded before other content modules.
 */

/* eslint-disable no-unused-vars */
const BroBlockCleanup = (() => {
  const SELECTORS = [
    ".bb-frost-backdrop",
    ".bb-pill-host",
    ".bb-pill",
  ];

  function cleanArticle(article) {
    for (const sel of SELECTORS) {
      for (const el of article.querySelectorAll(sel)) el.remove();
    }
    article.classList.remove("bb-frosted");
    article.removeAttribute("data-bb-scored");
    article.removeAttribute("data-bb-peeked");
    article.removeAttribute("data-bb-pill-retries");
    article.style.removeProperty("pointer-events");
    article.style.removeProperty("user-select");
  }

  function cleanAll() {
    const articles = document.querySelectorAll("[data-bb-scored]");
    for (const article of articles) {
      cleanArticle(article);
    }
    // Remove singleton menu host
    const menuHost = document.getElementById("bb-menu-host");
    if (menuHost) menuHost.remove();
  }

  return { cleanArticle, cleanAll };
})();
