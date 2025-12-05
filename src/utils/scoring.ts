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

export function calculateScores(
    audits: AuditEntry[],
    categories: Category[],
    kpis: KPI[],
    vendorId: string,
    period: string
): OverallScoreResult {

    // Filter audits for this vendor/period
    const relevantAudits = audits.filter(a => a.vendorId === vendorId && a.period === period);

    const categoryScores: Record<string, any> = {};
    let totalWeightedScore = 0;
    let totalWeightDivisor = 0;

    let overallMet = 0;
    let overallDone = 0;
    let overallMissed = 0;

    categories.forEach(cat => {
        const catKpis = kpis.filter(k => k.categoryId === cat.id);
        const kpiScores: Record<string, ScoreResult> = {};

        let catWeightedScore = 0;
        let catWeightDivisor = 0;
        let catMet = 0;
        let catDone = 0;
        let catMissed = 0;

        catKpis.forEach(kpi => {
            const audit = relevantAudits.find(a => a.kpiId === kpi.id);

            if (audit && audit.auditsDone > 0) {
                // Calculate percentage first
                // Special handling for attrition rate KPI (1.3)
                let percentage: number;
                let score: number;

                if (kpi.id === '1.3') {
                    // CRITICAL FIX: Attrition Rate can have two input modes:
                    // 1. Binary mode (Pass/Fail buttons): auditsDone=1, auditsMet=0 or 1
                    // 2. Numeric mode: actual counts of total started and total dropped

                    const isBinaryInput = audit.auditsDone === 1 && (audit.auditsMet === 0 || audit.auditsMet === 1);

                    if (isBinaryInput) {
                        // Binary Pass/Fail button input
                        // auditsMet=1 means Pass (attrition ≤ 15%) → score 100
                        // auditsMet=0 means Fail (attrition > 15%) → score 0
                        score = audit.auditsMet === 1 ? 100 : 0;
                        percentage = audit.auditsMet === 1 ? 10 : 20; // Representative values for display
                    } else {
                        // Numeric input mode: auditsMet = Total Dropped, auditsDone = Total Started
                        const attritionRate = (audit.auditsMet / audit.auditsDone) * 100;
                        // Binary scoring: 100 if attrition ≤ 15%, 0 otherwise
                        score = attritionRate <= 15 ? 100 : 0;
                        percentage = attritionRate;
                    }
                } else {
                    // Standard calculation for all other KPIs
                    percentage = audit.auditsDone > 0
                        ? (audit.auditsMet / audit.auditsDone) * 100
                        : 0;
                    // Get compliance score using the configured scoring logic
                    score = calculateComplianceScore(percentage, kpi.scoringLogic || 'standard');
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

        const finalCatScore = catWeightDivisor > 0 ? catWeightedScore / catWeightDivisor : 0;

        // Only count category towards overall if it had active KPIs
        if (catWeightDivisor > 0) {
            totalWeightedScore += finalCatScore * cat.weight;
            totalWeightDivisor += cat.weight;
        }

        categoryScores[cat.id] = {
            categoryId: cat.id,
            score: finalCatScore,
            rag: getRagStatus(finalCatScore),
            met: catMet,
            done: catDone,
            missed: catMissed,
            kpiScores
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
