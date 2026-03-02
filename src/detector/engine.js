/**
 * BroBlock V2 — Detection Engine
 * Pre-compiles regex patterns at load time. Scores text 0-120.
 * Returns score, matched categories, human-readable reasons, and full breakdown.
 * Depends on: BroCategories (from categories.js)
 */

/* eslint-disable no-unused-vars */
const BroDetector = (() => {
  // Pre-compile: build test array once at script load
  const compiled = BroCategories.categories.map((cat) => ({
    id: cat.id,
    label: cat.label,
    tests: cat.patterns.map((p) => ({
      test: p.regex,
      weight: p.weight,
      reason: p.reason,
    })),
  }));

  // Scoring constants
  const CAT_CAP = 35;                // Per-category soft ceiling (tanh asymptote)
  const BREADTH_BASE = 7;            // Additive breadth bonus: BREADTH_BASE * ln(n)
  const LONG_TEXT_THRESHOLD = 400;   // Chars above which length deflation kicks in
  const LONG_TEXT_FLOOR = 0.85;      // Max deflation for very long texts (15% reduction)

  // Pre-compiled dampener patterns — analytical/critical language
  // indicates the person is discussing/critiquing rather than promoting
  const DAMPENER_PATTERNS = [
    { test: /\b(costs?|pricing|priced at|pays? for|subscription|per seat)\b/i, weight: -8 },
    { test: /\b(compared to|versus|vs\.?|trade.?offs?|pros? and cons?)\b/i, weight: -8 },
    { test: /\b(overrated|overhyped|overblown|misleading|grift|scam)\b/i, weight: -10 },
    { test: /\b(the problem with|the issue with|the catch is|downside|caveat)\b/i, weight: -8 },
    { test: /\b(according to|research shows?|data (shows?|suggests?))\b/i, weight: -8 },
    { test: /\b(nuance|context matters|it depends|more complex|not that simple)\b/i, weight: -8 },
    { test: /\b(doesn.?t work|won.?t work|isn.?t worth|not worth)\b/i, weight: -8 },
    { test: /\b(replaces?|replacing|instead of|alternative to|cheaper than)\b/i, weight: -6 },
  ];

  // Pre-compiled name patterns
  const NAME_PATTERNS = [
    { test: /\b(CEO|founder|coach|mentor|trader|investor)\b/i, weight: 8 },
    { test: /\b(7.fig|6.fig|serial\s+entrepreneur)\b/i, weight: 10 },
    { test: /(\u{1F680}|\u{1F4B0}|\u{1F4B8}|\u{1F4A1}|\u{1F525}|\u{1F4AF}|\u{1F911}){2,}/u, weight: 8 },
    { test: /\b(hustl|grind|alpha|sigma|wealth|millionaire|billionaire)\b/i, weight: 8 },
    { test: /\b(helping|teaching|showing)\s+(you|people|entrepreneurs)/i, weight: 6 },
  ];

  /**
   * Score a tweet's text content.
   * @param {string} text - Tweet text
   * @param {{ hasBlueCheck?: boolean, displayName?: string }} [signals]
   * @returns {{ score: number, categories: string[], reasons: string[], breakdown: Array<{category: string, points: number, rawPoints: number, reasons: string[]}>, adjustments: number }}
   */
  function score(text, signals) {
    if (!text || typeof text !== "string") {
      return { score: 0, categories: [], reasons: [], breakdown: [] };
    }

    let total = 0;
    const breakdown = [];

    // 1. Per-category scoring with tanh soft cap
    for (const cat of compiled) {
      let catPoints = 0;
      const catReasons = [];

      for (const { test, weight, reason } of cat.tests) {
        if (test.test(text)) {
          catPoints += weight;
          catReasons.push(reason);
        }
      }

      // Reset lastIndex for global/sticky regexes (safety)
      for (const { test } of cat.tests) {
        test.lastIndex = 0;
      }

      if (catPoints > 0) {
        // Soft cap: tanh saturates toward CAT_CAP, preserves low-end linearity
        const effectivePoints = Math.round(CAT_CAP * Math.tanh(catPoints / CAT_CAP));
        breakdown.push({
          id: cat.id,
          category: cat.label,
          points: effectivePoints,
          rawPoints: catPoints,
          reasons: catReasons,
        });
        total += effectivePoints;
      }
    }

    // 2. Text-length deflation: long texts don't inflate score from sheer volume
    if (text.length > LONG_TEXT_THRESHOLD) {
      const deflation = LONG_TEXT_FLOOR + (1 - LONG_TEXT_FLOOR) * (LONG_TEXT_THRESHOLD / text.length);
      total = Math.round(total * deflation);
    }

    // 3. Breadth bonus: reward category diversity with additive points
    if (breakdown.length >= 2) {
      total += Math.round(BREADTH_BASE * Math.log(breakdown.length));
    }

    // 4. Dampener: analytical/critical language reduces score
    // Proportional cap: at least -8, at most 25% of current total
    let dampenerAdj = 0;
    if (total > 0) {
      let dampener = 0;
      for (const { test, weight } of DAMPENER_PATTERNS) {
        if (test.test(text)) dampener += weight;
        test.lastIndex = 0;
      }
      const dampenerCap = -Math.max(8, Math.round(total * 0.25));
      dampenerAdj = Math.max(dampener, dampenerCap);
      total += dampenerAdj;
    }

    // 5. Profile signals (only amplify existing text signal)
    let signalAdj = 0;
    if (total > 0 && signals) {
      if (signals.hasBlueCheck) signalAdj += 5;
      if (signals.displayName) {
        signalAdj += scoreName(signals.displayName);
      }
      total += signalAdj;
    }

    // Sort by highest-scoring category first
    breakdown.sort((a, b) => b.points - a.points);

    // Build flat reasons list, prefixed with category
    const reasons = breakdown
      .flatMap((b) => b.reasons.map((r) => b.category + ": " + r))
      .slice(0, 5);

    return {
      score: Math.min(Math.max(total, 0), BB.SCORE_MAX),
      categories: breakdown.map((b) => b.category),
      reasons,
      breakdown,
      adjustments: dampenerAdj + signalAdj,
    };
  }

  /**
   * Score a display name for bro signals.
   * @param {string} name
   * @returns {number} 0-15
   */
  function scoreName(name) {
    if (!name) return 0;
    let s = 0;
    for (const { test, weight } of NAME_PATTERNS) {
      if (test.test(name)) s += weight;
      test.lastIndex = 0;
    }
    return Math.min(s, 15);
  }

  return { score, scoreName };
})();
