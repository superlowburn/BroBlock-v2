/**
 * BroBlock V2 — Detection Categories
 * 17 categories, 200+ weighted patterns, each with a human-readable reason.
 * Loaded before engine.js. Exposes BroCategories global.
 *
 * Weight tiers (3-20):
 *   T1 (3-5)   ambient — could appear in legitimate content
 *   T2 (6-9)   mild — mildly bro but common in tech/business discourse
 *   T3 (10-13) moderate — clearly bro but could be self-aware/ironic
 *   T4 (14-17) strong — unambiguous bro signals
 *   T5 (18-20) peak — definitional bro content
 */

/* eslint-disable no-unused-vars */
const BroCategories = (() => {
  const categories = [
    // ── 1. Income Claims ──
    {
      id: "incomeClaims",
      label: "Income Claim",
      patterns: [
        { regex: /(mak|earn|generat|pull|clear|net|gross|bring|pocket|averag|doing)\w*\s+\$[\d,]+[kKmMbB]?\s*(\/|\s*per\s*|a\s*)(month|mo|day|week|year|hr|hour)/i, weight: 17, reason: "income rate claim" },
        { regex: /\$[\d,]+[kKmMbB]?\s*(\/|\s*per\s*|a\s*)(month|mo|day|week|year|hr|hour)\s+(passive|recurring|on the side|from\s+(my|this|our|the))/i, weight: 18, reason: "income rate with qualifier" },
        { regex: /\$[\d,]+[kKmMbB]?\s+in\s+\d+\s*(days?|weeks?|months?|hours?)/i, weight: 20, reason: "income in timeframe brag" },
        { regex: /made\s+\$[\d,]+[kKmMbB]?/i, weight: 14, reason: "\"made $X\" income claim" },
        { regex: /earn(ed|ing)?\s+\$[\d,]+[kKmMbB]?/i, weight: 14, reason: "\"earned $X\" income claim" },
        { regex: /\b(6|7|8)\s*figures?\b/i, weight: 15, reason: "vague six/seven figure claim" },
        { regex: /\$[\d,]+[kKmMbB]?\s*(MRR|ARR|revenue)/i, weight: 15, reason: "revenue metric flex" },
        { regex: /hit\s+\$[\d,]+[kKmMbB]?/i, weight: 13, reason: "\"hit $X\" milestone brag" },
        { regex: /generating\s+\$[\d,]+[kKmMbB]?/i, weight: 14, reason: "\"generating $X\" income claim" },
        { regex: /from\s+\$?\d+.*to\s+\$[\d,]+[kKmMbB]?/i, weight: 18, reason: "income growth story" },
        { regex: /quit\s+(my|the)\s+job.*\$[\d,]+/i, weight: 20, reason: "quit-my-job income story" },
        { regex: /replace(d)?\s+(my|your)\s+(salary|income|9.to.5)/i, weight: 17, reason: "\"replaced my salary\" claim" },
        { regex: /(doubled|tripled|10x.?d)\s+my\s+(income|revenue|salary)/i, weight: 15, reason: "income multiplier brag" },
        { regex: /(making|earning)\s+more\s+than\s+(my|a)\s+(doctor|lawyer|engineer)/i, weight: 14, reason: "income comparison to profession" },
        { regex: /income\s+(report|breakdown|update):?\s/i, weight: 10, reason: "income report post" },
      ],
    },

    // ── 2. Fake Authority ──
    {
      id: "fakeAuthority",
      label: "Fake Authority",
      patterns: [
        { regex: /most people don.?t (know|realize|understand)/i, weight: 12, reason: "\"most people don't know\" gatekeeping" },
        { regex: /they don.?t want you to (know|see|understand)/i, weight: 16, reason: "conspiracy framing" },
        { regex: /the secret (no one|nobody) talks? about/i, weight: 16, reason: "secret knowledge claim" },
        { regex: /what (no one|nobody) (tells|told) you/i, weight: 13, reason: "hidden truth framing" },
        { regex: /here.?s what (most|99%|the top)/i, weight: 10, reason: "elite knowledge gatekeeping" },
        { regex: /I.?ve (spent|invested)\s+\d+\s*(years?|months?|hours?)\s+(studying|researching|learning)/i, weight: 10, reason: "time-invested authority claim" },
        { regex: /after\s+(coaching|helping|training)\s+\d+\s*(people|\+|clients|students)/i, weight: 14, reason: "coaching numbers authority" },
        { regex: /the (real|ugly|honest|hard) truth about/i, weight: 8, reason: "\"hard truth\" framing" },
        { regex: /nobody is talking about this/i, weight: 12, reason: "\"nobody talks about this\"" },
        { regex: /this is the (only|best|fastest) way/i, weight: 8, reason: "single-path authority claim" },
        { regex: /\bcontroversial\b/i, weight: 4, reason: "contrarian authority signal" },
      ],
    },

    // ── 3. Engagement Bait ──
    {
      id: "engagementBait",
      label: "Engagement Bait",
      patterns: [
        { regex: /here\s+are\s+\d+\s+(tools|ways|tips|hacks|secrets|lessons|steps|things|rules|habits)/i, weight: 11, reason: "numbered list bait" },
        { regex: /stop scrolling/i, weight: 16, reason: "\"stop scrolling\" hook" },
        { regex: /thread\s*\u{1F9F5}/iu, weight: 6, reason: "thread emoji bait" },
        { regex: /\bthread\b\s*[:\u2193\u{1F447}]/iu, weight: 5, reason: "thread pointer bait" },
        { regex: /save this (thread|post|tweet)/i, weight: 12, reason: "\"save this\" engagement hook" },
        { regex: /bookmark this/i, weight: 10, reason: "\"bookmark this\" engagement hook" },
        { regex: /retweet if you/i, weight: 13, reason: "retweet solicitation" },
        { regex: /share this with/i, weight: 7, reason: "share solicitation" },
        { regex: /tag (someone|a friend|people)/i, weight: 10, reason: "tag solicitation" },
        { regex: /follow me for (more|daily|weekly)/i, weight: 13, reason: "follow solicitation" },
        { regex: /don.?t miss this/i, weight: 8, reason: "FOMO hook" },
        { regex: /you need to (see|read|hear|know) this/i, weight: 9, reason: "urgency hook" },
        { regex: /^\d+\//m, weight: 5, reason: "numbered thread opener (1/)" },
        { regex: /this (changed|blew|will change|will blow)/i, weight: 7, reason: "transformation hook" },
        { regex: /I wish I (knew|learned|started)/i, weight: 6, reason: "regret hook" },
        { regex: /if you.re not .{0,20}you.re (missing|behind|losing)/i, weight: 11, reason: "FOMO pressure" },
        { regex: /most of you won.?t (do|read|finish)/i, weight: 13, reason: "reverse psychology bait" },
        { regex: /let that sink in/i, weight: 8, reason: "\"let that sink in\" engagement" },
        { regex: /can you guess/i, weight: 8, reason: "\"can you guess\" engagement bait" },
        { regex: /guess (how much|what|how many)/i, weight: 8, reason: "guess-the-answer engagement bait" },
        { regex: /\u{1F9F5}(\s|$)/u, weight: 5, reason: "thread emoji" },
        { regex: /screenshot (this|for later)/i, weight: 10, reason: "screenshot CTA" },
        { regex: /drop (a |your )?(comment|reply|like)\s+(if|and|to)/i, weight: 11, reason: "comment-drop engagement farm" },
        { regex: /what\s+.{0,35}should\s+I\s+(make|build|create|do|post|cover|write)\s+next/i, weight: 7, reason: "audience engineering question" },
      ],
    },

    // ── 4. Vague Transformation ──
    {
      id: "vagueTransformation",
      label: "Vague Transformation",
      patterns: [
        { regex: /changed my life/i, weight: 7, reason: "\"changed my life\" claim" },
        { regex: /went from .{3,40} to .{3,40} in \d+/i, weight: 11, reason: "before/after transformation story" },
        { regex: /transform(ed|ing)?\s+(my|your|the)\s+(life|business|career|body|mindset)/i, weight: 8, reason: "transformation language" },
        { regex: /\d+\s*(days?|weeks?|months?)\s+ago\s+I\s+(was|had|couldn)/i, weight: 9, reason: "transformation timeline story" },
        { regex: /this (one|simple) (thing|hack|trick|change|habit)/i, weight: 11, reason: "\"one simple trick\" framing" },
        { regex: /if I can do it,?\s*(so can|anyone|you)/i, weight: 7, reason: "false accessibility claim" },
        { regex: /my life will never be the same/i, weight: 9, reason: "life-changing hyperbole" },
        { regex: /I never thought I.?d/i, weight: 4, reason: "disbelief transformation setup" },
        { regex: /the\s+\d+\s+(habits?|rules?|principles?)\s+that\s+(changed|made)/i, weight: 9, reason: "numbered habits that changed everything" },
        { regex: /you.?re (one|1)\s+.{0,20}\s+away from/i, weight: 9, reason: "\"one step away\" false proximity" },
      ],
    },

    // ── 5. Hustle Culture ──
    {
      id: "hustleCulture",
      label: "Hustle Culture",
      patterns: [
        { regex: /rise and grind/i, weight: 16, reason: "hustle mantra" },
        { regex: /grind\s*(mode|time|season|don.?t stop)/i, weight: 13, reason: "grind culture language" },
        { regex: /while (you|they|everyone)\s+(slept|sleep|were sleeping|partied|watched)/i, weight: 17, reason: "\"while you slept\" superiority" },
        { regex: /no days? off/i, weight: 14, reason: "\"no days off\" hustle flex" },
        { regex: /outwork everyone/i, weight: 16, reason: "outwork mentality" },
        { regex: /work (harder|smarter) than/i, weight: 10, reason: "work comparison" },
        { regex: /hustle (harder|smarter|daily)/i, weight: 13, reason: "hustle language" },
        { regex: /success is (a choice|not|never|earned)/i, weight: 9, reason: "success philosophy lecturing" },
        { regex: /rich people (do|don.?t|think|know|understand|read)/i, weight: 15, reason: "rich vs poor framing" },
        { regex: /poor people (do|don.?t|think|believe|spend|waste)/i, weight: 17, reason: "poor-shaming framing" },
        { regex: /if you.?re not (obsessed|hungry|grinding|building)/i, weight: 13, reason: "hustle gatekeeping" },
        { regex: /winners?\s+(don.?t|never|always)/i, weight: 8, reason: "winner/loser framing" },
        { regex: /losers?\s+(do|always|never|make)/i, weight: 11, reason: "loser-shaming" },
        { regex: /your (9.to.5|day job) is (killing|holding|making)/i, weight: 15, reason: "anti-employment rhetoric" },
        { regex: /nobody (cares about|owes|is coming)/i, weight: 7, reason: "tough love hustle rhetoric" },
        { regex: /stop making excuses/i, weight: 11, reason: "blame-the-individual rhetoric" },
        { regex: /discipline (is|equals|>|beats|over)\s*(freedom|talent|motivation)/i, weight: 10, reason: "discipline platitude" },
        { regex: /your network is your net worth/i, weight: 13, reason: "networking platitude" },
      ],
    },

    // ── 6. Crypto/Finance Grift ──
    {
      id: "cryptoGrift",
      label: "Crypto/Finance Grift",
      patterns: [
        { regex: /passive income/i, weight: 12, reason: "\"passive income\" promise" },
        { regex: /to the moon/i, weight: 10, reason: "crypto hype language" },
        { regex: /\b100x\b/i, weight: 15, reason: "100x return claim" },
        { regex: /still early/i, weight: 7, reason: "\"still early\" FOMO" },
        { regex: /financial freedom/i, weight: 11, reason: "financial freedom promise" },
        { regex: /generational wealth/i, weight: 13, reason: "generational wealth claim" },
        { regex: /multiple (streams|sources) of income/i, weight: 12, reason: "multiple income streams pitch" },
        { regex: /money (while you|in your) sleep/i, weight: 16, reason: "\"money while you sleep\" pitch" },
        { regex: /don.?t miss (this|the next) (bull|pump|run|opportunity|chance)/i, weight: 15, reason: "crypto FOMO urgency" },
        { regex: /next (100|1000)x/i, weight: 18, reason: "moonshot return claim" },
        { regex: /retire (early|young|in|by)/i, weight: 9, reason: "early retirement pitch" },
        { regex: /escape the rat race/i, weight: 12, reason: "rat race rhetoric" },
        { regex: /build wealth (while|by|through)/i, weight: 7, reason: "wealth-building pitch" },
      ],
    },

    // ── 7. Disguised Selling ──
    {
      id: "disguisedSelling",
      label: "Disguised Selling",
      patterns: [
        { regex: /DM me (for|to|if|and)/i, weight: 15, reason: "DM funnel" },
        { regex: /link in (my )?(bio|profile)/i, weight: 13, reason: "link-in-bio sales funnel" },
        { regex: /comment\s+["'].+["']\s+(and|to|for|below)/i, weight: 17, reason: "comment-gated content" },
        { regex: /reply\s+["'].+["']\s+(and|to|for)/i, weight: 17, reason: "reply-gated content" },
        { regex: /(drop|type|comment)\s+["'].{1,10}["']\s+(below|and)/i, weight: 15, reason: "keyword-gated content" },
        { regex: /I.?ll send (you|it|the)/i, weight: 12, reason: "conditional content delivery" },
        { regex: /want (my|the|this)\s+.{0,20}\s*\?\s*(DM|comment|reply|drop)/i, weight: 16, reason: "gated resource offer" },
        { regex: /free (guide|template|checklist|resource|ebook|course|tool|pdf)/i, weight: 11, reason: "free resource hook" },
        { regex: /I (just |re)?launched/i, weight: 3, reason: "product launch announcement" },
        { regex: /grab (your|a|my) (free |)(copy|spot|seat|access)/i, weight: 12, reason: "urgency-laced offer" },
        { regex: /doors? (close|closing|open|opening)/i, weight: 14, reason: "artificial door open/close" },
        { regex: /last chance to/i, weight: 11, reason: "last chance urgency" },
        { regex: /exclusive access/i, weight: 11, reason: "exclusivity hook" },
        { regex: /join (my|the|our)\s+(community|group|newsletter|list|waitlist|cohort)/i, weight: 9, reason: "community/list building" },
        { regex: /subscribers?\s+(get|receive|unlock)/i, weight: 8, reason: "subscriber gating" },
        { regex: /I (created|built|made|wrote)\s+.{0,30}\s+(so you|that will|to help)/i, weight: 7, reason: "product as altruism" },
        { regex: /check (it )?out\s+(here|below|now|at)/i, weight: 4, reason: "CTA redirect" },
        { regex: /use (my |)(code|link|referral)/i, weight: 10, reason: "affiliate/referral push" },
        { regex: /\b(spots?|seats?)\s+(are\s+)?(limited|filling|running out|almost gone)/i, weight: 15, reason: "artificial scarcity" },
        { regex: /only\s+\d+\s+(spots?|seats?|copies|left)/i, weight: 15, reason: "limited availability pressure" },
        { regex: /price (goes|going) up/i, weight: 14, reason: "price increase pressure" },
        { regex: /\b(gumroad|stan\.store|skool|kajabi|podia|teachable|thinkific)\b/i, weight: 11, reason: "course platform shilling" },
        { regex: /drop (me )?your email/i, weight: 15, reason: "email list harvesting" },
        { regex: /\bsubstack\.com\b.*\bsubscribe\b/i, weight: 8, reason: "Substack subscribe push" },
        { regex: /made\s+(the|my|a)\s+(guide|course|resource|toolkit|system|tool)\s+(public|available|free)/i, weight: 9, reason: "made guide/resource public distribution" },
        { regex: /available\s+in\s+(the\s+)?(comments?|replies?|thread)\s*(of\s+the\s+OP)?/i, weight: 14, reason: "comment-gated distribution" },
        { regex: /beginner.?friendly\s+(walkthrough|tutorial|guide|course|setup)\s+that\s+shows?\s+you/i, weight: 8, reason: "beginner-friendly walkthrough product positioning" },
      ],
    },

    // ── 8. Follower Brags ──
    {
      id: "followerBrags",
      label: "Follower Brag",
      patterns: [
        { regex: /grew\s+(my|to|from)\s+\d+[kK,]?\s*(followers?|subs)/i, weight: 14, reason: "follower growth brag" },
        { regex: /went from \d+\s*to\s*\d+[kK]?\s*(followers?|subs)/i, weight: 16, reason: "follower growth story" },
        { regex: /gained\s+\d+[kK,]?\s*(followers?|subs)/i, weight: 12, reason: "follower gain claim" },
        { regex: /\d+[kK]\s*(followers?|subs)\s+in\s+\d+\s*(days?|weeks?|months?)/i, weight: 17, reason: "rapid follower growth claim" },
        { regex: /how I (got|grew|built)\s+\d+[kK]?\s*(followers?|subs|audience)/i, weight: 15, reason: "follower playbook story" },
        { regex: /hit\s+\d+[kK,]?\s*(followers?|subs)/i, weight: 11, reason: "follower milestone flex" },
        { regex: /my (audience|following|newsletter) (hit|grew|reached|crossed)/i, weight: 9, reason: "audience growth milestone" },
      ],
    },

    // ── 10. Fake Vulnerability ──
    {
      id: "fakeVulnerability",
      label: "Fake Vulnerability",
      patterns: [
        { regex: /I was (broke|broken|depressed|lost|homeless|struggling|at rock bottom)/i, weight: 14, reason: "rags-to-riches setup" },
        { regex: /almost gave up/i, weight: 12, reason: "near-defeat narrative" },
        { regex: /from (nothing|zero|broke|homeless|rock bottom) to/i, weight: 17, reason: "transformation origin story" },
        { regex: /nobody believed (in me|I could)/i, weight: 12, reason: "doubted-by-everyone narrative" },
        { regex: /I (dropped out|failed|got fired|was rejected)/i, weight: 8, reason: "failure-to-success setup" },
        { regex: /my (darkest|lowest|worst)\s+(moment|point|day|time)/i, weight: 12, reason: "darkest moment narrative" },
        { regex: /rock bottom (was|became|taught)/i, weight: 12, reason: "rock bottom transformation" },
        { regex: /I lost everything/i, weight: 14, reason: "lost everything narrative" },
        { regex: /years? ago I (had nothing|was nobody|couldn.?t)/i, weight: 12, reason: "humble origin timeline" },
      ],
    },

    // ── 11. Founder Cosplay ──
    {
      id: "founderCosplay",
      label: "Founder Cosplay",
      patterns: [
        { regex: /as a (CEO|founder|entrepreneur|business owner)/i, weight: 10, reason: "title-dropping authority" },
        { regex: /built (my|a|the) (startup|company|business|agency) to/i, weight: 11, reason: "business-building flex" },
        { regex: /serial entrepreneur/i, weight: 14, reason: "serial entrepreneur label" },
        { regex: /my\s+(first|latest|new)\s+(startup|company|venture|exit)/i, weight: 8, reason: "startup mention flex" },
        { regex: /exited?\s+(my|for|at)\s+\$?/i, weight: 11, reason: "exit/acquisition flex" },
        { regex: /bootstrapped to/i, weight: 7, reason: "bootstrapping brag" },
        { regex: /I (run|own|manage)\s+\d+\s+(companies|businesses|brands)/i, weight: 14, reason: "multi-business flex" },
        { regex: /hired?\s+(my|a)\s+(first|team|)\s*\d+/i, weight: 6, reason: "hiring milestone" },
        { regex: /building in (public|the open)/i, weight: 5, reason: "build-in-public signal" },
      ],
    },

    // ── 12. Thread Farming ──
    {
      id: "threadFarming",
      label: "Thread Farming",
      patterns: [
        { regex: /I did the research so you don.?t have to/i, weight: 14, reason: "research-done-for-you hook" },
        { regex: /steal (my|this) (framework|system|strategy|playbook|template)/i, weight: 15, reason: "\"steal my framework\" hook" },
        { regex: /I (spent|wasted)\s+\d+\s*(hours?|days?|weeks?|months?)\s+(so|figuring|testing|reading)/i, weight: 11, reason: "time-sacrifice authority" },
        { regex: /here.?s (my|the|a) (step.by.step|complete|ultimate|full)/i, weight: 8, reason: "comprehensive guide hook" },
        { regex: /this took me \d+/i, weight: 9, reason: "effort-based authority claim" },
        { regex: /save yourself \d+/i, weight: 12, reason: "time-saving promise" },
        { regex: /I (analyzed|studied|reviewed|tested)\s+\d+/i, weight: 5, reason: "analysis authority claim" },
        { regex: /the (complete|ultimate|definitive|only) guide/i, weight: 10, reason: "\"ultimate guide\" framing" },
      ],
    },

    // ── 13. Fake Scarcity ──
    {
      id: "fakeScarcity",
      label: "Fake Scarcity",
      patterns: [
        { regex: /only\s+\d+\s+(spots?|seats?|left|remaining|available)/i, weight: 15, reason: "artificial limited spots" },
        { regex: /price (goes|going) up (tonight|tomorrow|soon|this)/i, weight: 17, reason: "price increase pressure" },
        { regex: /limited (time|access|spots?|offer|availability)/i, weight: 12, reason: "artificial scarcity" },
        { regex: /closing (soon|tonight|tomorrow|this|in \d)/i, weight: 12, reason: "closing deadline pressure" },
        { regex: /won.?t (offer|share|do|open) this again/i, weight: 15, reason: "one-time-only pressure" },
        { regex: /act (fast|now|quick|before)/i, weight: 7, reason: "urgency language" },
        { regex: /early (bird|access|adopter)\s*(price|pricing|discount|offer|rate)/i, weight: 10, reason: "early-bird pressure" },
        { regex: /this offer (expires|ends|closes)/i, weight: 12, reason: "offer expiration pressure" },
        { regex: /first\s+\d+\s+(people|readers|subscribers|signups)/i, weight: 10, reason: "first-come-first-serve pressure" },
      ],
    },

    // ── 14. Testimonial Harvesting ──
    {
      id: "testimonialHarvesting",
      label: "Testimonial Harvesting",
      patterns: [
        { regex: /what.?s (the best|your favorite|your go.to|the #1)\s+(tool|app|book|habit|resource|advice)/i, weight: 8, reason: "engagement farming question" },
        { regex: /drop your (best|#1|favorite|top)/i, weight: 9, reason: "\"drop your best\" engagement farm" },
        { regex: /what (tool|app|book|habit|resource)\s+(changed|saved|transformed)/i, weight: 9, reason: "transformation question farm" },
        { regex: /tell me your\s+(biggest|best|worst|#1)/i, weight: 8, reason: "personal story solicitation" },
        { regex: /wrong answers only/i, weight: 5, reason: "engagement bait format" },
        { regex: /hot take:?\s/i, weight: 4, reason: "hot take format" },
        { regex: /unpopular opinion:?\s/i, weight: 5, reason: "unpopular opinion format" },
        { regex: /the most underrated/i, weight: 6, reason: "\"most underrated\" engagement bait" },
      ],
    },

    // ── 14. AI Bro ──
    {
      id: "aiBro",
      label: "AI Bro",
      patterns: [
        { regex: /I (built|made|created|shipped|launched)\s+.{0,30}\s+(with|using)\s+(ChatGPT|GPT|Claude|AI|Cursor|Copilot|v0|Bolt|Lovable|Replit)/i, weight: 10, reason: "AI speed-build brag" },
        { regex: /in\s+(just\s+)?\d+\s*(min|minutes?|hours?|hrs?)\s+(with|using)\s+(AI|ChatGPT|GPT|Claude|Cursor)/i, weight: 14, reason: "AI time-flex" },
        { regex: /(ChatGPT|GPT|Claude|AI|Cursor)\s+(just|can)\s+(replaced?|eliminated?|killed?|made\s+\w+\s+obsolete)/i, weight: 15, reason: "AI replacement fear-mongering" },
        { regex: /you.?ll be (replaced|left behind|obsolete) if you (don.?t|aren.?t)/i, weight: 18, reason: "AI FOMO fear-mongering" },
        { regex: /AI (will|is going to) (replace|eliminate|kill|destroy|disrupt)/i, weight: 11, reason: "AI disruption fear-mongering" },
        { regex: /learn (AI|prompt engineering|ChatGPT|GPT) or/i, weight: 15, reason: "learn-AI-or-die pressure" },
        { regex: /\d+\s*(AI\s+)?(tools?|prompts?|agents?)\s+(that|every|you|for|to)/i, weight: 5, reason: "AI tool listicle" },
        { regex: /my (favorite|best|top)\s+\d+\s*(AI\s+)?(tools?|prompts?|agents?|workflows?)/i, weight: 8, reason: "AI tools ranking" },
        { regex: /stop (doing|writing|coding|designing) .{0,20} manually/i, weight: 10, reason: "manual-work shaming" },
        { regex: /automate (everything|your|this|it) (with|using)/i, weight: 9, reason: "automation evangelism" },
        { regex: /this AI (tool|app|agent|workflow) (is|just|will)/i, weight: 7, reason: "AI tool shilling" },
        { regex: /AI\s+won.?t (take|steal|replace) your job.+will/i, weight: 16, reason: "\"AI won't but people using AI will\" cliche" },
        { regex: /prompt (engineering|hack|trick|template)/i, weight: 6, reason: "prompt engineering content" },
        { regex: /vibe cod(e|ing)/i, weight: 6, reason: "vibe coding buzz" },
        { regex: /the future (of work|is|belongs to)/i, weight: 3, reason: "future-of-work rhetoric" },
        { regex: /10x (your|my|the)\s+(productivity|output|workflow|speed)/i, weight: 13, reason: "10x productivity claim" },
        { regex: /built (this|a|my)\s+.{0,20}\s+(in|under)\s+\d+\s*(min|minutes?|hours?|hrs?)/i, weight: 9, reason: "speed-building brag" },
        { regex: /no.?code/i, weight: 3, reason: "no-code evangelism" },
        { regex: /AI (agent|wrapper|startup)\s+(that|which|I)/i, weight: 7, reason: "AI project promotion" },
        { regex: /I (automated|replaced|eliminated)\s+(my|our|the)\s+.{0,20}\s+(with|using)\s+(AI|ChatGPT|GPT)/i, weight: 11, reason: "AI automation brag" },
        { regex: /if you.?re not using (AI|ChatGPT|GPT|Claude|Cursor)/i, weight: 13, reason: "AI FOMO gatekeeping" },
        { regex: /(crazy|insane|wild|unbelievable) what (AI|ChatGPT|GPT|Claude) can/i, weight: 7, reason: "AI hype exclamation" },
        { regex: /AI is (eating|taking over|changing|disrupting|transforming)/i, weight: 7, reason: "AI disruption narrative" },
        { regex: /just (asked|told|prompted)\s+(ChatGPT|GPT|Claude|AI)\s+to/i, weight: 5, reason: "AI usage performance" },
        { regex: /shipped (a|my|this)\s+.{0,20}\s+(MVP|prototype|app|SaaS|product)\s+(in|under|within)/i, weight: 11, reason: "rapid shipping flex" },
        { regex: /you don.?t need (to learn|a degree|to code|developers?) (anymore|any more|when)/i, weight: 14, reason: "skills-obsolescence fear" },
        { regex: /I\s+built\s+(the|a|my)\s+(ultimate|best|complete|full|advanced)\s+.{0,40}AI\s+(toolkit|system|stack|workflow|automation|setup)/i, weight: 15, reason: "built the ultimate AI Toolkit promotion" },
        { regex: /handles?\s+(prospect\s+research|lead\s+gen|outreach|sales\s+calls?|cold\s+email)/i, weight: 9, reason: "AI tool for sales tasks pitch" },
        { regex: /in\s+(just\s+)?(minutes?|seconds?)\s+(it\s+)?(handles?|automates?|processes?|completes?)/i, weight: 9, reason: "AI speed claim (handles in minutes)" },
      ],
    },

    // ── 15. Sales/GTM Tool Bro ──
    {
      id: "salesGtmBro",
      label: "Sales/GTM Tool Bro",
      patterns: [
        { regex: /\b(GTM|go.?to.?market)\s+(engineer|specialist|expert|strategy|workflow|automation)/i, weight: 10, reason: "GTM title/workflow language" },
        { regex: /\bsales\s+automation\b/i, weight: 10, reason: "sales automation tool pitch" },
        { regex: /\b(cold\s+email|prospect\s+research|outreach\s+(tool|automation|platform))\b/i, weight: 10, reason: "sales ops vocabulary" },
        { regex: /\bLinkedIn\s+automation\b/i, weight: 12, reason: "LinkedIn automation shilling" },
        { regex: /(reply\.io|lemlist|instantly\.ai|smartlead|apollo\.io|outreach\.io|salesloft)/i, weight: 8, reason: "B2B sales tool name-drop" },
        { regex: /\b(reply rate|open rate|conversion rate)\b.*\%/i, weight: 9, reason: "sales metrics flex" },
        { regex: /generate\s+(more\s+)?(qualified\s+)?leads/i, weight: 9, reason: "lead generation promise" },
      ],
    },

    // ── 16. Productivity/Routine Hacking ──
    {
      id: "productivityBro",
      label: "Productivity/Routine Hacking",
      patterns: [
        { regex: /my\s+morning\s+routine/i, weight: 10, reason: "morning routine post" },
        { regex: /I\s+(wake|get\s+up)\s+(at|by)\s+\d+\s*(am|a\.?m)/i, weight: 9, reason: "early wake-up flex" },
        { regex: /(my|the)\s+(system|process|framework|method)\s+(for|to)\s+(get|do|accomplish|produce).{0,30}(more|faster|efficiently)/i, weight: 9, reason: "productivity system pitch" },
        { regex: /how\s+I\s+(get|stay|remain)\s+(more\s+)?(productive|organized|focused)/i, weight: 8, reason: "productivity advice hook" },
        { regex: /my\s+(daily|weekly)\s+(schedule|routine|workflow|calendar)/i, weight: 6, reason: "routine sharing performative" },
        { regex: /\b(time\s+blocking|deep\s+work|time\s+management)\b.{0,30}(system|strategy|method|hack)/i, weight: 7, reason: "time management system pitch" },
        { regex: /(Notion|Obsidian|Roam\s+Research|Logseq)\s+(setup|system|template|dashboard|workflow)/i, weight: 4, reason: "productivity app system flex" },
      ],
    },

    // ── 17. Mindset/Pseudo-Psychology ──
    {
      id: "mindsetBro",
      label: "Mindset/Pseudo-Psychology",
      patterns: [
        { regex: /\blimiting\s+beliefs?\b/i, weight: 10, reason: "limiting beliefs language" },
        { regex: /\b(abundance|scarcity)\s+mindset\b/i, weight: 12, reason: "abundance/scarcity mindset framing" },
        { regex: /\bgrowth\s+mindset\b/i, weight: 5, reason: "growth mindset pop-psych" },
        { regex: /your\s+(thoughts?|beliefs?|energy|vibration)\s+(create|attract|manifest)/i, weight: 15, reason: "thought-creates-reality claim" },
        { regex: /\b(law of attraction|manifestations?|high vibration)\b/i, weight: 13, reason: "manifestation pseudo-science" },
        { regex: /\bthe\s+universe\s+(is|will|wants|rewards|sends?)\b/i, weight: 11, reason: "universe-as-agent framing" },
        { regex: /\bsubconscious\s+(reprogramming|mind|block)/i, weight: 11, reason: "subconscious reprogramming pitch" },
      ],
    },
  ];

  return { categories };
})();
