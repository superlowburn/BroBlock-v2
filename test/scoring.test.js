/**
 * BroBlock V2 — Scoring Engine Tests
 * Run: node --test test/scoring.test.js
 * Zero dependencies — uses node:test, node:assert/strict, node:vm.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

// ── Load browser globals into this context ──
// Order matters: constants → categories → engine (same as manifest)

const root = path.resolve(__dirname, "..");

// Minimal chrome stub so BB's IIFE doesn't blow up
globalThis.chrome = { storage: { sync: { get() {} }, onChanged: { addListener() {} } }, runtime: { getURL() { return ""; }, onMessage: { addListener() {} } } };

function loadScript(relPath) {
  let code = fs.readFileSync(path.join(root, relPath), "utf8");
  // const at script-level in vm.runInThisContext doesn't attach to globalThis.
  // Replace the top-level IIFE const with var so the globals are accessible.
  code = code.replace(/^const (BB|BroCategories|BroDetector)\b/m, "var $1");
  vm.runInThisContext(code, { filename: relPath });
}

loadScript("src/constants.js");
loadScript("src/detector/categories.js");
loadScript("src/detector/engine.js");

// Sanity: globals should exist
assert.ok(globalThis.BB, "BB global missing");
assert.ok(globalThis.BroCategories, "BroCategories global missing");
assert.ok(globalThis.BroDetector, "BroDetector global missing");

// ── Helpers ──

function scoreText(text, signals) {
  return BroDetector.score(text, signals);
}

// ── Tests ──

describe("Zero-score normal tweets", () => {
  it("scores a plain conversational tweet at 0", () => {
    const r = scoreText("Had a great coffee this morning with friends");
    assert.equal(r.score, 0);
  });

  it("scores a technical tweet at 0", () => {
    const r = scoreText("Just fixed a race condition in our connection pool. Off by one in the semaphore count.");
    assert.equal(r.score, 0);
  });

  it("scores a news-style tweet at 0", () => {
    const r = scoreText("The new MacBook Pro reviews are out. Looks like a solid upgrade for the M3 chip.");
    assert.equal(r.score, 0);
  });

  it("scores an opinion tweet at 0", () => {
    const r = scoreText("I think TypeScript interfaces are better than type aliases for public APIs");
    assert.equal(r.score, 0);
  });
});

describe("Single-category matches", () => {
  it("detects income claims", () => {
    const r = scoreText("I made $50K in 30 days selling digital products");
    assert.ok(r.score > 0, "should score above 0");
    assert.ok(r.categories.includes("Income Claim"), "should detect income claim");
  });

  it("detects engagement bait", () => {
    const r = scoreText("Stop scrolling. Here are 10 tools every developer needs:");
    assert.ok(r.score > 0);
    assert.ok(r.categories.includes("Engagement Bait"));
  });

  it("detects hustle culture", () => {
    const r = scoreText("While you slept I was grinding on my side project. Rise and grind.");
    assert.ok(r.score > 0);
    assert.ok(r.categories.includes("Hustle Culture"));
  });
});

describe("Multi-category with breadth bonus", () => {
  it("scores higher when multiple categories hit", () => {
    const single = scoreText("I made $50K in 30 days");
    const multi = scoreText("I made $50K in 30 days. Stop scrolling. While you slept I was grinding.");
    assert.ok(multi.score > single.score, "multi-category should score higher");
    assert.ok(multi.categories.length >= 2, "should match at least 2 categories");
  });

  it("includes breadth bonus for 2+ categories", () => {
    const r = scoreText("I made $50K in 30 days. Stop scrolling. While you slept I was grinding.");
    // With 3+ categories, breadth bonus = 7 * ln(n) > 0
    assert.ok(r.breakdown.length >= 2);
  });
});

describe("Dampener behavior", () => {
  it("reduces score for analytical/critical language", () => {
    const bro = scoreText("I made $50K in 30 days selling my course");
    const critical = scoreText("I made $50K in 30 days — the problem with this claim is it's overrated and misleading");
    assert.ok(critical.score < bro.score, "critical language should dampen score");
  });

  it("dampener is proportionally capped", () => {
    const r = scoreText("I made $50K in 30 days — overrated misleading not worth it the problem with this compared to reality");
    // Dampener should reduce but not eliminate
    assert.ok(r.score >= 0, "score should not go negative");
  });

  it("dampener does not apply when score is 0", () => {
    const r = scoreText("The problem with this compared to other options is the pricing");
    // Dampener patterns match but base score is 0
    assert.equal(r.score, 0);
  });
});

describe("Per-category tanh soft cap", () => {
  it("caps a single category below CAT_CAP (35)", () => {
    // Stack many income claim patterns
    const r = scoreText("I made $50K in 30 days. Earning $100K/month passive. From $0 to $1M. Generating $200K. Hit $500K MRR. 7 figures.");
    const incomeEntry = r.breakdown.find((b) => b.id === "incomeClaims");
    assert.ok(incomeEntry, "should have income category");
    assert.ok(incomeEntry.points <= 35, `category points ${incomeEntry.points} should be <= 35 (CAT_CAP)`);
    assert.ok(incomeEntry.rawPoints > incomeEntry.points, "raw should exceed effective (tanh compression)");
  });

  it("preserves low scores linearly", () => {
    // Single low-weight match should pass through ~unchanged
    const r = scoreText("I just launched my new project");
    if (r.breakdown.length > 0) {
      const entry = r.breakdown[0];
      // For very small values, tanh(x/35)*35 ≈ x
      assert.ok(Math.abs(entry.points - entry.rawPoints) <= 1, "low scores should be near-linear");
    }
  });
});

describe("Text-length deflation", () => {
  it("deflates score for long texts", () => {
    const shortBro = "I made $50K in 30 days. Stop scrolling.";
    const longBro = shortBro + " ".repeat(400) + "Some more filler text to make it long.";
    const shortResult = scoreText(shortBro);
    const longResult = scoreText(longBro);
    // Long text should have same or lower score due to deflation
    assert.ok(longResult.score <= shortResult.score, "long text should deflate score");
  });
});

describe("Display name scoring", () => {
  it("scores bro display names", () => {
    const s = BroDetector.scoreName("CEO | Serial Entrepreneur | 7-Fig Founder");
    assert.ok(s > 0, "bro display name should score > 0");
  });

  it("returns 0 for normal display names", () => {
    const s = BroDetector.scoreName("John Smith");
    assert.equal(s, 0);
  });

  it("caps name score at 15", () => {
    const s = BroDetector.scoreName("CEO Founder Investor Serial Entrepreneur 7-fig Hustler Millionaire Coach");
    assert.ok(s <= 15, `name score ${s} should be <= 15`);
  });
});

describe("Bio scoring", () => {
  it("scores a bro bio", () => {
    const r = BroDetector.scoreBio("7-figure founder | Helping entrepreneurs scale | DM for coaching | Serial entrepreneur");
    assert.ok(r.bioScore > 0, "bro bio should score > 0");
    assert.ok(r.bioBreakdown.length > 0, "should have breakdown entries");
  });

  it("returns 0 for a normal bio", () => {
    const r = BroDetector.scoreBio("Software engineer. I like cats and hiking.");
    assert.equal(r.bioScore, 0);
  });

  it("caps bio score at BIO_CAP (20)", () => {
    const r = BroDetector.scoreBio(
      "7-figure serial entrepreneur | CEO of 5 companies | I made $50K in 30 days | " +
      "DM me for coaching | Passive income | Financial freedom | Rise and grind | " +
      "Escape the rat race | Your thoughts create reality"
    );
    assert.ok(r.bioScore <= 20, `bio score ${r.bioScore} should be <= 20 (BIO_CAP)`);
  });

  it("handles null/undefined bio", () => {
    assert.deepStrictEqual(BroDetector.scoreBio(null), { bioScore: 0, bioBreakdown: [], bioReasons: [] });
    assert.deepStrictEqual(BroDetector.scoreBio(undefined), { bioScore: 0, bioBreakdown: [], bioReasons: [] });
  });
});

describe("Bio pushing zero-text above 0", () => {
  it("scores account-only when text is empty but bio is bro", () => {
    const r = scoreText("", {
      bio: "7-figure founder | Helping entrepreneurs scale | Serial entrepreneur | DM for coaching",
      followers: 50000,
      following: 200,
    });
    assert.ok(r.score > 0, "bro bio should give non-zero score even with no text");
  });

  it("bio adds to text score", () => {
    const textOnly = scoreText("Here are 10 tools every developer needs:");
    const withBio = scoreText("Here are 10 tools every developer needs:", {
      bio: "7-figure founder | Serial entrepreneur | DM for coaching",
    });
    assert.ok(withBio.score > textOnly.score, "bio should increase text score");
  });
});

describe("Follower ratio scoring", () => {
  it("flags high-ratio follow farming (1.6×)", () => {
    const r = scoreText("Just sharing my thoughts", {
      followers: 5000,
      following: 8000, // ratio 1.6, following >= 1000
    });
    // should now return 4 pts (was 0 with old absolute-only logic)
    assert.ok(r.score >= 4, `expected >= 4, got ${r.score}`);
  });

  it("flags extreme-ratio follow farming (4×)", () => {
    const r = scoreText("Just sharing my thoughts", {
      followers: 5000,
      following: 20000, // ratio 4.0, following >= 500
    });
    assert.ok(r.score >= 7, `expected >= 7, got ${r.score}`);
  });

  it("does not flag healthy ratios (followers >> following)", () => {
    const r = scoreText("Just sharing my thoughts", {
      followers: 5000,
      following: 200, // ratio 0.04 — popular account, healthy
    });
    assert.equal(r.score, 0);
  });

  it("flags small account aggressively following (legacy)", () => {
    const r = scoreText("Just sharing my thoughts", {
      followers: 100,
      following: 5000,
    });
    assert.ok(r.score >= 4, `expected >= 4, got ${r.score}`);
  });

  it("handles missing follower data", () => {
    const r = scoreText("Just sharing my thoughts");
    assert.equal(r.score, 0); // no signals, no bro text
  });
});

describe("Hype machine patterns", () => {
  it("detects unsolicited follow recommendation", () => {
    const r = scoreText("Go follow @username they are absolutely crushing it 🔥");
    assert.ok(r.score > 0, "should score > 0");
    assert.ok(r.categories.includes("Hype Machine"), "should detect Hype Machine");
  });

  it("detects FOMO follow recommendation", () => {
    const r = scoreText("If you're not following @username you're missing out on the best content in this space");
    assert.ok(r.score > 0);
    assert.ok(r.categories.includes("Hype Machine"));
  });

  it("detects BREAKING fake urgency", () => {
    const r = scoreText("BREAKING: This AI tool just changed everything. Go follow @username now.");
    assert.ok(r.score > 0);
    assert.ok(r.categories.includes("Hype Machine"));
  });

  it("detects third-party MRR congratulation", () => {
    const r = scoreText("Congrats to @username on crossing $2k MRR! This is what consistency looks like 🙌");
    assert.ok(r.score > 0);
    assert.ok(r.categories.includes("Hype Machine"));
  });

  it("detects 'this guy' hype authority pattern", () => {
    const r = scoreText("This guy knows exactly what he's talking about. Go follow him now.");
    assert.ok(r.score > 0);
    assert.ok(r.categories.includes("Hype Machine"));
  });

  it("detects empty community solidarity", () => {
    const r = scoreText("This community is incredible. Grateful to be building alongside all of you 🙏");
    assert.ok(r.score > 0);
    assert.ok(r.categories.includes("Hype Machine"));
  });

  it("does not flag genuine congratulations without hype patterns", () => {
    const r = scoreText("Happy birthday to my friend. Hope you have a great day!");
    assert.equal(r.score, 0, "plain congratulations should not score");
  });

  it("stacks with follower ratio for a combined signal", () => {
    const textOnly = scoreText("Go follow @username they are crushing it");
    const withRatio = scoreText("Go follow @username they are crushing it", {
      followers: 5000,
      following: 8000,
    });
    assert.ok(withRatio.score > textOnly.score, "ratio should add to hype text score");
  });
});

describe("Score bounds", () => {
  it("never returns negative", () => {
    const r = scoreText("compared to other options the pricing is overrated and not worth it");
    assert.ok(r.score >= 0, "score should never be negative");
  });

  it("never exceeds SCORE_MAX (120)", () => {
    // The platonic bro tweet
    const text =
      "I was broke and homeless last year. Almost gave up. Then I built a $50K/month AI SaaS " +
      "in 2 hours using Cursor. Here are 10 tools that changed my life 🧵 " +
      "Most people don't know this, but you'll be replaced if you're not using AI. " +
      "While you slept, I was grinding. DM me 'FREE' for my guide — only 3 spots left. " +
      "This offer closes tonight. Stop scrolling. Save this thread. " +
      "Your network is your net worth. I escaped the rat race and so can you. " +
      "The universe rewards action. Bookmark this. Follow me for more.";
    const r = scoreText(text, {
      bio: "7-figure serial entrepreneur | CEO | DM for coaching | Passive income",
      hasBlueCheck: true,
      displayName: "CEO | Serial Entrepreneur 🚀💰",
      followers: 100000,
      following: 300,
    });
    assert.ok(r.score <= 120, `score ${r.score} should be <= 120`);
    assert.ok(r.score > 80, `platonic bro tweet should score high, got ${r.score}`);
  });
});

describe("Return shape", () => {
  it("returns expected fields for text scoring", () => {
    const r = scoreText("I made $50K in 30 days", { bio: "Entrepreneur", hasBlueCheck: true, displayName: "Test" });
    assert.ok(typeof r.score === "number");
    assert.ok(Array.isArray(r.categories));
    assert.ok(Array.isArray(r.reasons));
    assert.ok(Array.isArray(r.breakdown));
    assert.ok(typeof r.adjustments === "number");
    assert.ok(typeof r.bioScore === "number");
    assert.ok(Array.isArray(r.bioBreakdown));
  });

  it("returns expected fields for empty input", () => {
    const r = scoreText("");
    assert.equal(r.score, 0);
    assert.deepStrictEqual(r.categories, []);
    assert.deepStrictEqual(r.reasons, []);
    assert.deepStrictEqual(r.breakdown, []);
    assert.equal(r.adjustments, 0);
    assert.equal(r.bioScore, 0);
    assert.deepStrictEqual(r.bioBreakdown, []);
  });
});

describe("Profile signals", () => {
  it("blue check adds points only when base score > 0", () => {
    const noCheck = scoreText("I made $50K in 30 days");
    const withCheck = scoreText("I made $50K in 30 days", { hasBlueCheck: true });
    assert.ok(withCheck.score > noCheck.score, "blue check should add points when base > 0");
  });

  it("blue check does not add points to zero-score tweets", () => {
    const r = scoreText("Had a great coffee this morning", { hasBlueCheck: true });
    assert.equal(r.score, 0, "blue check should not inflate zero-score tweet");
  });

  it("display name amplifies existing signal", () => {
    const noName = scoreText("I made $50K in 30 days");
    const withName = scoreText("I made $50K in 30 days", { displayName: "CEO | Serial Entrepreneur 🚀💰" });
    assert.ok(withName.score > noName.score, "bro display name should amplify score");
  });
});

describe("Account-only scoring (no text)", () => {
  it("scores from bio alone", () => {
    const r = scoreText(null, {
      bio: "7-figure founder | Serial entrepreneur | DM me for coaching",
      followers: 50000,
      following: 200,
    });
    assert.ok(r.score > 0, "should score from bio alone");
    assert.ok(r.bioScore > 0);
  });

  it("returns 0 when no text and no signals", () => {
    const r = scoreText(null);
    assert.equal(r.score, 0);
  });

  it("does not include text categories in account-only mode", () => {
    const r = scoreText(null, {
      bio: "Serial entrepreneur helping people escape the rat race",
      followers: 1000,
      following: 100,
    });
    assert.deepStrictEqual(r.categories, [], "account-only should have empty text categories");
  });
});
