/**
 * Scoring thresholds and configuration constants
 */
export const SCORING_THRESHOLDS = {
    GREEN_MIN: 95,
    AMBER_MIN: 90,
    // Below AMBER_MIN is RED
} as const;

export const SCORE_WEIGHTS = {
    MIN: 0,
    MAX: 100,
} as const;

/**
 * Period configuration
 */
export const PERIOD_CONFIG = {
    PAST_MONTHS: 12,
    FUTURE_MONTHS: 1,
    TOTAL_MONTHS: 13, // 12 past + current
} as const;
