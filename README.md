<!-- If you're reading the source, you're already not a bro. -->

# BroBlock

**A Chrome extension that detects and frosts bro/hustle/grifter tweets on Twitter/X.**

> Bro Score for this README: **3/120** — "product launch announcement"

---

## The Origin Story

I followed [OpenClaw](https://x.com/OpenClaw). Great account. Genuinely interesting AI content. Thought-provoking threads about what's actually happening in the space.

Then the algorithm noticed.

Within a week my timeline went from "here's an interesting paper on reasoning models" to:

> *"I built a $50K/month AI SaaS in 47 minutes using Cursor. Here are 10 tools you NEED. DM me 'MONEY' for my free guide. Only 5 spots left."*

I didn't follow these people. I didn't engage with them. But Twitter's recommendation engine saw "interested in AI" and decided that meant I wanted a front-row seat to every hustle-culture graduation ceremony on the platform.

It was relentless. Every scroll was another `🧵 thread` about how someone went from $0 to $50K/month, another "stop scrolling" hook, another "most people don't know this" gatekeep, another "I was broke and homeless but then I found passive income" origin story that definitely happened.

I tried muting. I tried "Not interested." I tried unfollowing and re-following. Twitter didn't care. The bros were here, and they were *building in public*.

So I did what any reasonable person would do.

I built a Chrome extension to make them go away.

---

## What It Does

BroBlock scans every tweet on your timeline against 200+ weighted patterns across 17 categories of bro behavior. Each tweet gets a **Bro Score** from 0 to 120.

Cross your sensitivity threshold? The tweet gets **frosted** — blurred out with a backdrop filter, replaced by a card that tells you exactly what it scored and why. You can peek if you want. Or you can just keep scrolling, finally at peace.

Tweets that don't hit the threshold still get a small pill showing their score, so you can watch the numbers tick up and feel validated in your annoyance.

---

## The 17 Deadly Sins

BroBlock detects these categories. You'll recognize all of them.

| # | Category | You know the type |
|---|---|---|
| 1 | **Income Claims** | "I made $50K in 30 days" — always 30 days, never 31 |
| 2 | **Fake Authority** | "Most people don't know this" — because it's not true |
| 3 | **Engagement Bait** | "Stop scrolling." No. |
| 4 | **Vague Transformation** | "This one simple trick changed my life" — it was a newsletter |
| 5 | **Hustle Culture** | "While you slept, I was grinding" — sir, sleep is free |
| 6 | **Crypto/Finance Grift** | "Still early" — it is not early |
| 7 | **Disguised Selling** | "DM me 'FREE' for my guide" — the guide is a landing page |
| 8 | **Follower Brags** | "I grew to 100K followers in 90 days" using engagement pods |
| 9 | **Fake Vulnerability** | "I was broke and homeless" — narrator: they were not |
| 10 | **Founder Cosplay** | "As a serial entrepreneur" — of two Shopify dropship stores |
| 11 | **Thread Farming** | "I did the research so you don't have to" — the research was a Google search |
| 12 | **Fake Scarcity** | "Only 5 spots left" — there were never spots |
| 13 | **Testimonial Harvesting** | "What's your favorite AI tool?" — engagement farming disguised as curiosity |
| 14 | **AI Bro** | "You'll be replaced if you're not using AI" — posted from a phone |
| 15 | **Sales/GTM Bro** | "My cold email automation gets a 47% reply rate" — it does not |
| 16 | **Productivity Bro** | "My morning routine" — always starts at 4:30 AM, always includes cold plunges |
| 17 | **Mindset Bro** | "Your thoughts create your reality" — my thoughts created this extension |

---

## Install

1. Clone or download this repo
2. Go to `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**, select the project folder
5. Open x.com
6. Breathe

---

## Features

**Sensitivity Slider** — Ranges from **Chill** (only the most egregious grift) to **Aggressive** (if it even *sounds* like a bro, it's gone). Five levels, fully adjustable. Find your comfort zone.

**Frost Overlay** — Flagged tweets get a blurred backdrop with a score card. See the Bro Score, the categories that triggered, and the specific reasons. It's usually the rocket emojis.

**The Menu** — Click a frosted tweet to see the full breakdown. Which patterns matched, how many points each contributed, and the human-readable reason for every flag. Full transparency. You can also blacklist the user or mark them as trusted, right from the menu.

**Blacklist & Whitelist** — Know someone's a bro? Blacklist them — all their tweets get frosted, no scoring needed. Trust someone? Whitelist them — they'll never get flagged. One-click from any tweet, with an undo toast in case you change your mind.

**Test Mode** — Hit the "Test" button in the popup to frost every tweet on screen. Useful for showing friends. Also just satisfying.

**Theme-Aware** — Works with Twitter's light mode, dim mode, and lights-out mode. The frost looks good in all of them. Yes, we checked.

---

## How It Actually Works

No AI. No backend. No API calls. No data leaves your browser.

BroBlock is pure client-side regex pattern matching. When a tweet appears in your DOM, the extension:

1. **Extracts** the text using multiple DOM strategies (with fallbacks for when Twitter inevitably changes their markup)
2. **Scores** it against 200+ pre-compiled regex patterns across 17 categories, each with a weight from 3 (ambient signal) to 20 (definitional bro)
3. **Applies** a per-category soft cap so one category can't dominate the score, a breadth bonus for hitting multiple categories, and a dampener for analytical/critical language (so people *criticizing* bro culture don't get flagged)
4. **Renders** a frost overlay if the score exceeds your threshold, or a subtle pill if it doesn't

The whole thing runs in ~2ms per tweet. No perceptible lag. Manifest V3. Zero dependencies. No build step.

<details>
<summary>The Platonic Bro Tweet (120/120)</summary>

> *"I was mass-laid-off last year. Almost gave up. Then I built a $50K/month AI SaaS in 2 hours using Cursor. Here are 10 tools that changed my life 🧵*
>
> *Most people don't know this, but you'll be replaced if you're not using AI. While you slept, I was grinding. DM me 'FREE' for my guide — only 3 spots left. This offer closes tonight.*
>
> *Stop scrolling. Save this thread. Your network is your net worth. I escaped the rat race and so can you. The universe rewards action. Bookmark this. Follow me for more."*

**Categories hit**: Income Claims, Fake Vulnerability, AI Bro, Engagement Bait, Fake Authority, Hustle Culture, Disguised Selling, Fake Scarcity, Crypto/Finance Grift, Vague Transformation, Thread Farming, Mindset Bro — **12 of 17 categories**.

This tweet does not exist. But you've seen every sentence in it.

</details>

---

## Privacy

Everything stays on your machine. BroBlock uses `chrome.storage.sync` for your settings (so they follow your Chrome profile) and that's it. No analytics, no tracking, no server, no accounts. Your timeline is your business.

---

## Built by

[@ComfortEagle](https://x.com/ComfortEagle)

Inspired by [BotBlock.ai](https://botblock.ai).

With love for [OpenClaw](https://x.com/OpenClaw), whose excellent content was merely the gateway drug to a timeline full of people who say "let that sink in" unironically.
