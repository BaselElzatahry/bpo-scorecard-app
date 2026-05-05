import { AuditEntry, Category, KPI, OverallScoreResult, ScoreResult } from "../types";
import {
    ScoringLogicType,
    ScoringLogicConfig,
    RAGThresholds,
    DEFAULT_RAG_THRESHOLDS,
    EnhancedKPI
} from '../types/config.types';
import { evaluateFormula } from './formula-evaluator';

export const RAG_THRESHOLDS = {
    GREEN: 90,
    AMBER: 80,
};

export function getRagColor(score: number, thresholds?: RAGThresholds): string {
    const green = thresholds?.green ?? RAG_THRESHOLDS.GREEN;
    const amber = thresholds?.amber ?? RAG_THRESHOLDS.AMBER;

    if (score >= green) return '#22c55e'; // Green
    if (score >= amber) return '#fbbf24'; // Amber
    return '#ef4444'; // Red
}

export function getRagStatus(score: number, thresholds?: RAGThresholds): 'green' | 'amber' | 'red' {
    const green = thresholds?.green ?? RAG_THRESHOLDS.GREEN;
    const amber = thresholds?.amber ?? RAG_THRESHOLDS.AMBER;

    if (score >= green) return 'green';
    if (score >= amber) return 'amber';
    return 'red';
}

/**
 * Calculate standard scoring bands (existing logic)
 * 0% = 0, 95%+ = 100, 85-94% = 80, 70-84% = 60, 50-69% = 40, 1-49% = 30
 */
function calculateStandardScore(percentage: number): number {
    // Special case: 0% means complete failure
    if (percentage === 0) return 0;

    if (percentage >= 95) return 100;
    if (percentage >= 85) {
        // Linear interpolation: 85% = 80, 95% = 100
        return 80 + ((percentage - 85) / 10) * 20;
    }
    if (percentage >= 70) {
        // Linear interpolation: 70% = 60, 85% = 80
        return 60 + ((percentage - 70) / 15) * 20;
    }
    if (percentage >= 50) {
        // Linear interpolation: 50% = 40, 70% = 60
        return 40 + ((percentage - 50) / 20) * 20;
    }

    // Between 1% and 49% = 30
    return 30;
}

/**
 * Calculate inverse scoring (lower percentage is better)
 * Used for metrics like attrition, defects, etc.
 */
function calculateInverseScore(percentage: number): number {
    // Invert the percentage (100 - percentage) and apply standard logic
    const invertedPercentage = Math.max(0, 100 - percentage);
    return calculateStandardScore(invertedPercentage);
}

/**
 * Calculate threshold-based score
 */
function calculateThresholdScore(percentage: number, config?: ScoringLogicConfig): number {
    if (!config?.threshold) {
        return calculateStandardScore(percentage);
    }

    const { threshold, aboveScore, belowScore } = config.threshold;
    return percentage >= threshold ? aboveScore : belowScore;
}

/**
 * Calculate custom bands score
 */
function calculateCustomBandsScore(percentage: number, config?: ScoringLogicConfig): number {
    if (!config?.customBands?.bands || config.customBands.bands.length === 0) {
        return calculateStandardScore(percentage);
    }

    // Find the matching band
    const band = config.customBands.bands.find(
        b => percentage >= b.minPercentage && percentage <= b.maxPercentage
    );

    return band ? band.score : 0;
}

/**
 * Calculate formula-based score
 */
function calculateFormulaScore(
    percentage: number,
    config?: ScoringLogicConfig,
    context?: { met: number; done: number; missed: number }
): number {
    if (!config?.formula?.expression) {
        return calculateStandardScore(percentage);
    }

    return evaluateFormula(config.formula.expression, {
        percentage,
        met: context?.met ?? 0,
        done: context?.done ?? 0,
        missed: context?.missed ?? 0
    });
}

/**
 * Enhanced compliance score calculation with support for all scoring logic types
 * 
 * @param percentage - Compliance percentage (0-100)
 * @param logicOrKpi - Either a scoring logic string OR an enhanced KPI object
 * @param context - Optional context for formula evaluation
 * @returns Score from 0-100
 */
