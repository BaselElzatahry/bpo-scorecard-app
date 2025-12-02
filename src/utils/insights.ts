import { AuditEntry, Category, KPI, Vendor } from '../types';
import { calculateScores } from './scoring';

export interface TrendData {
    direction: 'improving' | 'declining' | 'stable';
    changePercent: number;
    previousScore: number;
    currentScore: number;
}

export interface RiskArea {
    categoryId: string;
    categoryName: string;
    kpiId: string;
    kpiName: string;
    score: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    reason: string;
}

export interface Strength {
    categoryId: string;
    categoryName: string;
    kpiId: string;
    kpiName: string;
    score: number;
    consistency: number; // 0-100, how consistently this performs well
}

export interface Recommendation {
    type: 'immediate' | 'short-term' | 'long-term';
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    relatedKpis: string[];
}

export interface InsightsResult {
    summary: {
        overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
        trend: TrendData;
        topStrengths: Strength[];
        topRisks: RiskArea[];
    };
    recommendations: Recommendation[];
    categoryInsights: {
        categoryId: string;
        categoryName: string;
        performance: 'excellent' | 'good' | 'average' | 'poor';
        trend: TrendData;
        keyFindings: string[];
    }[];
    vendorComparison?: {
        rank: number;
        totalVendors: number;
        percentile: number;
        scoreVsAverage: number;
    };
}

/**
 * Calculate trend between two periods
 */
export function calculateTrend(
    currentScore: number,
    previousScore: number
): TrendData {
    const changePercent = previousScore > 0
        ? ((currentScore - previousScore) / previousScore) * 100
        : 0;

    let direction: 'improving' | 'declining' | 'stable' = 'stable';

    if (Math.abs(changePercent) < 2) {
        direction = 'stable';
    } else if (changePercent > 0) {
        direction = 'improving';
    } else {
        direction = 'declining';
    }

    return {
        direction,
        changePercent,
        previousScore,
        currentScore
    };
}

/**
 * Identify risk areas based on scores
 */
