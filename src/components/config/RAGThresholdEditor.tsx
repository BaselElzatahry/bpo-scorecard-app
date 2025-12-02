import React from 'react';
import { Palette } from 'lucide-react';
import clsx from 'clsx';
import { RAGThresholds, DEFAULT_RAG_THRESHOLDS } from '../../types/config.types';

interface Props {
    thresholds?: RAGThresholds;
    onChange: (thresholds: RAGThresholds) => void;
    showGlobalOption?: boolean;
    applyGlobally?: boolean;
    onApplyGloballyChange?: (apply: boolean) => void;
    className?: string;
}

export const RAGThresholdEditor: React.FC<Props> = ({
    thresholds = DEFAULT_RAG_THRESHOLDS,
    onChange,
    showGlobalOption = false,
    applyGlobally = false,
    onApplyGloballyChange,
    className
}) => {
    return (
        <div className={clsx("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center gap-2">
                <Palette size={18} className="text-keeta-primary" />
                <div>
                    <h4 className="text-sm font-bold text-slate-900">RAG Thresholds</h4>
                    <p className="text-xs text-slate-500">Define score ranges for Red/Amber/Green status</p>
                </div>
            </div>

            {/* Threshold Inputs */}
            <div className="space-y-3">
                {/* Green Threshold */}
                <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>🟢 Green Threshold</span>
                        <span className="text-green-600 text-base tabular-nums">{thresholds.green}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={thresholds.green}
                        onChange={(e) => onChange({ ...thresholds, green: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #22c55e 0%, #22c55e ${thresholds.green}%, #e2e8f0 ${thresholds.green}%, #e2e8f0 100%)`
                        }}
                    />
                    <div className="text-xs text-slate-500 mt-1">
                        Scores ≥ {thresholds.green}% show as Green
                    </div>
                </div>

                {/* Amber Threshold */}
                <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>🟠 Amber Threshold</span>
                        <span className="text-amber-600 text-base tabular-nums">{thresholds.amber}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={thresholds.amber}
                        onChange={(e) => onChange({ ...thresholds, amber: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${thresholds.amber}%, #e2e8f0 ${thresholds.amber}%, #e2e8f0 100%)`
                        }}
                    />
                    <div className="text-xs text-slate-500 mt-1">
                        Scores {thresholds.amber}% - {thresholds.green - 1}% show as Amber
                    </div>
                </div>

                {/* Red (implied) */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-slate-700">🔴 Red (Below Amber)</div>
                            <div className="text-xs text-slate-500">Scores &lt; {thresholds.amber}% show as Red</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Representation */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Visual Preview</div>
                <div className="relative h-8 rounded-lg overflow-hidden flex">
                    <div
                        className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                        style={{ width: `${thresholds.amber}%` }}
                    >
                        {thresholds.amber > 15 && 'Red'}
                    </div>
                    <div
                        className="bg-amber-500 flex items-center justify-center text-white text-xs font-bold"
                        style={{ width: `${thresholds.green - thresholds.amber}%` }}
                    >
                        {(thresholds.green - thresholds.amber) > 10 && 'Amber'}
                    </div>
                    <div
                        className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                        style={{ width: `${100 - thresholds.green}%` }}
                    >
                        {(100 - thresholds.green) > 10 && 'Green'}
                    </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                    <span>0%</span>
                    <span>{thresholds.amber}%</span>
                    <span>{thresholds.green}%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Global Option */}
            {showGlobalOption && onApplyGloballyChange && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={applyGlobally}
                            onChange={(e) => onApplyGloballyChange(e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-keeta-primary rounded border-amber-300 focus:ring-keeta-primary"
                        />
                        <div>
                            <div className="text-xs font-bold text-amber-900">Apply Globally to All KPIs</div>
                            <div className="text-xs text-amber-700 mt-0.5">
                                Override individual KPI thresholds with these global settings
                            </div>
                        </div>
                    </label>
                </div>
            )}

            {/* Validation Warning */}
            {thresholds.amber >= thresholds.green && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-xs font-bold text-red-900">
                        ⚠️ Warning: Green threshold must be higher than Amber threshold
                    </div>
                </div>
            )}
        </div>
    );
};
