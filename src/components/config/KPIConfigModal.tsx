import React, { useState } from 'react';
import { Sliders, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { EnhancedKPI, ScoringLogicType, ScoringLogicConfig, DEFAULT_RAG_THRESHOLDS } from '../../types/config.types';
import { ScoringLogicSelector } from './ScoringLogicSelector';
import { CustomBandBuilder } from './CustomBandBuilder';
import { FormulaEditor } from './FormulaEditor';
import { RAGThresholdEditor } from './RAGThresholdEditor';
import { LivePreviewPanel } from './LivePreviewPanel';

interface Props {
    kpi: EnhancedKPI;
    onSave: (kpi: EnhancedKPI) => void;
    onCancel: () => void;
}

export const KPIConfigModal: React.FC<Props> = ({ kpi, onSave, onCancel }) => {
    const [workingKPI, setWorkingKPI] = useState<EnhancedKPI>(kpi);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const scoringConfig = workingKPI.scoringConfig || {
        type: (workingKPI.scoringLogic || 'standard') as ScoringLogicType,
        ragThresholds: DEFAULT_RAG_THRESHOLDS
    };

    function updateScoringLogic(type: ScoringLogicType) {
        setWorkingKPI({
            ...workingKPI,
            scoringConfig: {
                ...scoringConfig,
                type,
                // Clear config for previous logic type
                customBands: type === 'custom-bands' ? scoringConfig.customBands : undefined,
                formula: type === 'formula' ? scoringConfig.formula : undefined,
                threshold: type === 'threshold' ? scoringConfig.threshold : undefined
            }
        });
    }

    function updateScoringConfig(updates: Partial<ScoringLogicConfig>) {
        setWorkingKPI({
            ...workingKPI,
            scoringConfig: {
                ...scoringConfig,
                ...updates
            }
        });
    }

    const requiresConfig = scoringConfig.type === 'custom-bands' ||
        scoringConfig.type === 'formula' ||
        scoringConfig.type === 'threshold';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-keeta-primary rounded-lg">
                            <Sliders size={20} className="text-slate-900" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900">Configure Scoring Logic</h2>
                            <p className="text-sm text-slate-500">{workingKPI.label}</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Configuration */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Scoring Logic Selector */}
                            <ScoringLogicSelector
                                value={scoringConfig.type}
                                onChange={updateScoringLogic}
                            />

                            {/* Conditional Configuration Panels */}
                            {scoringConfig.type === 'custom-bands' && (
                                <CustomBandBuilder
                                    config={scoringConfig.customBands}
                                    onChange={(customBands) => updateScoringConfig({ customBands })}
                                />
                            )}

                            {scoringConfig.type === 'formula' && (
                                <FormulaEditor
                                    formula={scoringConfig.formula}
                                    onChange={(formula) => updateScoringConfig({ formula })}
                                />
                            )}

                            {scoringConfig.type === 'threshold' && (
                                <div className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-4">
                                    <h4 className="text-sm font-bold text-slate-900">Threshold Configuration</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Threshold %
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={scoringConfig.threshold?.threshold ?? 80}
                                                onChange={(e) => updateScoringConfig({
                                                    threshold: {
                                                        threshold: Number(e.target.value),
                                                        aboveScore: scoringConfig.threshold?.aboveScore ?? 100,
                                                        belowScore: scoringConfig.threshold?.belowScore ?? 30
                                                    }
                                                })}
                                                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-keeta-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Above Score
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={scoringConfig.threshold?.aboveScore ?? 100}
                                                onChange={(e) => updateScoringConfig({
                                                    threshold: {
                                                        threshold: scoringConfig.threshold?.threshold ?? 80,
                                                        aboveScore: Number(e.target.value),
                                                        belowScore: scoringConfig.threshold?.belowScore ?? 30
                                                    }
                                                })}
                                                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-keeta-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Below Score
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={scoringConfig.threshold?.belowScore ?? 30}
                                                onChange={(e) => updateScoringConfig({
                                                    threshold: {
                                                        threshold: scoringConfig.threshold?.threshold ?? 80,
                                                        aboveScore: scoringConfig.threshold?.aboveScore ?? 100,
                                                        belowScore: Number(e.target.value)
                                                    }
                                                })}
                                                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-keeta-primary focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Advanced Options */}
                            <div>
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-keeta-primary transition-colors"
                                >
                                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    Advanced Options (RAG Thresholds)
                                </button>

                                {showAdvanced && (
                                    <div className="mt-4 border-2 border-slate-200 rounded-xl p-4">
                                        <RAGThresholdEditor
                                            thresholds={scoringConfig.ragThresholds}
                                            onChange={(ragThresholds) => updateScoringConfig({ ragThresholds })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Live Preview */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-6">
                                <LivePreviewPanel
                                    kpi={workingKPI}
                                    scoringConfig={scoringConfig}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(workingKPI)}
                        className="px-6 py-2 bg-keeta-primary hover:bg-yellow-300 text-slate-900 rounded-lg font-bold transition-colors flex items-center gap-2"
                    >
                        <Save size={18} />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
