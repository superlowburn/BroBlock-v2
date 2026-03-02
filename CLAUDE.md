# CLAUDE.md

## What This Is

BroBlock V2 — a Chrome Extension (Manifest V3) that detects and hides bro/hustle/grifter tweets on Twitter/X. Pure client-side, no LLM, no backend.

## Validation Commands

No build step. Validate with:

```bash
node --check src/constants.js
node --check src/background.js
node --check src/detector/categories.js
node --check src/detector/engine.js
node --check src/content/cleanup.js
node --check src/content/extractor.js
node --check src/content/ui.js
node --check src/content/scorer.js
node --check src/content/observer.js
node --check src/content/index.js
node --check src/content/interceptor.js
node --check src/popup.js
node --check src/onboarding.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('manifest.json OK')"
```

To test, load unpacked in `chrome://extensions/` and navigate to x.com.

## Architecture

Modular, no bundler, no dependencies:

- **`src/constants.js`** — `BB` global: schema version, storage keys, defaults, limits, SCORE_MAX (120)
- **`src/background.js`** — Service worker: onInstalled triggers storage init + dedup + onboarding tab
- **`src/detector/categories.js`** — `BroCategories` global: 17 categories, 200+ weighted patterns with reason strings
- **`src/detector/engine.js`** — `BroDetector` global: pre-compiled regex scoring (0-120), returns score + breakdown + reasons + adjustments
- **`src/content/index.js`** — Content script entry (IIFE): state management, boot, settings listener
- **`src/content/observer.js`** — Debounced MutationObserver + IntersectionObserver for offscreen cleanup
- **`src/content/extractor.js`** — Multi-strategy DOM traversal: text, handle, signals, timestamp anchor
- **`src/content/scorer.js`** — Per-article pipeline: extract -> check lists -> score -> render
- **`src/content/ui.js`** — DOM injection: frost layers, inline pills, menu with keyboard nav, actions
- **`src/content/cleanup.js`** — Remove all BroBlock DOM from articles
- **`src/content/interceptor.js`** — MAIN world fetch() patch: extracts user metadata from Twitter GraphQL responses
- **`src/content.css`** — Host-page styles (frost backdrop, inline pill) with `!important`
- **`src/shadow.css`** — Shadow DOM styles (card, floating pill, menu, animations)
- **`src/popup.html` + `src/popup.css` + `src/popup.js`** — Extension popup
- **`src/onboarding.html` + `src/onboarding.css` + `src/onboarding.js`** — First-run welcome

## Storage

- **`chrome.storage.sync`**: `_schemaVersion`, `enabled`, `threshold` (default 40, range 15-85), `knownBros[]`, `trustedUsers[]`, `onboardingDone`
- **`chrome.storage.local`**: `_schemaVersion`, `stats { scanned, flagged, peakScore, categoryCounts }`

## Key Implementation Details

- **Frost overlay**: 3-layer architecture — backdrop div (`backdrop-filter: blur`) in Twitter's DOM, Shadow DOM card + floating pill above it. Backdrop must be in Twitter's DOM for `backdrop-filter` to work.
- **DOM resilience**: Each extractor uses 3 strategies with fallback. If all fail, article is skipped and retried on next mutation.
- **Debounced observer**: 50ms batching window prevents hammering on rapid DOM mutations.
- **Storage atomicity**: Blacklist/trust actions read both lists and write both in a single `set()` call.
- **Content script load order**: Manifest array order matters. Each IIFE exposes a global that later scripts depend on.

## Design

Dark minimal with editorial attitude. Not glassmorphism — solid surfaces, subtle borders, compact cards. Only blur is the frost backdrop (functional). Inter font, tabular-nums for scores, traffic-light severity colors.