export function calculateComplianceScore(
    percentage: number,
    logicOrKpi?: 'standard' | 'inverse' | 'binary' | ScoringLogicType | EnhancedKPI | KPI,
    context?: { met?: number; done?: number; missed?: number }
): number {
    // Handle backward compatibility
    let logic: ScoringLogicType = 'standard';
    let config: ScoringLogicConfig | undefined;

    if (typeof logicOrKpi === 'string') {
        // Simple string logic type
        logic = logicOrKpi as ScoringLogicType;
    } else if (logicOrKpi && typeof logicOrKpi === 'object') {
        // Enhanced KPI object
        const kpi = logicOrKpi as EnhancedKPI;

        // Prefer new scoringConfig, fall back to legacy scoringLogic
        if (kpi.scoringConfig) {
            logic = kpi.scoringConfig.type;
            config = kpi.scoringConfig;
        } else if (kpi.scoringLogic) {
            // Legacy support
            logic = kpi.scoringLogic as ScoringLogicType;
        }
    }

    // Execute the appropriate scoring logic
    switch (logic) {
        case 'standard':
            return calculateStandardScore(percentage);

        case 'binary':
            // 100% = 100, anything less = 0
            return percentage >= 100 ? 100 : 0;

        case 'inverse':
            return calculateInverseScore(percentage);

        case 'linear':
            // Direct percentage mapping
            return Math.max(0, Math.min(100, percentage));

        case 'threshold':
            return calculateThresholdScore(percentage, config);

        case 'custom-bands':
            return calculateCustomBandsScore(percentage, config);

        case 'formula':
            return calculateFormulaScore(percentage, config, {
                met: context?.met ?? 0,
                done: context?.done ?? 0,
                missed: context?.missed ?? 0
            });

        default:
            // Default to standard logic
            return calculateStandardScore(percentage);
    }
}

// ============================================================================
// Dynamic Weight Redistribution (Section 5 of GCC Vendor Scorecard V2.0)
// ============================================================================

/**
 * Parse the section tag from a category description.
 * Categories tagged with "section:onboarding" belong to Section 1.
 * Categories tagged with "section:ongoing" belong to Section 2.
 * Untagged categories are treated as standalone (no redistribution).
 */
function getCategorySection(cat: Category): string | null {
    if (!cat.description) return null;
    const match = cat.description.match(/section:(\w+)/);
    return match ? match[1] : null;
}

/**
 * Determine if a category is entirely N/A for a given period.
 * A category is N/A if ALL of its KPIs have an audit entry with isNA=true,
 * OR if the category has no audit entries at all AND at least one KPI has isNA=true.
 * We use the first KPI's NA flag as the category-level NA indicator.
 */
function isCategoryNA(
    catId: string,
    kpis: KPI[],
    relevantAudits: AuditEntry[]
): boolean {
    const catKpis = kpis.filter(k => k.categoryId === catId);
    if (catKpis.length === 0) return false;

    // Check if any audit entry for this category has isNA=true
    const naAudit = relevantAudits.find(a => a.categoryId === catId && a.isNA === true);
    return !!naAudit;
}

/**
 * Apply dynamic weight redistribution rules (Section 5.2 & 5.3):
 *
 * Rule 1 (Pillar-Level NA): If a pillar is NA, redistribute its weight evenly
 *   across remaining applicable pillars within the same section.
 *   Section total weight remains unchanged.
 *
 * Rule 2 (Section-Level NA): If ALL pillars in a section are NA,
 *   remove that section entirely. The remaining section becomes 100%.
 *
 * Returns a map of categoryId → effective weight after redistribution.
 */
