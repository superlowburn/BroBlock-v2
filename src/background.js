/**
 * BroBlock V2 — Background Service Worker
 * Handles extension install/update events.
 */

importScripts("constants.js");

chrome.runtime.onInstalled.addListener(async (details) => {
  // Initialize storage with defaults if not set
  const syncData = await chrome.storage.sync.get(null);
  if (!syncData._schemaVersion) {
    await chrome.storage.sync.set(BB.DEFAULTS.sync);
  }

  const localData = await chrome.storage.local.get(null);
  if (!localData._schemaVersion) {
    await chrome.storage.local.set(BB.DEFAULTS.local);
  }

  // Dedup lists (trusted wins over knownBros)
  const data = await chrome.storage.sync.get({ knownBros: [], trustedUsers: [] });
  const trusted = [...new Set(data.trustedUsers.map((h) => h.toLowerCase()))];
  const trustedSet = new Set(trusted);
  const bros = [...new Set(data.knownBros.map((h) => h.toLowerCase()))].filter(
    (h) => !trustedSet.has(h)
  );
  await chrome.storage.sync.set({ knownBros: bros, trustedUsers: trusted });

  if (details.reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/onboarding.html"),
      active: true,
    });
  }
});
