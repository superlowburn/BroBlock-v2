/**
 * BroBlock V2 — Popup Script
 * Toggle, sensitivity, test, reset. Ultra minimal.
 */

(() => {
  const TAGLINES = [
    "6 figures in 3 months (of blocking bros)",
    "While you were sleeping, I was flagging bros",
    "No, I will not DM you",
    "Your timeline, now 90% less bro",
    "Passive income? How about passive blocking",
    "This thread will change your life (it won\u2019t)",
    "I did the research so you don\u2019t have to scroll past it",
  ];

  const $ = (id) => document.getElementById(id);
  const tagline = $("tagline");
  const toggleEnabled = $("toggleEnabled");
  const sensitivitySlider = $("sensitivitySlider");
  const sensitivityValue = $("sensitivityValue");
  const testBtn = $("testBtn");
  const resetBtn = $("resetBtn");

  tagline.textContent = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];

  // ── Load ──

  function loadAll() {
    chrome.storage.sync.get(BB.DEFAULTS.sync, (data) => {
      toggleEnabled.checked = data.enabled;
      updateSlider(data.threshold);
    });
  }

  // ── Toggle ──

  toggleEnabled.addEventListener("change", () => {
    chrome.storage.sync.set({ enabled: toggleEnabled.checked });
  });

  // ── Sensitivity ──

  sensitivitySlider.addEventListener("input", () => {
    updateSliderDisplay(parseInt(sensitivitySlider.value, 10));
  });

  sensitivitySlider.addEventListener("change", () => {
    const threshold = 100 - parseInt(sensitivitySlider.value, 10);
    chrome.storage.sync.set({ threshold: threshold });
  });

  function updateSlider(threshold) {
    sensitivitySlider.value = 100 - threshold;
    updateSliderDisplay(100 - threshold);
  }

  function updateSliderDisplay(sliderVal) {
    const level = BB.getSensitivityLevel(sliderVal);
    sensitivityValue.textContent = level.label;
    sensitivityValue.style.color = level.color;
  }

  // ── Test ──

  testBtn.addEventListener("click", () => {
    testBtn.disabled = true;
    testBtn.textContent = "Frosting\u2026";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        testBtn.textContent = "Open x.com first";
        setTimeout(() => { testBtn.textContent = "Test"; testBtn.disabled = false; }, 2000);
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: "bb-test-frost" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          testBtn.textContent = "Open x.com first";
          setTimeout(() => { testBtn.textContent = "Test"; testBtn.disabled = false; }, 2000);
          return;
        }
        testBtn.textContent = response.count + " frosted";
        setTimeout(() => { testBtn.textContent = "Test"; testBtn.disabled = false; }, 3500);
      });
    });
  });

  // ── Reset ──

  resetBtn.addEventListener("click", () => {
    if (confirm("Reset all settings?")) {
      chrome.storage.sync.set(BB.DEFAULTS.sync);
      chrome.storage.local.set(BB.DEFAULTS.local);
      loadAll();
    }
  });

  // ── Live Updates ──

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      if (changes.enabled) {
        toggleEnabled.checked = changes.enabled.newValue;
      }
      if (changes.threshold) {
        updateSlider(changes.threshold.newValue);
      }
    }
  });

  loadAll();
})();
