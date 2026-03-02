/**
 * BroBlock V2 — Onboarding Script
 * 3-step welcome flow with sensitivity setup.
 * Loaded after constants.js in onboarding.html.
 */

(() => {
  const $ = (id) => document.getElementById(id);

  let currentStep = 1;

  const steps = [$("step1"), $("step2"), $("step3")];
  const dots = document.querySelectorAll(".dot");
  const sensSlider = $("sensSlider");
  const sensValue = $("sensValue");
  const sensHint = $("sensHint");

  // Step navigation
  function goTo(step) {
    steps[currentStep - 1].classList.remove("active");
    dots[currentStep - 1].classList.remove("active");

    currentStep = step;

    steps[currentStep - 1].classList.add("active");
    dots[currentStep - 1].classList.add("active");
  }

  $("btn1").addEventListener("click", () => goTo(2));
  $("btn2").addEventListener("click", () => goTo(3));

  // Step 3: sensitivity
  sensSlider.addEventListener("input", () => {
    updateSensitivity(parseInt(sensSlider.value, 10));
  });

  function updateSensitivity(sliderVal) {
    const level = BB.getSensitivityLevel(sliderVal);
    sensValue.textContent = level.label;
    sensValue.style.color = level.color;
    sensHint.textContent = level.hint;
  }

  // Initialize display
  updateSensitivity(parseInt(sensSlider.value, 10));

  // Finish onboarding
  $("btn3").addEventListener("click", () => {
    // Slider right (85) = aggressive = low threshold (15)
    const threshold = 100 - parseInt(sensSlider.value, 10);

    chrome.storage.sync.set({
      threshold: threshold,
      onboardingDone: true,
    }, () => {
      window.location.href = "https://x.com/comforteagle/status/2027589656552812546";
    });
  });
})();
