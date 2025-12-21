import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateScores } from '../../utils/scoring';
import { BarChart3, Award } from 'lucide-react';
import clsx from 'clsx';
import { scorecardConfigService } from '../../services/scorecard-config.service';

export const VendorComparisonPanel: React.FC = () => {
    // USE GLOBAL CONTEXT for config
    const { audits, vendors, activeScorecardId } = useApp();
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');

    // Derived config object from GLOBAL context
    // We can fetch details if needed, or just use ID
    const activeConfigs = React.useMemo(() => scorecardConfigService.getActiveConfigs(), []);
    const selectedConfig = React.useMemo(() => {
        return activeConfigs.find(c => c.id === activeScorecardId) || activeConfigs[0];
    }, [activeConfigs, activeScorecardId]);

    // Generate last 12 months + current month
    const availablePeriods = useMemo(() => {
        const periods: string[] = [];
        const today = new Date();

        // Last 12 months including current month
        for (let i = 12; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const period = d.toISOString().slice(0, 7); // YYYY-MM
            periods.push(period);
        }

        // Next month (optional, currently only 1 month)
        for (let i = 1; i <= 1; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const period = d.toISOString().slice(0, 7); // YYYY-MM
            periods.push(period);
        }

        return periods;
    }, []);

    // Set initial period to current month
    React.useEffect(() => {
        if (!selectedPeriod && availablePeriods.length > 0) {
            // Last element = current month
            setSelectedPeriod(availablePeriods[12]); // index 12 = current month in the first loop
        }
    }, [availablePeriods, selectedPeriod]);


    // Calculate scores for all vendors for selected period
    const vendorScores = useMemo(() => {
        if (!selectedPeriod) return [];

        return vendors.map(vendor => {
            // Fix: Handle potential hyphen in vendor ID by constructing key carefully
            // Multi-model support: keys are vendor-period-configId
            // If selectedConfigId is present, we look for that specific audit.
            // If it's a legacy audit, it might be just vendor-period (implicitly mapped to default config if set)

            let vendorAudits = [];

            if (activeScorecardId) {
                const compositeKey = `${vendor.id}-${selectedPeriod}-${activeScorecardId}`;
                vendorAudits = audits[compositeKey] || [];

                // STRICT SCOPING: Do NOT fallback to legacy keys if we are in a specific model context.
                // This ensures clean separation.
            } else {
                // Fallback only if no active model (shouldn't happen with new selector logic)
                vendorAudits = audits[`${vendor.id}-${selectedPeriod}`] || [];
            }

            if (vendorAudits.length === 0) {
                return {
                    vendor,
                    score: null,
                    categoryScores: {} as Record<string, any>,
                    hasData: false,
                    rag: 'red' as const
                };
            }

            // Calculate using the SELECTED config
            const results = calculateScores(
                vendorAudits,
                selectedConfig.categories,
                selectedConfig.kpis,
                vendor.id,
                selectedPeriod
            );

            return {
                vendor,
                score: results.score,
                categoryScores: results.categoryScores,
                hasData: true,
                rag: results.rag
            };
        }).sort((a, b) => (b.score || 0) - (a.score || 0));
    }, [vendors, audits, selectedConfig, selectedPeriod, activeScorecardId]);

    // Calculate statistics
    const stats = useMemo(() => {
        const activeVendors = vendorScores.filter(v => v.hasData);
        if (activeVendors.length === 0) return null;

        const scores = activeVendors.map(v => v.score!);
        const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);

        return { avg, max, min, count: activeVendors.length };
    }, [vendorScores]);

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        if (rank === 2) return 'text-slate-400 bg-slate-50 border-slate-200';
        if (rank === 3) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-slate-600 bg-white border-slate-200';
    };

    return (
        <div className="space-y-6 pb-12 animate-in fade-in">
            {/* Selectors */}
            <div className="flex justify-end gap-3">
                {/* Global Context Active - No local selector needed */}

                <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-700 backdrop-blur-sm">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Period</label>
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="bg-transparent font-bold text-white text-sm focus:outline-none cursor-pointer [&>option]:text-slate-900 min-w-[150px]"
                    >
                        {availablePeriods.map(period => (
                            <option key={period} value={period} className="text-slate-900">
                                {new Date(period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2">Vendors Compared</div>
                        <div className="text-4xl font-black text-slate-900">{stats.count}</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-green-200">
                        <div className="text-xs font-bold text-green-600 uppercase mb-2">Highest Score</div>
                        <div className="text-4xl font-black text-green-600">{Math.round(stats.max)}%</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-blue-200">
                        <div className="text-xs font-bold text-blue-600 uppercase mb-2">Average Score</div>
                        <div className="text-4xl font-black text-blue-600">{Math.round(stats.avg)}%</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-red-200">
                        <div className="text-xs font-bold text-red-600 uppercase mb-2">Lowest Score</div>
                        <div className="text-4xl font-black text-red-600">{Math.round(stats.min)}%</div>
                    </div>
                </div>
            )}

            {/* Live Leaderboard - Now at Top */}
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 size={28} className="text-keeta-primary" />
                    <h3 className="text-2xl font-extrabold text-slate-900">Live Leaderboard</h3>
                </div>

                {/* Vendors List */}
                <div className="flex flex-col gap-4">
                    {vendorScores.slice(0, 10).map((vendorData, idx) => {
                        const rank = idx + 1;
                        const maxScore = vendorScores[0]?.score || 100;
                        const barWidth = vendorData.score ? (vendorData.score / maxScore) * 100 : 0;

                        // Enhanced RAG background for cards
                        const ragCardBg = vendorData.rag === 'green'
                            ? 'bg-gradient-to-br from-green-50 to-green-100/40'
                            : vendorData.rag === 'amber'
                                ? 'bg-gradient-to-br from-amber-50 to-amber-100/40'
                                : 'bg-gradient-to-br from-red-50 to-red-100/40';

                        return (
                            <div
                                key={vendorData.vendor.id}
                                className={clsx(
                                    "group rounded-xl p-4 flex flex-col gap-2 shadow-md hover:shadow-xl transition-all cursor-pointer border-2",
                                    ragCardBg,
                                    vendorData.rag === 'green' ? 'border-green-200 hover:border-green-300' :
                                        vendorData.rag === 'amber' ? 'border-amber-200 hover:border-amber-300' :
                                            'border-red-200 hover:border-red-300'
                                )}
                            >
                                {/* Vendor Info */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* Vendor Color Indicator */}
                                        {vendorData.vendor.color && (
                                            <div
                                                className="flex-shrink-0 w-1 h-8 rounded-full"
                                                style={{ backgroundColor: vendorData.vendor.color }}
                                            />
                                        )}
                                        <span
                                            className={clsx(
                                                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                                rank === 1
                                                    ? 'bg-yellow-400 text-slate-900'
                                                    : rank === 2
                                                        ? 'bg-slate-400 text-white'
                                                        : rank === 3
                                                            ? 'bg-orange-400 text-white'
                                                            : 'bg-slate-300 text-slate-700'
                                            )}
                                        >
                                            {rank}
                                        </span>
                                        <span className="text-md font-semibold text-slate-900 truncate group-hover:text-keeta-primary transition-colors">
                                            {vendorData.vendor.name}
                                        </span>
                                    </div>
                                    <span className="text-md font-extrabold text-keeta-primary ml-2">
                                        {Math.round(vendorData.score!)}%
                                    </span>
                                </div>

                                {/* Score Bar */}
                                <div className="relative h-5 bg-white/50 rounded-full overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                    <div
                                        className={clsx(
                                            "h-full rounded-full transition-all duration-1000 ease-out",
                                            vendorData.rag === 'green'
                                                ? 'bg-gradient-to-r from-green-400 to-green-600'
                                                : vendorData.rag === 'amber'
                                                    ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                                                    : 'bg-gradient-to-r from-red-400 to-red-600'
                                        )}
                                        style={{ width: `${barWidth}%` }}
                                    />
                                    {/* Hover overlay */}
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {Math.round(vendorData.score!)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>


            {/* Detailed Rankings - 2 Column Layout */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h2 className="text-2xl font-black text-slate-900 mb-6">Detailed Rankings</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vendorScores.map((vendorData, idx) => {
                        const rank = idx + 1;
                        const scoreVsAvg = vendorData.score! - (stats?.avg || 0);

                        // Enhanced RAG background with higher opacity
                        const ragBg = vendorData.rag === 'green'
                            ? 'bg-gradient-to-br from-green-50/70 via-green-100/50 to-green-50/30'
                            : vendorData.rag === 'amber'
                                ? 'bg-gradient-to-br from-amber-50/70 via-amber-100/50 to-amber-50/30'
                                : 'bg-gradient-to-br from-red-50/70 via-red-100/50 to-red-50/30';

                        const borderColor = vendorData.rag === 'green'
                            ? 'border-green-300'
                            : vendorData.rag === 'amber'
                                ? 'border-amber-300'
                                : 'border-red-300';

                        return (
                            <div
                                key={vendorData.vendor.id}
                                className={clsx(
                                    "border-2 rounded-2xl p-5 transition-all hover:shadow-lg relative overflow-hidden",
                                    ragBg,
                                    rank <= 3 ? getRankColor(rank) : borderColor
                                )}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        {/* Vendor Color Bar */}
                                        {vendorData.vendor.color && (
                                            <div
                                                className="w-1.5 h-16 rounded-full absolute left-0 top-1/2 transform -translate-y-1/2"
                                                style={{ backgroundColor: vendorData.vendor.color }}
                                            />
                                        )}

                                        {/* Rank Badge */}
                                        <div className={clsx(
                                            "w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black border-2",
                                            rank === 1 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                                rank === 2 ? 'bg-slate-100 text-slate-600 border-slate-300' :
                                                    rank === 3 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                                        'bg-slate-50 text-slate-500 border-slate-200'
                                        )}>
                                            {rank}
                                        </div>

                                        {/* Vendor Info */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-black text-slate-900">{vendorData.vendor.name}</h3>
                                                {rank === 1 && <Award size={20} className="text-yellow-600" />}
                                            </div>
                                            <div className="text-sm text-slate-600 mt-1">
                                                {scoreVsAvg > 0 ? (
                                                    <span className="text-green-600 font-bold">
                                                        +{scoreVsAvg.toFixed(1)}% above average
                                                    </span>
                                                ) : scoreVsAvg < 0 ? (
                                                    <span className="text-red-600 font-bold">
                                                        {scoreVsAvg.toFixed(1)}% below average
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 font-bold">At average</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Overall Score */}
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Overall Score</div>
                                        <div className={clsx(
                                            "text-4xl font-black",
                                            vendorData.rag === 'green' ? 'text-green-500' :
                                                vendorData.rag === 'amber' ? 'text-amber-500' : 'text-red-500'
                                        )}>
                                            {Math.round(vendorData.score!)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Category Breakdown */}
                                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200">
                                    {selectedConfig.categories.map(category => {
                                        const catScore = vendorData.categoryScores?.[category.id];
                                        const score = catScore?.score || 0;

                                        // Enhanced category RAG background
                                        const catBg = score >= 90
                                            ? 'bg-green-100/60 border border-green-200'
                                            : score >= 80
                                                ? 'bg-amber-100/60 border border-amber-200'
                                                : 'bg-red-100/60 border border-red-200';

                                        return (
                                            <div key={category.id} className={clsx("rounded-lg p-3", catBg)}>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                                                    {category.label}
                                                </div>
                                                <div className={clsx(
                                                    "text-2xl font-black",
                                                    score >= 90 ? 'text-green-600' :
                                                        score >= 80 ? 'text-amber-600' : 'text-red-600'
                                                )}>
                                                    {Math.round(score)}%
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};
