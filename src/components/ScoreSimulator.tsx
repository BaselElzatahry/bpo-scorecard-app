import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateScores } from '../utils/scoring';
import { Calculator, Target, TrendingUp, RotateCcw, Sliders } from 'lucide-react';
import clsx from 'clsx';

interface KpiSimulation {
    kpiId: string;
    originalScore: number;
    simulatedScore: number;
}

export const ScoreSimulator: React.FC = () => {
    const { audits, config, vendors } = useApp();
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');
    const [simulations, setSimulations] = useState<Record<string, number>>({});
    const [targetScore, setTargetScore] = useState<number>(85);

    // Get available periods for selected vendor
    const availablePeriods = useMemo(() => {
        if (!selectedVendor) return [];
        const periods = new Set<string>();
        Object.keys(audits).forEach(key => {
            if (key.startsWith(selectedVendor + '-')) {
                const period = key.split('-')[1];
                if (period) periods.add(period);
            }
        });
        return Array.from(periods).sort().reverse();
    }, [audits, selectedVendor]);

    // Set initial period when vendor changes
    React.useEffect(() => {
        if (availablePeriods.length > 0 && !availablePeriods.includes(selectedPeriod)) {
            setSelectedPeriod(availablePeriods[0]);
            setSimulations({});
        }
    }, [availablePeriods, selectedPeriod]);

    // Calculate current and simulated scores
    const scores = useMemo(() => {
        if (!selectedVendor || !selectedPeriod) return null;

        const key = `${selectedVendor}-${selectedPeriod}`;
        const currentAudits = audits[key] || [];

        if (currentAudits.length === 0) return null;

        // Calculate current scores
        const current = calculateScores(
            currentAudits,
            config.categories,
            config.kpis,
            selectedVendor,
            selectedPeriod
        );

        // Create simulated audits
        const simulatedAudits = currentAudits.map(audit => {
            const sim = simulations[audit.kpiId];
            if (sim === undefined) return audit;

            // Recalculate audit metrics based on simulated score
            const auditsDone = audit.auditsDone || 0;
            if (auditsDone === 0) return audit;

            const auditsMet = Math.round((auditsDone * sim) / 100);
            const auditsMissed = auditsDone - auditsMet;

            return {
                ...audit,
                auditsMet,
                auditsMissed
            };
        });

        // Calculate simulated scores
        const simulated = calculateScores(
            simulatedAudits,
            config.categories,
            config.kpis,
            selectedVendor,
            selectedPeriod
        );

        return { current, simulated };
    }, [selectedVendor, selectedPeriod, audits, config, simulations]);

    const handleKpiChange = (kpiId: string, newScore: number) => {
        setSimulations(prev => ({
            ...prev,
            [kpiId]: Math.max(0, Math.min(100, newScore))
        }));
    };

    const resetSimulation = () => {
        setSimulations({});
    };

    const autoOptimize = () => {
        if (!scores) return;

        const newSimulations: Record<string, number> = {};
        let currentScore = scores.current.score;
        const gap = targetScore - currentScore;

        if (gap <= 0) return; // Already at or above target

        // Simple strategy: boost lowest performing KPIs
        const kpiScores: Array<{ kpiId: string; score: number; weight: number }> = [];

        config.categories.forEach(category => {
            config.kpis.filter(kpi => kpi.categoryId === category.id).forEach(kpi => {
                const catScore = scores.current.categoryScores[category.id];
                const kpiScore = catScore?.kpiScores[kpi.id];
                if (kpiScore) {
                    kpiScores.push({
                        kpiId: kpi.id,
                        score: kpiScore.score,
                        weight: category.weight
                    });
                }
            });
        });

        // Sort by score (lowest first)
        kpiScores.sort((a, b) => a.score - b.score);

        // Boost bottom performers
        const boostAmount = Math.min(20, gap * 2); // Conservative boost
        kpiScores.slice(0, Math.ceil(kpiScores.length / 3)).forEach(kpi => {
            newSimulations[kpi.kpiId] = Math.min(100, kpi.score + boostAmount);
        });

        setSimulations(newSimulations);
    };

    const vendor = vendors.find(v => v.id === selectedVendor);

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-8 text-white">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black mb-2">Score Simulator</h1>
                        <p className="text-white/80">What-if analysis and optimization</p>
                    </div>
                    <Calculator size={48} className="text-white/30" />
                </div>

                {/* Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-bold text-white/80 mb-2 block">Vendor</label>
                        <select
                            value={selectedVendor}
                            onChange={(e) => setSelectedVendor(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold focus:outline-none focus:border-white/40"
                        >
                            <option value="" className="text-slate-900">Select vendor...</option>
                            {vendors.map(vendor => (
                                <option key={vendor.id} value={vendor.id} className="text-slate-900">
                                    {vendor.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-white/80 mb-2 block">Period</label>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            disabled={!selectedVendor}
                            className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold focus:outline-none focus:border-white/40 disabled:opacity-50"
                        >
                            {availablePeriods.map(period => (
                                <option key={period} value={period} className="text-slate-900">
                                    {new Date(period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-white/80 mb-2 block">Target Score</label>
                        <input
                            type="number"
                            value={targetScore}
                            onChange={(e) => setTargetScore(Number(e.target.value))}
                            min="0"
                            max="100"
                            className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold focus:outline-none focus:border-white/40"
                        />
                    </div>
                </div>
            </div>

            {!scores ? (
                <div className="text-center py-12">
                    <Target size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Select a vendor and period to begin simulation</p>
                </div>
            ) : (
                <>
                    {/* Score Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
                            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Current Score</div>
                            <div className="text-5xl font-black text-slate-900">{Math.round(scores.current.score)}%</div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border-2 border-purple-200">
                            <div className="text-xs font-bold text-purple-600 uppercase mb-2">Simulated Score</div>
                            <div className="text-5xl font-black text-purple-600">{Math.round(scores.simulated.score)}%</div>
                            {scores.simulated.score !== scores.current.score && (
                                <div className={clsx(
                                    "text-sm font-bold mt-2",
                                    scores.simulated.score > scores.current.score ? "text-green-600" : "text-red-600"
                                )}>
                                    {scores.simulated.score > scores.current.score ? '+' : ''}
                                    {(scores.simulated.score - scores.current.score).toFixed(1)}%
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl p-6 border-2 border-blue-200">
                            <div className="text-xs font-bold text-blue-600 uppercase mb-2">Target Score</div>
                            <div className="text-5xl font-black text-blue-600">{targetScore}%</div>
                            {scores.simulated.score >= targetScore ? (
                                <div className="text-sm font-bold text-green-600 mt-2">✓ Target achieved!</div>
                            ) : (
                                <div className="text-sm font-bold text-amber-600 mt-2">
                                    Gap: {(targetScore - scores.simulated.score).toFixed(1)}%
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={autoOptimize}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Sliders size={18} />
                            Auto-Optimize to Target
                        </button>
                        <button
                            onClick={resetSimulation}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <RotateCcw size={18} />
                            Reset All
                        </button>
                    </div>

                    {/* KPI Sliders */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                        <h2 className="text-2xl font-black text-slate-900 mb-6">Adjust KPI Scores</h2>

                        <div className="space-y-6">
                            {config.categories.map(category => {
                                const categoryKpis = config.kpis.filter(kpi => kpi.categoryId === category.id);

                                return (
                                    <div key={category.id}>
                                        <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                                            {category.label}
                                            <span className="text-xs font-normal text-slate-500">
                                                Weight: {category.weight}%
                                            </span>
                                        </h3>

                                        <div className="space-y-4">
                                            {categoryKpis.map(kpi => {
                                                const currentKpiScore = scores.current.categoryScores[category.id]?.kpiScores[kpi.id];
                                                const simulatedKpiScore = scores.simulated.categoryScores[category.id]?.kpiScores[kpi.id];
                                                const simValue = simulations[kpi.id] ?? currentKpiScore?.score ?? 0;

                                                return (
                                                    <div key={kpi.id} className="bg-slate-50 rounded-xl p-4">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex-1">
                                                                <div className="font-bold text-slate-900 text-sm">{kpi.label}</div>
                                                                <div className="text-xs text-slate-600 mt-1">{kpi.description}</div>
                                                            </div>
                                                            <div className="text-right ml-4">
                                                                <div className="text-2xl font-black text-purple-600">
                                                                    {Math.round(simulatedKpiScore?.score || 0)}%
                                                                </div>
                                                                {simulatedKpiScore && currentKpiScore && simulatedKpiScore.score !== currentKpiScore.score && (
                                                                    <div className={clsx(
                                                                        "text-xs font-bold",
                                                                        simulatedKpiScore.score > currentKpiScore.score ? "text-green-600" : "text-red-600"
                                                                    )}>
                                                                        {simulatedKpiScore.score > currentKpiScore.score ? '+' : ''}
                                                                        {(simulatedKpiScore.score - currentKpiScore.score).toFixed(1)}%
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="100"
                                                                value={simValue}
                                                                onChange={(e) => handleKpiChange(kpi.id, Number(e.target.value))}
                                                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                            />
                                                            <input
                                                                type="number"
                                                                value={Math.round(simValue)}
                                                                onChange={(e) => handleKpiChange(kpi.id, Number(e.target.value))}
                                                                min="0"
                                                                max="100"
                                                                className="w-20 px-3 py-1 border border-slate-300 rounded-lg text-center font-bold text-sm"
                                                            />
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

                    {/* Recommendations */}
                    {scores.simulated.score < targetScore && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                            <div className="flex items-start gap-3">
                                <TrendingUp size={24} className="text-amber-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="text-lg font-black text-amber-900 mb-2">Optimization Suggestions</h3>
                                    <ul className="space-y-2 text-sm text-amber-800">
                                        <li>• Focus on improving KPIs below 70% first for maximum impact</li>
                                        <li>• Evenly distribute improvements across categories for balanced growth</li>
                                        <li>• Prioritize higher-weighted categories for faster overall score increase</li>
                                        <li>• Use "Auto-Optimize" to see one possible path to your target score</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