function applyDynamicWeightRedistribution(
    categories: Category[],
    kpis: KPI[],
    relevantAudits: AuditEntry[]
): Record<string, number> {
    // Group categories by section
    const sectionMap: Record<string, Category[]> = {};
    const standalone: Category[] = [];

    categories.forEach(cat => {
        const section = getCategorySection(cat);
        if (section) {
            if (!sectionMap[section]) sectionMap[section] = [];
            sectionMap[section].push(cat);
        } else {
            standalone.push(cat);
        }
    });

    const effectiveWeights: Record<string, number> = {};

    // Process each section
    const sectionKeys = Object.keys(sectionMap);
    const sectionTotals: Record<string, number> = {};

    // Calculate original section totals
    sectionKeys.forEach(section => {
        sectionTotals[section] = sectionMap[section].reduce((sum, cat) => sum + cat.weight, 0);
    });

    // Determine which sections are entirely NA
    const sectionIsNA: Record<string, boolean> = {};
    sectionKeys.forEach(section => {
        const allNA = sectionMap[section].every(cat => isCategoryNA(cat.id, kpis, relevantAudits));
        sectionIsNA[section] = allNA;
    });

    // Calculate total weight of non-NA sections
    const activeSections = sectionKeys.filter(s => !sectionIsNA[s]);
    const totalActiveSectionWeight = activeSections.reduce((sum, s) => sum + sectionTotals[s], 0);
    const totalStandaloneWeight = standalone.reduce((sum, cat) => sum + cat.weight, 0);
    const grandTotal = totalActiveSectionWeight + totalStandaloneWeight;

    // Scale factor: if some sections are NA, remaining sections scale up to fill 100%
    const scaleFactor = grandTotal > 0 ? 100 / grandTotal : 1;

    // Apply Rule 1: within each active section, redistribute NA pillar weights
    sectionKeys.forEach(section => {
        if (sectionIsNA[section]) {
            // Entire section is NA — zero weight for all pillars
            sectionMap[section].forEach(cat => {
                effectiveWeights[cat.id] = 0;
            });
            return;
        }

        const sectionCats = sectionMap[section];
        const applicableCats = sectionCats.filter(cat => !isCategoryNA(cat.id, kpis, relevantAudits));
        const naCats = sectionCats.filter(cat => isCategoryNA(cat.id, kpis, relevantAudits));

        if (naCats.length === 0) {
            // No redistribution needed within this section
            sectionCats.forEach(cat => {
                effectiveWeights[cat.id] = cat.weight * scaleFactor;
            });
        } else {
            // Redistribute NA weights evenly across applicable pillars
            const naWeight = naCats.reduce((sum, cat) => sum + cat.weight, 0);
            const redistributedPerPillar = applicableCats.length > 0 ? naWeight / applicableCats.length : 0;

            naCats.forEach(cat => { effectiveWeights[cat.id] = 0; });
            applicableCats.forEach(cat => {
                effectiveWeights[cat.id] = (cat.weight + redistributedPerPillar) * scaleFactor;
            });
        }
    });

    // Standalone categories (no section tag) keep their original weight, scaled
    standalone.forEach(cat => {
        effectiveWeights[cat.id] = cat.weight * scaleFactor;
    });

    return effectiveWeights;
}

export function calculateScores(
    audits: AuditEntry[],
    categories: Category[],
    kpis: KPI[],
    vendorId: string,
    period: string
): OverallScoreResult {

    // Filter audits for this vendor/period
    const relevantAudits = audits.filter(a => a.vendorId === vendorId && a.period === period);

    // Apply dynamic weight redistribution (handles NA pillars per Section 5 rules)
    const effectiveWeights = applyDynamicWeightRedistribution(categories, kpis, relevantAudits);

    const categoryScores: Record<string, any> = {};
    let totalWeightedScore = 0;
    let totalWeightDivisor = 0;

    let overallMet = 0;
    let overallDone = 0;
    let overallMissed = 0;

    categories.forEach(cat => {
        const catKpis = kpis.filter(k => k.categoryId === cat.id);
        const kpiScores: Record<string, ScoreResult> = {};
        const effectiveWeight = effectiveWeights[cat.id] ?? cat.weight;

        // Check if this entire category is N/A
        const catIsNA = isCategoryNA(cat.id, kpis, relevantAudits);

        let catWeightedScore = 0;
        let catWeightDivisor = 0;
        let catMet = 0;
        let catDone = 0;
        let catMissed = 0;

        catKpis.forEach(kpi => {
            const audit = relevantAudits.find(a => a.kpiId === kpi.id);

            if (audit && !audit.isNA) {
                // Calculate percentage first
                let percentage: number;
                let score: number;

                // Standard calculation:
                // If auditsDone > 0, calculate % met.
                // If auditsDone === 0, score is 100 (Business Rule).
                if (audit.auditsDone === 0) {
                    score = 100;
                    percentage = 0;
                } else {
                    percentage = (audit.auditsMet / audit.auditsDone) * 100;
                    score = calculateComplianceScore(percentage, kpi);
                }

                kpiScores[kpi.id] = {
                    score: score,
                    rag: getRagStatus(score),
                    met: audit.auditsMet,
                    done: audit.auditsDone,
                    missed: audit.auditsMissed
                };

                catWeightedScore += score * kpi.weight;
                catWeightDivisor += kpi.weight;

                catMet += audit.auditsMet;
                catDone += audit.auditsDone;
                catMissed += audit.auditsMissed;
            } else if (audit && audit.isNA) {
                // KPI is explicitly marked N/A
                kpiScores[kpi.id] = {
                    score: -1, // Sentinel: N/A
                    rag: 'green', // N/A doesn't penalise
                    met: 0,
                    done: 0,
                    missed: 0
                };
            } else {
                // Not evaluated
                kpiScores[kpi.id] = {
                    score: 0,
                    rag: 'red',
                    met: 0,
                    done: 0,
                    missed: 0
                };
            }
        });

        const finalCatScore = catIsNA ? -1 : (catWeightDivisor > 0 ? catWeightedScore / catWeightDivisor : 0);

        // Only count category towards overall if it is applicable and had active KPIs
        if (!catIsNA && catWeightDivisor > 0 && effectiveWeight > 0) {
            totalWeightedScore += finalCatScore * effectiveWeight;
            totalWeightDivisor += effectiveWeight;
        }

        categoryScores[cat.id] = {
            categoryId: cat.id,
            score: finalCatScore,
            rag: catIsNA ? 'green' : getRagStatus(finalCatScore),
            met: catMet,
            done: catDone,
            missed: catMissed,
            kpiScores,
            isNA: catIsNA,
            effectiveWeight,
        };

        overallMet += catMet;
        overallDone += catDone;
        overallMissed += catMissed;
    });

    const finalOverallScore = totalWeightDivisor > 0 ? (totalWeightedScore / totalWeightDivisor) : 0;

    return {
        score: finalOverallScore,
        rag: getRagStatus(finalOverallScore),
        met: overallMet,
        done: overallDone,
        missed: overallMissed,
        categoryScores
    };
}

