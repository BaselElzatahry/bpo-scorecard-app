import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2, X, Check, Sliders, RotateCcw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';
import { EnhancedKPI, SCORING_LOGIC_METADATA, ScoringLogicType } from '../types/config.types';
import { KPIConfigModal } from './config/KPIConfigModal';
import { SaveScorecardModal } from './SaveScorecardModal';
import { scorecardConfigService } from '../services/scorecard-config.service';
import { ScorecardConfig } from '../types';
import { DEFAULT_CONFIG } from '../data/defaults';

interface Props {
    scorecardId: string; // 'new' for new scorecard, or existing ID
    onCancel: () => void;
    onSaved: () => void;
}

export const ScorecardEditorPanel: React.FC<Props> = ({ scorecardId, onCancel, onSaved }) => {
    const [localConfig, setLocalConfig] = useState<ScorecardConfig>(() => {
        if (scorecardId === 'new') {
            return {
                ...DEFAULT_CONFIG,
                id: 'new',
                name: 'New Scorecard',
                description: '',
                department: 'Operations',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true
            };
        } else {
            return scorecardConfigService.getConfig(scorecardId) || DEFAULT_CONFIG;
        }
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [configuringKPIId, setConfiguringKPIId] = useState<string | null>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);

    const configuringKPI = localConfig.kpis.find(k => k.id === configuringKPIId);

    const handleSaveAsScorecard = (details: { name: string; description: string; department: string }) => {
        const savedConfig = {
            ...localConfig,
            id: scorecardId === 'new' ? uuidv4() : scorecardId,
            name: details.name,
            description: details.description,
            department: details.department,
            updatedAt: new Date().toISOString()
        };

        scorecardConfigService.saveConfig(savedConfig);

        // CRITICAL FIX: Reload app config after saving
        // This triggers AppContext to reload from scorecardConfigService
        window.dispatchEvent(new CustomEvent('scorecard-saved'));

        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            onSaved();
        }, 1500);
    };

    const handleReset = () => {
        if (window.confirm('Reset to default configuration? This will discard all changes.')) {
            setLocalConfig({
                ...DEFAULT_CONFIG,
                id: scorecardId,
                name: localConfig.name,
                description: localConfig.description,
                department: localConfig.department,
                version: localConfig.version,
                createdAt: localConfig.createdAt,
                updatedAt: new Date().toISOString(),
                isActive: localConfig.isActive
            });
        }
    };

    const addCategory = () => {
        const newCat = {
            id: uuidv4(),
            label: `New Category ${localConfig.categories.length + 1}`,
            weight: 0
        };
        setLocalConfig({
            ...localConfig,
            categories: [...localConfig.categories, newCat]
        });
        setEditingId(newCat.id);
        setEditValue(newCat.label);
    };

    const deleteCategory = (catId: string) => {
        setLocalConfig({
            ...localConfig,
            categories: localConfig.categories.filter(c => c.id !== catId),
            kpis: localConfig.kpis.filter(k => k.categoryId !== catId)
        });
    };

    const addKPI = (categoryId: string) => {
        const newKPI = {
            id: uuidv4(),
            categoryId,
            label: `New KPI`,
            weight: 0,
            description: '',
            scoringLogic: 'standard' as const,
            labels: { done: 'Total', met: 'Met' }
        };
        setLocalConfig({
            ...localConfig,
            kpis: [...localConfig.kpis, newKPI]
        });
        setEditingId(newKPI.id);
        setEditValue(newKPI.label);
    };

    const deleteKPI = (kpiId: string, categoryId: string) => {
        setLocalConfig({
            ...localConfig,
            kpis: localConfig.kpis.filter(k => k.id !== kpiId)
        });
    };

    const updateKPI = (updatedKPI: EnhancedKPI) => {
        setLocalConfig({
            ...localConfig,
            kpis: localConfig.kpis.map(k => k.id === updatedKPI.id ? updatedKPI : k)
        });
        setConfiguringKPIId(null);
    };

    const startEdit = (id: string, currentValue: string) => {
        setEditingId(id);
        setEditValue(currentValue);
    };

    const saveEdit = () => {
        if (!editValue.trim()) return;

        setLocalConfig({
            ...localConfig,
            categories: localConfig.categories.map(c =>
                c.id === editingId ? { ...c, label: editValue } : c
            ),
            kpis: localConfig.kpis.map(k =>
                k.id === editingId ? { ...k, label: editValue } : k
            )
        });
        setEditingId(null);
    };

    const handleWeightChange = (id: string, newWeight: number, type: 'category' | 'kpi') => {
        if (type === 'category') {
            setLocalConfig({
                ...localConfig,
                categories: localConfig.categories.map(c =>
                    c.id === id ? { ...c, weight: newWeight } : c
                )
            });
        } else {
            setLocalConfig({
                ...localConfig,
                kpis: localConfig.kpis.map(k =>
                    k.id === id ? { ...k, weight: newWeight } : k
                )
            });
        }
    };

    const totalCatWeight = localConfig.categories.reduce((sum, c) => sum + c.weight, 0);
    const isValid = localConfig.categories.every(c => {
        const catKpis = localConfig.kpis.filter(k => k.categoryId === c.id);
        const catKpiWeight = catKpis.reduce((sum, k) => sum + k.weight, 0);
        return catKpiWeight === 100 || catKpis.length === 0;
    }) && totalCatWeight === 100;

    return (
        <div className="space-y-6">
            {/* Header with Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">
                        {scorecardId === 'new' ? 'Create New Scorecard' : 'Edit Scorecard'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure categories, KPIs, and scoring logic
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleReset}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RotateCcw size={18} />
                        Reset Default
                    </button>
                    <button
                        onClick={() => setShowSaveModal(true)}
                        disabled={!isValid}
                        className="px-4 py-2 bg-keeta-primary hover:bg-yellow-300 text-slate-900 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                    >
                        <Save size={18} />
                        Save Scorecard
                    </button>
                    <button
                        onClick={onCancel}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <X size={18} />
                        Cancel
                    </button>
                </div>
            </div>

            {/* Success Message */}
            {showSuccess && (
                <div className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in">
                    <Check size={18} /> Scorecard saved successfully!
                </div>
            )}

            {/* Validation Warning */}
            {!isValid && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-bold">
                    ⚠️ Weights must sum to 100% for categories and KPIs within each category. Please adjust before saving.
                </div>
            )}

            {/* Categories & KPIs */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Total category weight: <span className={totalCatWeight === 100 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{totalCatWeight}%</span>
                    </p>
                    <button onClick={addCategory} className="btn-secondary flex items-center gap-2">
                        <Plus size={18} /> Add Category
                    </button>
                </div>

                {localConfig.categories.map((cat) => {
                    const catKpis = localConfig.kpis.filter((k) => k.categoryId === cat.id);
                    const catKpiWeight = catKpis.reduce((sum, k) => sum + k.weight, 0);

                    return (
                        <div key={cat.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                {editingId === cat.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 px-3 py-2 border-2 border-keeta-primary rounded-lg text-sm font-bold"
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                            onBlur={() => setEditingId(null)}
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-lg font-bold text-slate-900">{cat.label}</h4>
                                        <button onClick={() => startEdit(cat.id, cat.label)} className="text-slate-300 hover:text-keeta-primary">
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        className="w-16 bg-slate-100 border-none rounded-md py-1 px-2 text-sm text-center font-bold focus:ring-2 focus:ring-keeta-primary"
                                        value={cat.weight}
                                        onChange={(e) => handleWeightChange(cat.id, Number(e.target.value), 'category')}
                                    />
                                    <span className="text-sm text-slate-400">%</span>
                                    <button onClick={() => deleteCategory(cat.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* KPIs */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        KPIs ({catKpis.length}) - Weight: <span className={catKpiWeight === 100 ? 'text-green-600' : 'text-red-600'}>{catKpiWeight}%</span>
                                    </p>
                                    <button onClick={() => addKPI(cat.id)} className="text-xs font-bold text-keeta-primary hover:underline flex items-center gap-1">
                                        <Plus size={12} /> Add KPI
                                    </button>
                                </div>

                                {catKpis.map((kpi) => {
                                    const enhancedKPI = kpi as EnhancedKPI;
                                    const logicType = (enhancedKPI.scoringConfig?.type || enhancedKPI.scoringLogic || 'standard') as ScoringLogicType;
                                    const logicMeta = SCORING_LOGIC_METADATA[logicType];

                                    return (
                                        <div key={kpi.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group">
                                            <div className="flex-1">
                                                {editingId === kpi.id ? (
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-full px-3 py-2 border-2 border-keeta-primary rounded-lg text-sm font-bold"
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                                        onBlur={() => setEditingId(null)}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-700">{kpi.label}</span>
                                                            <button onClick={() => startEdit(kpi.id, kpi.label)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-keeta-primary">
                                                                <Edit2 size={12} />
                                                            </button>
                                                        </div>
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="px-2 py-0.5 bg-keeta-primary/10 border border-keeta-primary/20 rounded text-xs font-bold text-keeta-primary">
                                                                {logicMeta.label}
                                                            </span>
                                                            <button
                                                                onClick={() => setConfiguringKPIId(kpi.id)}
                                                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-bold text-slate-600 flex items-center gap-1"
                                                            >
                                                                <Sliders size={12} />
                                                                Configure
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <input
                                                    type="number"
                                                    className="w-14 bg-slate-100 border-none rounded-md py-1 px-2 text-xs text-center font-bold focus:ring-2 focus:ring-keeta-primary"
                                                    value={kpi.weight}
                                                    onChange={e => handleWeightChange(kpi.id, Number(e.target.value), 'kpi')}
                                                />
                                                <span className="text-xs text-slate-400">%</span>
                                            </div>
                                            <button onClick={() => deleteKPI(kpi.id, cat.id)} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* KPI Configuration Modal */}
            {configuringKPI && (
                <KPIConfigModal
                    kpi={configuringKPI as EnhancedKPI}
                    onSave={updateKPI}
                    onCancel={() => setConfiguringKPIId(null)}
                />
            )}

            <SaveScorecardModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={handleSaveAsScorecard}
                existingConfig={scorecardId !== 'new' ? localConfig : undefined}
            />
        </div>
    );
};
