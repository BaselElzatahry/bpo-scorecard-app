import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Info } from 'lucide-react';
import clsx from 'clsx';
import {
    ScoringLogicType,
    ScoringLogicConfig,
    EnhancedKPI,
    SCORING_LOGIC_METADATA,
    DEFAULT_PREVIEW_CASES,
    RAGThresholds
} from '../../types/config.types';
import { calculateComplianceScore, getRagColor, getRagStatus } from '../../utils/scoring';

interface Props {
    kpi?: EnhancedKPI;
    scoringConfig?: ScoringLogicConfig;
    className?: string;
}

export const LivePreviewPanel: React.FC<Props> = ({ kpi, scoringConfig, className }) => {
    const [testPercentage, setTestPercentage] = useState(75);
    const [testMet, setTestMet] = useState(15);
    const [testDone, setTestDone] = useState(20);

    // Auto-calculate test percentage when met/done changes
    useEffect(() => {
        if (testDone > 0) {
            setTestPercentage((testMet / testDone) * 100);
        }
    }, [testMet, testDone]);

    // Calculate score using the current config
    const logicType = scoringConfig?.type || kpi?.scoringConfig?.type || 'standard';
    const config = scoringConfig || kpi?.scoringConfig;

    const calculatedScore = calculateComplianceScore(
        testPercentage,
        config ? { ...kpi, scoringConfig: config } as EnhancedKPI : logicType as any,
        { met: testMet, done: testDone, missed: testDone - testMet }
    );

    const ragStatus = getRagStatus(calculatedScore, config?.ragThresholds);
    const ragColor = getRagColor(calculatedScore, config?.ragThresholds);

    const logicMetadata = SCORING_LOGIC_METADATA[logicType];

    return (
        <div className={clsx("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                <Activity size={20} className="text-keeta-primary" />
                <h3 className="text-lg font-black text-slate-900">Live Preview</h3>
            </div>

            {/* Current Logic Type */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Scoring Logic
                </div>
                <div className="text-sm font-bold text-slate-900">{logicMetadata.label}</div>
                <div className="text-xs text-slate-500 mt-1">{logicMetadata.description}</div>
            </div>

            {/* Interactive Test Controls */}
            <div className=" bg-white rounded-xl p-4 border-2 border-slate-200 space-y-4">
                <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>Test Percentage</span>
                        <span className="text-keeta-primary text-base tabular-nums">{testPercentage.toFixed(1)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={testPercentage}
                        onChange={(e) => setTestPercentage(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                            background: `linear-gradient(to right, #FDDA24 0%, #FDDA24 ${testPercentage}%, #e2e8f0 ${testPercentage}%, #e2e8f0 100%)`
                        }}
                    />
                </div>

                {/* Alternative: Manual Met/Done */}
                {logicType === 'formula' && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                                Met
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={testMet}
                                onChange={(e) => setTestMet(Number(e.target.value))}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-keeta-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                                Done
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={testDone}
                                onChange={(e) => setTestDone(Math.max(testMet, Number(e.target.value)))}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-keeta-primary focus:border-transparent"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Result Display */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-keeta-primary rounded-full blur-[60px] opacity-20"></div>

                <div className="relative z-10">
                    <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
                        Calculated Score
                    </div>
                    <div className="flex items-end gap-4 mb-4">
                        <div className="text-6xl font-black" style={{ color: ragColor }}>
                            {Math.round(calculatedScore)}
                        </div>
                        <div className="text-2xl font-black text-white/40 mb-2">/100</div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div
                            className={clsx(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                ragStatus === 'green' ? "bg-green-500/20 text-green-300" :
                                    ragStatus === 'amber' ? "bg-amber-500/20 text-amber-300" :
                                        "bg-red-500/20 text-red-300"
                            )}
                        >
                            {ragStatus === 'green' ? '🟢 Green' : ragStatus === 'amber' ? '🟠 Amber' : '🔴 Red'}
                        </div>
                        <div className="h-4 w-px bg-white/20"></div>
                        <div className="text-xs text-white/60">
                            {testPercentage.toFixed(1)}% compliance
                        </div>
                    </div>
                </div>
            </div>

            {/* Test Scenarios */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <TrendingUp size={14} />
                    Quick Test Scenarios
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_PREVIEW_CASES.map((testCase) => {
                        const score = calculateComplianceScore(
                            testCase.percentage,
                            config ? { ...kpi, scoringConfig: config } as EnhancedKPI : logicType as any
                        );
                        const color = getRagColor(score, config?.ragThresholds);

                        return (
                            <button
                                key={testCase.percentage}
                                onClick={() => setTestPercentage(testCase.percentage)}
                                className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-keeta-primary rounded-lg transition-all text-left"
                            >
                                <div className="text-xs font-bold text-slate-400">{testCase.percentage}%</div>
                                <div className="text-sm font-black" style={{ color }}>
                                    {Math.round(score)}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Logic Explanation */}
            {logicMetadata.examples && logicMetadata.examples.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                        <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <div>
                            <div className="text-xs font-bold text-blue-900 mb-1">How This Works</div>
                            <div className="text-xs text-blue-700 space-y-0.5">
                                {logicMetadata.examples.map((example, idx) => (
                                    <div key={idx}>• {example}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
