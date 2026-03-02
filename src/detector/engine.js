/**
 * BroBlock V2 — Detection Engine
 * Pre-compiles regex patterns at load time. Scores text 0-100.
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
    { test: /\u{1F680}|\u{1F4B0}|\u{1F4B8}|\u{1F4A1}|\u{1F525}/u, weight: 5 },
    { test: /\b(hustl|grind|alpha|sigma|wealth|millionaire|billionaire)\b/i, weight: 8 },
    { test: /\b(helping|teaching|showing)\s+(you|people|entrepreneurs)/i, weight: 6 },
  ];

  /**
   * Score a tweet's text content.
   * @param {string} text - Tweet text
   * @param {{ hasBlueCheck?: boolean, displayName?: string }} [signals]
   * @returns {{ score: number, categories: string[], reasons: string[], breakdown: Array<{category: string, points: number, reasons: string[]}> }}
   */
  function score(text, signals) {
    if (!text || typeof text !== "string") {
      return { score: 0, categories: [], reasons: [], breakdown: [] };
    }

    let total = 0;
    const breakdown = [];

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
        breakdown.push({
          id: cat.id,
          category: cat.label,
          points: catPoints,
          reasons: catReasons,
        });
        total += catPoints;
      }
    }

    // Compound bonus: 3+ categories = extra signal
    if (breakdown.length >= 3) {
      total += (breakdown.length - 2) * 8;
    }

    // Dampener: analytical/critical language reduces score
    // Caps at -20 so genuinely bro content (50+) still gets caught
    if (total > 0) {
      let dampener = 0;
      for (const { test, weight } of DAMPENER_PATTERNS) {
        if (test.test(text)) dampener += weight;
        test.lastIndex = 0;
      }
      total += Math.max(dampener, -20);
    }

    // Profile signals (only amplify existing text signal)
    if (total > 0 && signals) {
      if (signals.hasBlueCheck) total += 5;
      if (signals.displayName) {
        total += scoreName(signals.displayName);
      }
    }

    // Sort by highest-scoring category first
    breakdown.sort((a, b) => b.points - a.points);

    // Build flat reasons list, prefixed with category
    const reasons = breakdown
      .flatMap((b) => b.reasons.map((r) => b.category + ": " + r))
      .slice(0, 5);

    return {
      score: Math.min(Math.max(total, 0), 100),
      categories: breakdown.map((b) => b.category),
      reasons,
      breakdown,
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
