import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Save, Plus, Trash2, Edit2, X, Check, Sliders, Download, Upload, RotateCcw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';
import { EnhancedKPI, SCORING_LOGIC_METADATA, ScoringLogicType } from '../types/config.types';
import { KPIConfigModal } from './config/KPIConfigModal';

export const ConfigPanel: React.FC = () => {
    const { config, saveConfig, resetConfig } = useApp();
    const [localConfig, setLocalConfig] = useState(config);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [configuringKPIId, setConfiguringKPIId] = useState<string | null>(null);

    // --- Helper: Auto-Balance Weights ---
    const rebalanceWeights = (items: { id: string, weight: number }[], targetTotal: number = 100) => {
        if (items.length === 0) return [];
        const equalWeight = Math.floor(targetTotal / items.length);
        let remainder = targetTotal % items.length;

        return items.map(item => {
            let weight = equalWeight;
            if (remainder > 0) {
                weight += 1;
                remainder--;
            }
            return { ...item, weight };
        });
    };

    const handleSave = () => {
        saveConfig(localConfig);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(localConfig, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scorecard-config-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedConfig = JSON.parse(event.target?.result as string);
                        setLocalConfig(importedConfig);
                        alert('Configuration imported successfully!');
                    } catch (error) {
                        alert('Error importing configuration. Please check the file format.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    // --- Category Actions ---
    const addCategory = () => {
        const newId = uuidv4();
        const newCat = { id: newId, label: 'New Category', weight: 0 };
        const updatedCats = [...localConfig.categories, newCat];
        const rebalanced = rebalanceWeights(updatedCats).map((w, i) => ({ ...updatedCats[i], weight: w.weight }));

        setLocalConfig({ ...localConfig, categories: rebalanced });
        setEditingId(newId);
        setEditValue('New Category');
    };

    const deleteCategory = (id: string) => {
        if (!confirm('Are you sure? This will delete all KPIs in this category.')) return;
        const updatedCats = localConfig.categories.filter(c => c.id !== id);
        const rebalanced = rebalanceWeights(updatedCats).map((w, i) => ({ ...updatedCats[i], weight: w.weight }));

        setLocalConfig({
            ...localConfig,
            categories: rebalanced,
            kpis: localConfig.kpis.filter(k => k.categoryId !== id)
        });
    };

    // --- KPI Actions ---
    const addKPI = (categoryId: string) => {
        const newId = uuidv4();
        const newKPI: any = {
            id: newId,
            categoryId,
            label: 'New KPI',
            weight: 0,
            scoringLogic: 'standard'
        };

        const categoryKPIs = [...localConfig.kpis.filter(k => k.categoryId === categoryId), newKPI];
        const otherKPIs = localConfig.kpis.filter(k => k.categoryId !== categoryId);
        const rebalancedKPIs = rebalanceWeights(categoryKPIs).map((w, i) => ({ ...categoryKPIs[i], weight: w.weight }));

        setLocalConfig({ ...localConfig, kpis: [...otherKPIs, ...rebalancedKPIs] });
        setEditingId(newId);
        setEditValue('New KPI');
    };

    const deleteKPI = (id: string, categoryId: string) => {
        const categoryKPIs = localConfig.kpis.filter(k => k.categoryId === categoryId && k.id !== id);
        const otherKPIs = localConfig.kpis.filter(k => k.categoryId !== categoryId);
        const rebalancedKPIs = rebalanceWeights(categoryKPIs).map((w, i) => ({ ...categoryKPIs[i], weight: w.weight }));

        setLocalConfig({ ...localConfig, kpis: [...otherKPIs, ...rebalancedKPIs] });
    };

    const updateKPI = (updatedKPI: EnhancedKPI) => {
        setLocalConfig({
            ...localConfig,
            kpis: localConfig.kpis.map(k => k.id === updatedKPI.id ? updatedKPI : k)
        });
        setConfiguringKPIId(null);
    };

    // --- Editing Logic ---
    const startEdit = (id: string, currentVal: string) => {
        setEditingId(id);
        setEditValue(currentVal);
    };

    const saveEdit = (type: 'category' | 'kpi') => {
        if (type === 'category') {
            setLocalConfig({
                ...localConfig,
                categories: localConfig.categories.map(c => c.id === editingId ? { ...c, label: editValue } : c)
            });
        } else {
            setLocalConfig({
                ...localConfig,
                kpis: localConfig.kpis.map(k => k.id === editingId ? { ...k, label: editValue } : k)
            });
        }
        setEditingId(null);
    };

    const handleWeightChange = (id: string, val: number, type: 'category' | 'kpi') => {
        if (type === 'category') {
            setLocalConfig({
                ...localConfig,
                categories: localConfig.categories.map(c => c.id === id ? { ...c, weight: val } : c)
            });
        } else {
            setLocalConfig({
                ...localConfig,
                kpis: localConfig.kpis.map(k => k.id === id ? { ...k, weight: val } : k)
            });
        }
    };

    // --- Validation ---
    const totalCatWeight = localConfig.categories.reduce((sum, c) => sum + c.weight, 0);
    const isValid = totalCatWeight === 100 && localConfig.categories.every(c => {
        const kpis = localConfig.kpis.filter(k => k.categoryId === c.id);
        return kpis.reduce((sum, k) => sum + k.weight, 0) === 100;
    });

    const configuringKPI = configuringKPIId ? localConfig.kpis.find(k => k.id === configuringKPIId) : null;

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">⚙️ Configuration</h2>
                    <p className="text-slate-500">Manage pillars, KPIs, weights, and scoring logic</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleImport}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-bold flex items-center gap-2 border-2 border-slate-200"
                        title="Import Configuration"
                    >
                        <Upload size={18} />
                        Import
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-bold flex items-center gap-2 border-2 border-slate-200"
                        title="Export Configuration"
                    >
                        <Download size={18} />
                        Export
                    </button>
                    <button
                        onClick={resetConfig}
                        className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-bold flex items-center gap-2 border-2 border-red-200"
                    >
                        <RotateCcw size={18} />
                        Reset Default
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>

            {
                showSuccess && (
                    <div className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <Check size={18} /> Configuration saved successfully!
                    </div>
                )
            }

            {
                !isValid && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-bold">
                        ⚠️ Weights must sum to 100% for categories and KPIs within each category. Please adjust before saving.
                    </div>
                )
            }

            {/* Categories */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">Pillars ({totalCatWeight}%)</h3>
                    <button onClick={addCategory} className="text-sm font-bold text-keeta-primary hover:text-amber-400 flex items-center gap-1">
                        <Plus size={16} /> Add Pillar
                    </button>
                </div>

                {localConfig.categories.map(cat => {
                    const catKpis = localConfig.kpis.filter(k => k.categoryId === cat.id);
                    const totalKpiWeight = catKpis.reduce((sum, k) => sum + k.weight, 0);

                    return (
                        <div key={cat.id} className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                            <div className="bg-slate-50 p-4 flex items-center gap-4 border-b border-slate-100">
                                <div className="flex-1">
                                    {editingId === cat.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                className="input-field py-1 px-2 text-sm"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                            />
                                            <button onClick={() => saveEdit('category')} className="text-green-500"><Check size={18} /></button>
                                            <button onClick={() => setEditingId(null)} className="text-slate-400"><X size={18} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group">
                                            <span className="font-bold text-slate-900">{cat.label}</span>
                                            <button onClick={() => startEdit(cat.id, cat.label)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-keeta-primary">
                                                <Edit2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Weight</span>
                                        <input
                                            type="number"
                                            className="w-16 input-field py-1 px-2 text-center font-bold"
                                            value={cat.weight}
                                            onChange={e => handleWeightChange(cat.id, Number(e.target.value), 'category')}
                                        />
                                        <span className="text-slate-400 font-bold">%</span>
                                    </div>
                                    <button onClick={() => deleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className={clsx("text-xs font-bold uppercase tracking-wider", totalKpiWeight === 100 ? "text-green-600" : "text-red-500")}>
                                        KPI Weights: {totalKpiWeight}%
                                    </span>
                                    <button onClick={() => addKPI(cat.id)} className="text-xs font-bold text-slate-400 hover:text-keeta-primary flex items-center gap-1">
                                        <Plus size={14} /> Add KPI
                                    </button>
                                </div>

                                {catKpis.map(kpi => {
                                    const enhancedKPI = kpi as EnhancedKPI;
                                    const logicType = (enhancedKPI.scoringConfig?.type || enhancedKPI.scoringLogic || 'standard') as ScoringLogicType;
                                    const logicMeta = SCORING_LOGIC_METADATA[logicType] || SCORING_LOGIC_METADATA['standard'];

                                    return (
                                        <div key={kpi.id} className="p-3 hover:bg-slate-50 rounded-lg transition-colors group border border-transparent hover:border-slate-100">
                                            <div className="flex items-start gap-3 mb-2">
                                                <div className="flex-1">
                                                    {editingId === kpi.id ? (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    autoFocus
                                                                    className="input-field py-1 px-2 text-sm w-full"
                                                                    value={editValue}
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    placeholder="KPI Label"
                                                                />
                                                                <button onClick={() => saveEdit('kpi')} className="text-green-500 hover:bg-green-50 p-1 rounded"><Check size={16} /></button>
                                                                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X size={16} /></button>
                                                            </div>
                                                            <textarea
                                                                className="input-field py-1 px-2 text-xs w-full resize-none"
                                                                value={kpi.description || ''}
                                                                onChange={e => {
                                                                    const newDesc = e.target.value;
                                                                    setLocalConfig(prev => ({
                                                                        ...prev,
                                                                        kpis: prev.kpis.map(k => k.id === kpi.id ? { ...k, description: newDesc } : k)
                                                                    }));
                                                                }}
                                                                placeholder="KPI Description"
                                                                rows={2}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-slate-700">{kpi.label}</span>
                                                                <button onClick={() => startEdit(kpi.id, kpi.label)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-keeta-primary transition-opacity">
                                                                    <Edit2 size={12} />
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{kpi.description || 'No description'}</p>

                                                            {/* Scoring Logic Display */}
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <span className="px-2 py-0.5 bg-keeta-primary/10 border border-keeta-primary/20 rounded text-xs font-bold text-keeta-primary">
                                                                    {logicMeta.label}
                                                                </span>
                                                                <button
                                                                    onClick={() => setConfiguringKPIId(kpi.id)}
                                                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-bold text-slate-600 flex items-center gap-1 transition-colors"
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
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* KPI Configuration Modal */}
            {
                configuringKPI && (
                    <KPIConfigModal
                        kpi={configuringKPI as EnhancedKPI}
                        onSave={updateKPI}
                        onCancel={() => setConfiguringKPIId(null)}
                    />
                )
            }
        </div >
    );
};
