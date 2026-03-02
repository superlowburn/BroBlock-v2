/**
 * BroBlock V2 — Scorer Module
 * Per-article pipeline: extract -> check lists -> score -> render.
 * Depends on: BB, BroDetector, BroBlockExtractor, BroBlockUI
 */

/* eslint-disable no-unused-vars */
const BroBlockScorer = (() => {

  function processArticle(article, state) {
    // Skip already-scored articles
    if (article.hasAttribute("data-bb-scored")) return;

    // Extract tweet text — if empty, check if article is fully loaded
    const text = BroBlockExtractor.extractText(article);
    if (!text) {
      // If the article has a timestamp, it's fully rendered (media-only, etc).
      // Score as 0 and move on. Otherwise skip — retry when text arrives.
      if (!article.querySelector("time")) return;
    }

    // Mark as scored AFTER confirming text exists
    article.setAttribute("data-bb-scored", "1");

    const handle = BroBlockExtractor.extractHandle(article);
    const normalized = handle ? handle.toLowerCase() : null;
    const userMeta = normalized ? state.userCache.get(normalized) : null;

    // Trusted user — pill only, no scoring needed
    if (normalized && state.trustedUsers.has(normalized)) {
      BroBlockUI.renderPill(article, {
        score: 0,
        handle: handle,
        state: "trusted",
        reasons: [],
        categories: [],
        userMeta: userMeta,
      });
      return;
    }

    // Known bro — frost immediately, no scoring needed
    if (normalized && state.knownBros.has(normalized)) {
      BroBlockUI.renderFrost(article, {
        score: 0,
        handle: handle,
        state: "knownBro",
        reasons: ["Manually flagged as bro"],
        categories: [],
        userMeta: userMeta,
      }, state);
      return;
    }

    // Score-based detection
    const signals = BroBlockExtractor.extractSignals(article);
    const raw = BroDetector.score(text, signals);

    // Apply interest filter (zero out points for topics user is interested in)
    const result = applyInterests(raw, state.interestedCategories);
    const isFrosted = result.score >= state.threshold;

    const data = {
      score: result.score,
      handle: handle,
      state: "scored",
      reasons: result.reasons,
      categories: result.categories,
      breakdown: result.breakdown,
      userMeta: userMeta,
    };

    if (isFrosted) {
      BroBlockUI.renderFrost(article, data, state);
    } else {
      BroBlockUI.renderPill(article, data);
    }
  }

  /**
   * Zero out points for categories the user is interested in.
   * Keeps all categories in the breakdown (so UI can show them with hearts).
   * Recalculates compound bonus on the adjusted totals.
   */
  function applyInterests(result, interestedSet) {
    if (!interestedSet || interestedSet.size === 0) return result;

    const hasInterested = result.breakdown.some((b) => interestedSet.has(b.id));
    if (!hasInterested) return result;

    // Zero points for interested categories, keep others as-is
    let total = 0;
    const adjusted = result.breakdown.map((b) => {
      if (interestedSet.has(b.id)) {
        return { ...b, points: 0, interested: true };
      }
      total += b.points;
      return b;
    });

    // Compound bonus only counts non-interested categories
    const activeCount = adjusted.filter((b) => !b.interested).length;
    if (activeCount >= 3) {
      total += (activeCount - 2) * 8;
    }

    const reasons = adjusted
      .flatMap((b) => b.reasons.map((r) => b.category + ": " + r))
      .slice(0, 5);

    return {
      score: Math.min(Math.max(total, 0), 100),
      categories: adjusted.map((b) => b.category),
      reasons,
      breakdown: adjusted,
    };
  }

  return { processArticle };
})();
