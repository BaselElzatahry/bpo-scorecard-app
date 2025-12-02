import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { generateInsights } from '../utils/insights';
import {
    TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
    Target, Lightbulb, ArrowRight, Award, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

interface InsightsPanelProps {
    vendorId: string;
    period: string;
    previousPeriod?: string;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
    vendorId,
    period,
    previousPeriod
}) => {
    const { audits, config, vendors } = useApp();

    const insights = useMemo(() => {
        return generateInsights(
            audits,
            config.categories,
            config.kpis,
            vendorId,
            period,
            previousPeriod,
            vendors
        );
    }, [audits, config, vendorId, period, previousPeriod, vendors]);

    const getTrendIcon = (direction: string) => {
        switch (direction) {
            case 'improving':
                return <TrendingUp size={20} className="text-green-500" />;
            case 'declining':
                return <TrendingDown size={20} className="text-red-500" />;
            default:
                return <Minus size={20} className="text-slate-400" />;
        }
    };

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'excellent':
                return 'text-green-600 bg-green-100 border-green-200';
            case 'good':
                return 'text-blue-600 bg-blue-100 border-blue-200';
            case 'fair':
                return 'text-amber-600 bg-amber-100 border-amber-200';
            default:
                return 'text-red-600 bg-red-100 border-red-200';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-600 text-white';
            case 'high':
                return 'bg-orange-500 text-white';
            case 'medium':
                return 'bg-amber-500 text-white';
            default:
                return 'bg-slate-500 text-white';
        }
    };

    return (
        <div className="space-y-6">
            {/* Overall Health Summary */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-black mb-1">Performance Health</h3>
                        <p className="text-white/60 text-sm">AI-powered insights and analysis</p>
                    </div>
                    <div className={clsx(
                        'px-4 py-2 rounded-xl font-bold text-sm border-2',
                        getHealthColor(insights.summary.overallHealth)
                    )}>
                        {insights.summary.overallHealth.toUpperCase()}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {getTrendIcon(insights.summary.trend.direction)}
                    <div>
                        <div className="font-bold text-white/90 text-sm">
                            {insights.summary.trend.direction === 'improving' && 'Performance Improving'}
                            {insights.summary.trend.direction === 'declining' && 'Performance Declining'}
                            {insights.summary.trend.direction === 'stable' && 'Performance Stable'}
                        </div>
                        <div className="text-white/60 text-xs">
                            {Math.abs(insights.summary.trend.changePercent).toFixed(1)}% change from previous period
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Risks */}
            {insights.summary.topRisks.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border-2 border-red-200">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={20} className="text-red-600" />
                        <h3 className="text-lg font-black text-red-900">Areas Requiring Attention</h3>
                    </div>

                    <div className="space-y-3">
                        {insights.summary.topRisks.slice(0, 3).map((risk, idx) => (
                            <div key={idx} className="bg-red-50 rounded-xl p-4 border border-red-100">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1">
                                        <div className="font-bold text-red-900 text-sm">{risk.kpiName}</div>
                                        <div className="text-xs text-red-700 mt-1">{risk.categoryName}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-red-600">{Math.round(risk.score)}%</div>
                                        <span className={clsx(
                                            'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1',
                                            risk.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-red-200 text-red-800'
                                        )}>
                                            {risk.severity}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-red-800">{risk.reason}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Strengths */}
            {insights.summary.topStrengths.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Award size={20} className="text-green-600" />
                        <h3 className="text-lg font-black text-green-900">Top Performers</h3>
                    </div>

                    <div className="space-y-3">
                        {insights.summary.topStrengths.slice(0, 3).map((strength, idx) => (
                            <div key={idx} className="bg-green-50 rounded-xl p-4 border border-green-100 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-green-900 text-sm">{strength.kpiName}</div>
                                    <div className="text-xs text-green-700 mt-1">{strength.categoryName}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={16} className="text-green-600" />
                                    <div className="text-2xl font-black text-green-600">{Math.round(strength.score)}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Lightbulb size={20} className="text-keeta-primary" />
                        <h3 className="text-lg font-black text-slate-900">Recommendations</h3>
                    </div>

                    <div className="space-y-4">
                        {insights.recommendations.slice(0, 4).map((rec, idx) => (
                            <div key={idx} className="border-l-4 border-keeta-primary pl-4 py-2">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={clsx(
                                                'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                                                getPriorityColor(rec.priority)
                                            )}>
                                                {rec.priority}
                                            </span>
                                            <span className="text-xs text-slate-500 uppercase font-bold">{rec.type}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-sm">{rec.title}</h4>
                                    </div>
                                    <Target size={16} className="text-keeta-primary flex-shrink-0" />
                                </div>
                                <p className="text-xs text-slate-600 mb-2">{rec.description}</p>
                                <p className="text-xs text-slate-500 italic">
                                    <strong>Impact:</strong> {rec.impact}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Vendor Comparison */}
            {insights.vendorComparison && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle size={20} className="text-blue-600" />
                        <h3 className="text-lg font-black text-blue-900">Vendor Ranking</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl p-4 border border-blue-100">
                            <div className="text-xs text-blue-600 font-bold uppercase mb-1">Rank</div>
                            <div className="text-3xl font-black text-blue-900">
                                #{insights.vendorComparison.rank}
                                <span className="text-sm font-normal text-blue-600 ml-2">
                                    of {insights.vendorComparison.totalVendors}
                                </span>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 border border-blue-100">
                            <div className="text-xs text-blue-600 font-bold uppercase mb-1">vs Average</div>
                            <div className={clsx(
                                "text-3xl font-black",
                                insights.vendorComparison.scoreVsAverage > 0 ? 'text-green-600' : 'text-red-600'
                            )}>
                                {insights.vendorComparison.scoreVsAverage > 0 ? '+' : ''}
                                {insights.vendorComparison.scoreVsAverage.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Insights */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-black text-slate-900 mb-4">Category Deep Dive</h3>

                <div className="space-y-3">
                    {insights.categoryInsights.map((catInsight, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4 hover:border-keeta-primary transition-colors">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="font-bold text-slate-900 text-sm">{catInsight.categoryName}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {getTrendIcon(catInsight.trend.direction)}
                                        <span className={clsx(
                                            'text-xs font-bold uppercase px-2 py-0.5 rounded-full',
                                            catInsight.performance === 'excellent' ? 'bg-green-100 text-green-700' :
                                                catInsight.performance === 'good' ? 'bg-blue-100 text-blue-700' :
                                                    catInsight.performance === 'average' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'
                                        )}>
                                            {catInsight.performance}
                                        </span>
                                    </div>
                                </div>
                                <ArrowRight size={16} className="text-slate-400" />
                            </div>

                            {catInsight.keyFindings.length > 0 && (
                                <ul className="space-y-1 mt-2">
                                    {catInsight.keyFindings.map((finding, findingIdx) => (
                                        <li key={findingIdx} className="text-xs text-slate-600 flex items-start gap-2">
                                            <span className="text-keeta-primary">•</span>
                                            <span>{finding}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
