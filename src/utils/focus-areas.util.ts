import { CategoryScoreResult } from '../types';

/**
 * Focus Areas & Top Pillars Utility
 * Provides reusable logic for identifying performance focus areas and top performers
 */

/**
 * Identify focus areas (categories needing attention)
 * Logic:
 * - If 2+ pillars < 100%: return lowest 2
 * - If 1 pillar < 100%: return that 1
 * - If all pillars = 100%: return empty array (no focus areas)
 */
export function identifyFocusAreas(categoryScores: CategoryScoreResult[]): CategoryScoreResult[] {
    // Find all pillars < 100%
    const below100 = categoryScores.filter(c => c.score < 100).sort((a, b) => a.score - b.score);

    // Return based on count
    if (below100.length >= 2) {
        return below100.slice(0, 2); // Lowest 2
    }
    if (below100.length === 1) {
        return below100; // Only 1
    }
    return []; // No focus areas - all at 100%
}

/**
 * Identify top pillars (categories performing excellently)
 * Logic:
 * - Only pillars with score > 90% qualify as "top performers"
 * - Return top 2 if multiple qualify
 * - Return fewer if less than 2 qualify
 */
export function identifyTopPillars(categoryScores: CategoryScoreResult[]): CategoryScoreResult[] {
    // Only pillars > 90% qualify
    const topPerformers = categoryScores
        .filter(c => c.score > 90)
        .sort((a, b) => b.score - a.score);

    return topPerformers.slice(0, 2); // Top 2 if any
}

/**
 * Get focus area message
 * Returns a human-readable message for the focus areas panel
 */
export function getFocusAreaMessage(focusAreas: CategoryScoreResult[]): string | null {
    if (focusAreas.length === 0) {
        return "No focus areas this period — all pillars achieved 100%!";
    }
    return null; // Normal case - show the focus areas
}

/**
 * Get top pillars message
 * Returns a human-readable message for the top pillars panel
 */
export function getTopPillarsMessage(topPillars: CategoryScoreResult[]): string | null {
    if (topPillars.length === 0) {
        return "No categories scored above 90% this period";
    }
    return null; // Normal case - show the top pillars
}
