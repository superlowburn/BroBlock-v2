# BroBlock V2 — Codebase Bug Analysis & Fixes

## Context
Full audit of the BroBlock V2 codebase, focused on UI logic and trigger mechanisms. All bugs below are confirmed by reading the source.

---

## Confirmed Bugs (by priority)

### 1. Compound bonus counts zeroed (interested) categories — `src/content/scorer.js:103-106`
**Impact:** Inflated scores when user has marked categories as "interested"

The `applyInterests()` function zeros points for interested categories, but the compound bonus still counts them:
```js
if (adjusted.length >= 3) {            // counts ALL categories
  total += (adjusted.length - 2) * 8;  // including zeroed ones
}
```
If a tweet hits 3 categories and 1 is interested, only 2 score — but the bonus fires as if 3 do.

**Fix:** Count only non-interested categories for the compound bonus.

---

### 2. `cleanArticle()` only removes first match per selector — `src/content/cleanup.js:17`
**Impact:** Duplicate BroBlock elements left behind after cleanup

`querySelector()` returns only the first match. If race conditions cause duplicate `.bb-frost-backdrop` or `.bb-pill-host` elements in an article, extras persist.

**Fix:** Use `querySelectorAll()` with a loop.

---

### 3. Shadow DOM focus trap broken — `src/content/ui.js:371-374`
**Impact:** Keyboard Tab-wrapping in menu doesn't work

`document.activeElement` inside a shadow DOM returns the shadow host, never the focused button. The comparisons `document.activeElement === first` / `=== last` always fail.

**Fix:** Use `menuRoot.activeElement` instead of `document.activeElement`.

---

### 4. `aria-expanded` never set to `"true"` — `src/content/ui.js:149` & `toggleMenu()`
**Impact:** Screen readers can't tell when the menu is open

`renderPill` sets `aria-expanded="false"` at line 149, but `toggleMenu()` never updates it to `"true"`. And `dismissMenu()` queries for `aria-expanded="true"` pills to reset (line 391) — which finds nothing because it was never set.

**Fix:** Set `pill.setAttribute("aria-expanded", "true")` at the start of `toggleMenu()`.

---

### 5. Non-atomic storage writes in `doBlacklist` / `doWhitelist` — `src/content/ui.js:481-492, 527-538`
**Impact:** Race condition between list update and threshold update

Both functions do two separate `get+set` pairs (one for lists, one for threshold). Another tab or the popup could interleave, causing lost updates.

**Fix:** Merge into a single `chrome.storage.sync.get` that reads all keys, then one `set` that writes them all.

---

### 6. `doWhitelist` missing explicit rescan — `src/content/ui.js:519-538`
**Impact:** After trusting a user, their frosted tweets don't unfrost until storage change propagates (~100ms+ delay)

`doBlacklist` calls `BroBlockObserver.rescan(state)` immediately (line 495), but `doWhitelist` doesn't. The rescan eventually happens via the `chrome.storage.onChanged` listener, but there's a visible lag.

**Fix:** Add `BroBlockObserver.rescan(state)` at the end of `doWhitelist`, plus an undo toast (matching `doBlacklist` pattern).

---

### 7. Theme MutationObserver never disconnected — `src/content/index.js:39`
**Impact:** Keeps running when extension is disabled

The theme observer is created at load but never stored or stopped. When the extension is disabled (line 77), `BroBlockObserver.stop()` is called but the theme observer keeps firing `applyTheme()` on every body style/class change.

**Fix:** Store the observer ref and disconnect it when `enabled` becomes `false`.

---

### 8. Dead variable `activeState` — `src/content/observer.js:16, 20`
**Impact:** None (code smell). Set on line 20, never read.

**Fix:** Remove both lines.

---

### 9. Dead variable `isReply` — `src/content/scorer.js:62`
**Impact:** None (dead code). Extracted but never used in scoring.

**Fix:** Remove the line (or implement reply dampening if desired).

---

### 10. Document-level Escape listener never removed — `src/content/ui.js:401-403`
**Impact:** Minor — runs on every keydown even when extension is disabled.

The listener fires `dismissMenu()` on Escape if `menuHost` exists. Since this is inside the IIFE it doesn't accumulate, but it does run unconditionally.

**Fix:** Low priority. Could gate on `state.enabled` or remove/re-add with the observer.

---

## Files to modify
- `src/content/scorer.js` — bugs #1, #9
- `src/content/cleanup.js` — bug #2
- `src/content/ui.js` — bugs #3, #4, #5, #6, #10
- `src/content/index.js` — bug #7
- `src/content/observer.js` — bug #8

## Verification
After each fix:
1. `node --check` on every modified file (syntax validation)
2. Load unpacked in `chrome://extensions/` and navigate to x.com
3. Manual testing:
   - Verify frost/unfrost cycle works (pill click -> menu -> actions)
   - Trust a user -> confirm tweet unfreezes immediately (bug #6)
   - Mark a category as interested -> confirm score recalculates correctly (bug #1)
   - Tab through menu items with keyboard -> confirm focus wraps (bug #3)
   - Open menu and inspect `aria-expanded` attribute in DevTools (bug #4)
   - Open two tabs, blacklist in one -> confirm no data corruption (bug #5)