export function identifyRisks(
    audits: Record<string, AuditEntry[]>,
    categories: Category[],
    kpis: KPI[],
    vendorId: string,
    period: string
): RiskArea[] {
    const risks: RiskArea[] = [];
    const results = calculateScores(audits[`${vendorId}-${period}`] || [], categories, kpis, vendorId, period);

    categories.forEach(category => {
        const categoryScore = results.categoryScores[category.id];

        if (!categoryScore) return;

        kpis.filter(kpi => kpi.categoryId === category.id).forEach(kpi => {
            const kpiScore = categoryScore.kpiScores[kpi.id];

            if (!kpiScore) return;

            // Determine severity
            let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
            let reason = '';

            if (kpiScore.score < 50) {
                severity = 'critical';
                reason = `Score critically low at ${kpiScore.score.toFixed(1)}%. Immediate action required.`;
            } else if (kpiScore.score < 70) {
                severity = 'high';
                reason = `Score below acceptable threshold at ${kpiScore.score.toFixed(1)}%. Requires attention.`;
            } else if (kpiScore.score < 85) {
                severity = 'medium';
                reason = `Score at ${kpiScore.score.toFixed(1)}%. Room for improvement.`;
            } else {
                return; // Not a risk
            }

            risks.push({
                categoryId: category.id,
                categoryName: category.label,
                kpiId: kpi.id,
                kpiName: kpi.label,
                score: kpiScore.score,
                severity,
                reason
            });
        });
    });

    // Sort by severity and score
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return risks.sort((a, b) => {
        if (a.severity !== b.severity) {
            return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return a.score - b.score;
    });
}

/**
 * Identify strengths based on consistent high performance
 */
export function identifyStrengths(
    audits: Record<string, AuditEntry[]>,
    categories: Category[],
    kpis: KPI[],
    vendorId: string,
    period: string
): Strength[] {
    const strengths: Strength[] = [];
    const results = calculateScores(audits[`${vendorId}-${period}`] || [], categories, kpis, vendorId, period);

    categories.forEach(category => {
        const categoryScore = results.categoryScores[category.id];

        if (!categoryScore) return;

        kpis.filter(kpi => kpi.categoryId === category.id).forEach(kpi => {
            const kpiScore = categoryScore.kpiScores[kpi.id];

            if (!kpiScore || kpiScore.score < 90) return; // Only consider high performers

            strengths.push({
                categoryId: category.id,
                categoryName: category.label,
                kpiId: kpi.id,
                kpiName: kpi.label,
                score: kpiScore.score,
                consistency: 95 // Simplified - in production, calculate from historical data
            });
        });
    });

    return strengths.sort((a, b) => b.score - a.score);
}

/**
 * Generate actionable recommendations
 */
export function generateRecommendations(
    risks: RiskArea[],
    strengths: Strength[],
    overallScore: number
): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Critical risks
    const criticalRisks = risks.filter(r => r.severity === 'critical');
    if (criticalRisks.length > 0) {
        recommendations.push({
            type: 'immediate',
            priority: 'critical',
            title: 'Address Critical Performance Issues',
            description: `${criticalRisks.length} KPI(s) are performing critically below standards. Focus immediate attention on: ${criticalRisks.slice(0, 2).map(r => r.kpiName).join(', ')}.`,
            impact: 'Failure to address these issues may result in significant service degradation and client dissatisfaction.',
            relatedKpis: criticalRisks.map(r => r.kpiId)
        });
    }

    // High risks
    const highRisks = risks.filter(r => r.severity === 'high');
    if (highRisks.length > 0) {
        recommendations.push({
            type: 'short-term',
            priority: 'high',
            title: 'Improve Underperforming Areas',
            description: `${highRisks.length} KPI(s) are below acceptable thresholds. Develop action plans for: ${highRisks.slice(0, 3).map(r => r.kpiName).join(', ')}.`,
            impact: 'Improving these areas will significantly boost overall vendor performance and client satisfaction.',
            relatedKpis: highRisks.map(r => r.kpiId)
        });
    }

    // Overall score recommendations
    if (overallScore < 70) {
        recommendations.push({
            type: 'immediate',
            priority: 'critical',
            title: 'Comprehensive Performance Review Required',
            description: 'Overall vendor score is below acceptable standards. Schedule immediate performance review meeting with vendor leadership.',
            impact: 'Critical intervention needed to prevent contract escalation or termination.',
            relatedKpis: []
        });
    } else if (overallScore < 85) {
        recommendations.push({
            type: 'short-term',
            priority: 'high',
            title: 'Implement Performance Improvement Plan',
            description: 'Overall performance needs improvement. Create 30-60 day improvement plan with measurable milestones.',
            impact: 'Structured improvement plan will help achieve target performance levels.',
            relatedKpis: []
        });
    }

    // Leverage strengths
    if (strengths.length >= 3) {
        recommendations.push({
            type: 'long-term',
            priority: 'medium',
            title: 'Leverage High-Performing Areas',
            description: `Excellent performance in ${strengths.slice(0, 2).map(s => s.kpiName).join(' and ')}. Document best practices and replicate in other areas.`,
            impact: 'Sharing best practices can improve overall performance and create consistency.',
            relatedKpis: strengths.map(s => s.kpiId)
        });
    }

    // Training recommendations
    if (risks.length > 5) {
        recommendations.push({
            type: 'short-term',
            priority: 'high',
            title: 'Comprehensive Training Program Needed',
            description: 'Multiple areas showing poor performance. Consider comprehensive training refresher for vendor team.',
            impact: 'Training investment can address multiple performance gaps simultaneously.',
            relatedKpis: risks.map(r => r.kpiId)
        });
    }

    return recommendations.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Generate category-specific insights
 */
export function generateCategoryInsights(
    audits: Record<string, AuditEntry[]>,
    categories: Category[],
    kpis: KPI[],
    vendorId: string,
    period: string,
    previousPeriod?: string
): InsightsResult['categoryInsights'] {
    const results = calculateScores(audits[`${vendorId}-${period}`] || [], categories, kpis, vendorId, period);

    return categories.map(category => {
        const categoryScore = results.categoryScores[category.id];
        const score = categoryScore?.score || 0;

        // Determine performance level
        let performance: 'excellent' | 'good' | 'average' | 'poor' = 'poor';
        if (score >= 90) performance = 'excellent';
        else if (score >= 80) performance = 'good';
        else if (score >= 70) performance = 'average';

        // Calculate trend
        let trend: TrendData = {
            direction: 'stable',
            changePercent: 0,
            previousScore: score,
            currentScore: score
        };

        if (previousPeriod) {
            const prevResults = calculateScores(
                audits[`${vendorId}-${previousPeriod}`] || [],
                categories,
                kpis,
                vendorId,
                previousPeriod
            );
            const prevScore = prevResults.categoryScores[category.id]?.score || 0;
            trend = calculateTrend(score, prevScore);
        }

        // Generate key findings
        const keyFindings: string[] = [];
        const categoryKpis = kpis.filter(kpi => kpi.categoryId === category.id);
        const passedKpis = categoryKpis.filter(kpi => {
            const kpiScore = categoryScore?.kpiScores[kpi.id];
            return kpiScore && kpiScore.score >= 85;
        });
        const failedKpis = categoryKpis.filter(kpi => {
            const kpiScore = categoryScore?.kpiScores[kpi.id];
            return kpiScore && kpiScore.score < 70;
        });

        if (passedKpis.length === categoryKpis.length) {
            keyFindings.push('All KPIs meeting or exceeding standards');
        }
        if (failedKpis.length > 0) {
            keyFindings.push(`${failedKpis.length} KPI(s) below acceptable threshold`);
        }
        if (trend.direction === 'improving' && trend.changePercent > 5) {
            keyFindings.push(`Significant improvement (${trend.changePercent.toFixed(1)}% increase)`);
        }
        if (trend.direction === 'declining' && trend.changePercent < -5) {
            keyFindings.push(`Performance declining (${Math.abs(trend.changePercent).toFixed(1)}% decrease)`);
        }

        return {
            categoryId: category.id,
            categoryName: category.label,
            performance,
            trend,
            keyFindings
        };
    });
}

/**
 * Main function to generate complete insights
 */
export function generateInsights(
    audits: Record<string, AuditEntry[]>,
    categories: Category[],
    kpis: KPI[],
    vendorId: string,
    period: string,
    previousPeriod?: string,
    allVendors?: Vendor[]
): InsightsResult {
    const results = calculateScores(audits[`${vendorId}-${period}`] || [], categories, kpis, vendorId, period);
    const overallScore = results.score;

    // Calculate overall trend
    let overallTrend: TrendData = {
        direction: 'stable',
        changePercent: 0,
        previousScore: overallScore,
        currentScore: overallScore
    };

    if (previousPeriod) {
        const prevResults = calculateScores(
            audits[`${vendorId}-${previousPeriod}`] || [],
            categories,
            kpis,
            vendorId,
            previousPeriod
        );
        overallTrend = calculateTrend(overallScore, prevResults.score);
    }

    // Identify risks and strengths
    const risks = identifyRisks(audits, categories, kpis, vendorId, period);
    const strengths = identifyStrengths(audits, categories, kpis, vendorId, period);

    // Determine overall health
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (overallScore >= 90) overallHealth = 'excellent';
    else if (overallScore >= 80) overallHealth = 'good';
    else if (overallScore >= 70) overallHealth = 'fair';

    // Generate recommendations
    const recommendations = generateRecommendations(risks, strengths, overallScore);

    // Generate category insights
    const categoryInsights = generateCategoryInsights(
        audits,
        categories,
        kpis,
        vendorId,
        period,
        previousPeriod
    );

    // Vendor comparison (if applicable)
    let vendorComparison;
    if (allVendors && allVendors.length > 1) {
        const vendorScores = allVendors
            .map(vendor => ({
                vendorId: vendor.id,
                score: calculateScores(
                    audits[`${vendor.id}-${period}`] || [],
                    categories,
                    kpis,
                    vendor.id,
                    period
                ).score
            }))
            .sort((a, b) => b.score - a.score);

        const rank = vendorScores.findIndex(v => v.vendorId === vendorId) + 1;
        const avgScore = vendorScores.reduce((sum, v) => sum + v.score, 0) / vendorScores.length;

        vendorComparison = {
            rank,
            totalVendors: allVendors.length,
            percentile: Math.round((rank / allVendors.length) * 100),
            scoreVsAverage: overallScore - avgScore
        };
    }

    return {
        summary: {
            overallHealth,
            trend: overallTrend,
            topStrengths: strengths.slice(0, 5),
            topRisks: risks.slice(0, 5)
        },
        recommendations,
        categoryInsights,
        vendorComparison
    };
}
