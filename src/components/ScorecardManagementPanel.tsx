import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Calendar, Layers, Target, Check } from 'lucide-react';
import { scorecardConfigService } from '../services/scorecard-config.service';
import { ScorecardConfig } from '../types';
import clsx from 'clsx';

interface Props {
    onEdit?: (scorecardId: string) => void;
}

export const ScorecardManagementPanel: React.FC<Props> = ({ onEdit }) => {
    const [configs, setConfigs] = useState<ScorecardConfig[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const loadConfigs = () => {
        const all = scorecardConfigService.getAllConfigs();
        setConfigs(all);
    };

    useEffect(() => {
        loadConfigs();
    }, []);

    const handleDelete = (id: string) => {
        setDeleteTargetId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        if (deleteTargetId) {
            scorecardConfigService.deleteConfig(deleteTargetId);
            loadConfigs();
            setShowDeleteConfirm(false);
            setDeleteTargetId(null);
        }
    };

    const handleToggleActive = (config: ScorecardConfig) => {
        scorecardConfigService.saveConfig({
            ...config,
            isActive: !config.isActive
        });
        loadConfigs();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Saved Scorecard Models</h3>
                    <p className="text-sm text-slate-500">Manage your scorecard configurations</p>
                </div>
                <button
                    onClick={() => onEdit?.('new')}
                    className="btn-primary flex items-center gap-2"
                >
                    <Target size={18} />
                    Create New Scorecard
                </button>
            </div>

            {configs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Layers size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No scorecard models saved yet</p>
                    <p className="text-sm text-slate-400 mt-1 mb-4">Create your first scorecard model to get started</p>
                    <button
                        onClick={() => onEdit?.('new')}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <Target size={18} />
                        Create New Scorecard
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {configs.map(config => (
                        <div
                            key={config.id}
                            className={clsx(
                                "bg-white border-2 rounded-xl p-4 transition-all",
                                selectedId === config.id
                                    ? "border-keeta-primary shadow-lg shadow-keeta-primary/20"
                                    : "border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="text-lg font-bold text-slate-900">{config.name}</h4>
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded text-xs font-bold",
                                            config.isActive
                                                ? "bg-green-100 text-green-700"
                                                : "bg-slate-100 text-slate-500"
                                        )}>
                                            {config.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="px-2 py-0.5 bg-keeta-primary/10 text-keeta-primary rounded text-xs font-bold">
                                            {config.department}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3">{config.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Layers size={14} />
                                            <span>{config.categories.length} Categories</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Target size={14} />
                                            <span>{config.kpis.length} KPIs</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            <span>v{config.version}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleActive(config)}
                                        className={clsx(
                                            "p-2 rounded-lg transition-colors font-bold text-xs flex items-center gap-1",
                                            config.isActive
                                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                : "bg-green-100 text-green-700 hover:bg-green-200"
                                        )}
                                        title={config.isActive ? "Deactivate" : "Activate"}
                                    >
                                        {config.isActive ? (
                                            <>Hide</>
                                        ) : (
                                            <><Check size={14} /> Activate</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => onEdit?.(config.id)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                                        title="Edit scorecard"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(config.id)}
                                        className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-slate-400"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-black text-slate-900 mb-2">Delete Scorecard Template?</h3>
                        <p className="text-slate-600 mb-6">
                            This will permanently delete this scorecard template. Existing audits using this scorecard will not be affected.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