export function calculateAggregatedScores(
    audits: AuditEntry[],
    categories: Category[],
    kpis: KPI[],
    vendorId: string,
    periods: string[]
): OverallScoreResult {
    // 1. Calculate scores for each period individually
    const periodResults = periods.map(period => calculateScores(audits, categories, kpis, vendorId, period));

    // 2. Filter out periods with no data (score 0 and done 0) to avoid skewing averages
    const activeResults = periodResults.filter(r => r.done > 0);

    if (activeResults.length === 0) {
        return {
            score: 0,
            rag: 'red',
            met: 0,
            done: 0,
            missed: 0,
            categoryScores: {}
        };
    }

    // 3. Aggregate results
    // Strategy: Average the scores across periods.
    // Alternative: Sum raw met/done across periods and recalculate.
    // The requirement says "average or weighted-average metrics per category".
    // Averaging the final scores is safer if weights change, but summing raw data is more accurate for "total performance".
    // Let's go with averaging the category scores to respect monthly weighting.

    let totalOverallScore = 0;
    let totalMet = 0;
    let totalDone = 0;
    let totalMissed = 0;

    const aggregatedCategoryScores: Record<string, any> = {};

    // Initialize category accumulators
    categories.forEach(cat => {
        aggregatedCategoryScores[cat.id] = {
            categoryId: cat.id,
            score: 0,
            rag: 'red',
            met: 0,
            done: 0,
            missed: 0,
            kpiScores: {}
        };
    });

    activeResults.forEach(result => {
        totalOverallScore += result.score;
        totalMet += result.met;
        totalDone += result.done;
        totalMissed += result.missed;

        Object.values(result.categoryScores).forEach((catScore: any) => {
            if (aggregatedCategoryScores[catScore.categoryId]) {
                aggregatedCategoryScores[catScore.categoryId].score += catScore.score;
                aggregatedCategoryScores[catScore.categoryId].met += catScore.met;
                aggregatedCategoryScores[catScore.categoryId].done += catScore.done;
                aggregatedCategoryScores[catScore.categoryId].missed += catScore.missed;
            }
        });
    });

    // Average the scores
    const count = activeResults.length;
    const finalOverallScore = totalOverallScore / count;

    Object.keys(aggregatedCategoryScores).forEach(catId => {
        aggregatedCategoryScores[catId].score = aggregatedCategoryScores[catId].score / count;
        aggregatedCategoryScores[catId].rag = getRagStatus(aggregatedCategoryScores[catId].score);
        // met/done/missed are sums, which is fine for display
    });

    return {
        score: finalOverallScore,
        rag: getRagStatus(finalOverallScore),
        met: totalMet,
        done: totalDone,
        missed: totalMissed,
        categoryScores: aggregatedCategoryScores
    };
}
