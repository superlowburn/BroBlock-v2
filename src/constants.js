/**
 * BroBlock V2 — Shared Constants
 * Schema version, storage keys, defaults, limits.
 * Loaded first in manifest content_scripts array.
 */

/* eslint-disable no-unused-vars */
const BB = (() => {
  const SCHEMA_VERSION = 1;

  const KEYS = {
    SCHEMA_VERSION: "_schemaVersion",
    ENABLED: "enabled",
    THRESHOLD: "threshold",
    KNOWN_BROS: "knownBros",
    TRUSTED_USERS: "trustedUsers",
    ONBOARDING_DONE: "onboardingDone",
  };

  const DEFAULTS = {
    sync: {
      _schemaVersion: SCHEMA_VERSION,
      enabled: true,
      threshold: 40,
      knownBros: [],
      trustedUsers: [],
      interestedCategories: [],
      onboardingDone: false,
    },
    local: {
      _schemaVersion: SCHEMA_VERSION,
    },
  };

  const LIMITS = {
    MAX_LIST_SIZE: 500,
    THRESHOLD_MIN: 15,
    THRESHOLD_MAX: 85,
    THRESHOLD_DEFAULT: 40,
    THRESHOLD_TRUST_STEP: 1,
    THRESHOLD_BRO_STEP: 2,
  };

  const SEVERITY = {
    NONE: "none",
    LOW: "low",
    MODERATE: "moderate",
    HIGH: "high",
    EXTREME: "extreme",
    TRUSTED: "trusted",
    KNOWN_BRO: "knownBro",
  };

  /**
   * Severity based on raw score relative to user's threshold.
   * Above threshold: splits remaining range into 3 equal bands.
   * At default threshold (40), bands are identical to the old fixed system.
   */
  function getSeverity(score, state, threshold) {
    if (state === "trusted") return SEVERITY.TRUSTED;
    if (state === "knownBro") return SEVERITY.KNOWN_BRO;
    if (score === 0) return SEVERITY.NONE;
    const t = threshold || LIMITS.THRESHOLD_DEFAULT;
    if (score < t) return SEVERITY.LOW;
    const pct = (score - t) / Math.max(1, 100 - t);
    if (pct < 0.33) return SEVERITY.MODERATE;
    if (pct < 0.66) return SEVERITY.HIGH;
    return SEVERITY.EXTREME;
  }

  /**
   * Sensitivity level for UI display (popup + onboarding).
   * Colors chosen for white backgrounds.
   */
  function getSensitivityLevel(sliderVal) {
    if (sliderVal >= 79) return { label: "Aggressive", hint: "\u201CMost people aren\u2019t ready to hear this\u201D", color: "#c23838" };
    if (sliderVal >= 66) return { label: "Keen", hint: "\u201CHere are 10 AI tools every developer needs\u201D", color: "#c46830" };
    if (sliderVal >= 51) return { label: "Balanced", hint: "\u201CStop scrolling. I spent 100 hours on this thread \uD83E\uDDF5\u201D", color: "#b8862d" };
    if (sliderVal >= 31) return { label: "Moderate", hint: "\u201CI went from $0 to $50K/month in 90 days\u201D", color: "#4a9e5e" };
    return { label: "Chill", hint: "\u201CDM me FREE for my guide. Only 5 spots left! \uD83D\uDE80\u201D", color: "#2e8b47" };
  }

  return { SCHEMA_VERSION, KEYS, DEFAULTS, LIMITS, SEVERITY, getSeverity, getSensitivityLevel };
})();
