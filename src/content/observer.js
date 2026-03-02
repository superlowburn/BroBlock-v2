/**
 * BroBlock V2 — Observer Module
 * Debounced MutationObserver + periodic sweep for missed articles.
 * Depends on: BroBlockScorer, BroBlockCleanup
 */

/* eslint-disable no-unused-vars */
const BroBlockObserver = (() => {
  const DEBOUNCE_MS = 50;
  const SWEEP_MS = 2000;

  let mutationObs = null;
  let pendingNodes = [];
  let debounceTimer = null;
  let sweepTimer = null;

  function start(state) {
    if (mutationObs) return;

    // Process existing articles
    processNodes(document.body, state);

    // Debounced MutationObserver
    mutationObs = new MutationObserver((mutations) => {
      if (!state.enabled) return;
      const seenArticles = new Set();
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          pendingNodes.push(node);
          // When Twitter hydrates text inside an existing article,
          // the addedNode is a child — walk up to find the parent article
          const parentArticle = node.closest?.("article");
          if (parentArticle && !parentArticle.hasAttribute("data-bb-scored") && !seenArticles.has(parentArticle)) {
            seenArticles.add(parentArticle);
            pendingNodes.push(parentArticle);
          }
        }
      }
      scheduleBatch(state);
    });

    mutationObs.observe(document.body, { childList: true, subtree: true });

    // Periodic sweep: catch any articles missed by mutations
    // (hydration timing, pill injection failures, recycled DOM nodes)
    sweepTimer = setInterval(() => {
      if (!state.enabled) return;
      const unscored = document.querySelectorAll("article:not([data-bb-scored])");
      for (const article of unscored) {
        BroBlockScorer.processArticle(article, state);
      }
    }, SWEEP_MS);
  }

  function scheduleBatch(state) {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      const nodes = pendingNodes;
      pendingNodes = [];
      debounceTimer = null;
      for (const node of nodes) {
        processNodes(node, state);
      }
    }, DEBOUNCE_MS);
  }

  function processNodes(root, state) {
    if (!root || !root.querySelectorAll) return;

    const articles = root.tagName === "ARTICLE"
      ? [root]
      : root.querySelectorAll("article");

    for (const article of articles) {
      BroBlockScorer.processArticle(article, state);
    }
  }

  function stop() {
    if (mutationObs) {
      mutationObs.disconnect();
      mutationObs = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (sweepTimer) {
      clearInterval(sweepTimer);
      sweepTimer = null;
    }
    pendingNodes = [];
  }

  function rescan(state) {
    BroBlockCleanup.cleanAll();
    processNodes(document.body, state);
  }

  return { start, stop, rescan };
})();
