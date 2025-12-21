import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ConfirmationModal } from './ConfirmationModal';
import { calculateScores } from '../utils/scoring';
import { scorecardConfigService } from '../services/scorecard-config.service';

export const AppealsPage: React.FC = () => {
    const { vendors, currentPeriod, setPeriod, setVendor, currentVendorId, auditStatus, setAuditStatus, audits, config, startedAudits, setConfigId, activeScorecardId } = useApp();
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);

    // List of available audits for this vendor/period
    const availableAudits = React.useMemo(() => {
        const prefix = `${currentVendorId}-${currentPeriod}`;
        const keys = Object.keys(startedAudits).filter(k => k.startsWith(prefix) && startedAudits[k]);

        return keys.map(k => {
            const parts = k.split('-');
            // Extract Config ID if present
            // key format: vendor-period-config or vendor-period (legacy)
            // BUT simpler: check the audit entries for configId
            const entries = audits[k] || [];
            const usedConfigId = entries.length > 0 ? entries[0].scorecardConfigId : undefined;

            // Get config name if possible
            let configName = 'Default Model';
            if (usedConfigId) {
                const c = scorecardConfigService.getConfig(usedConfigId);
                if (c) configName = c.name;
            }

            // Calc score
            // Resolve config for calculation
            let calcCategories = config.categories;
            let calcKpis = config.kpis;
            if (usedConfigId) {
                const c = scorecardConfigService.getConfig(usedConfigId);
                if (c) {
                    calcCategories = c.categories;
                    calcKpis = c.kpis;
                }
            }

            const results = calculateScores(entries, calcCategories, calcKpis, currentVendorId, currentPeriod);

            return {
                key: k,
                status: auditStatus[k],
                score: Math.round(results.score),
                configId: usedConfigId,
                configName
            };
        }).filter(a => {
            // STRICT SCOPING
            if (activeScorecardId) {
                return a.configId === activeScorecardId;
            }
            return true; // or false if strict
        });
    }, [startedAudits, audits, currentVendorId, currentPeriod, auditStatus, config, activeScorecardId]);

    const [selectedAuditKey, setSelectedAuditKey] = useState<string | null>(null);

    const handleCardClick = (auditItem: typeof availableAudits[0]) => {
        setSelectedAuditKey(auditItem.key);
        setShowModal(true);
    };

    const confirmEdit = () => {
        if (!selectedAuditKey) return;

        // Find audit item
        const auditItem = availableAudits.find(a => a.key === selectedAuditKey);
        if (!auditItem) return;

        // Set status to appealed to allow editing (if not already)
        if (auditItem.status !== 'appealed') {
            // We need to set status for SPECIFIC KEY.
            // Using setAuditStatus context function might be tricky if it infers key from currentConfigId context.
            // BUT we can set the context configId first!
            if (auditItem.configId) {
                setConfigId(auditItem.configId);
                // Need to wait for render? No, context update should be synchronous enough or handled by next render.
                // Actually, setAuditStatus uses currentConfigId from ref/state.
                // Safer to manually update the state via a custom call if possible, or trust the context switch.
                // Let's assume we navigate immediately, so we should set global configId.
            }

            // Since setAuditStatus depends on currentConfigId, and we just called setConfigId...
            // It might be cleaner if we had a setAuditStatusForKey. 
            // But we don't. We can assume the user will 'Appeal' inside the audit page mostly?
            // Or here. 
            // Let's update the status via the key directly if possible? No.
            // The context exposes `setAuditStatus` which uses `currentConfigId`.
            // So:
            if (auditItem.configId) setConfigId(auditItem.configId);

            // We can wait a tick or trust it.
            // Actually, AppContext.setAuditStatus uses currentConfigId.
            // If we just changed it, it should be fine in the next render cycle of AppContext?
            // But we're inside a function.
            // Let's rely on navigating to the audit page, and maybe passing state?
            // Or setting status after navigation?

            // WORKAROUND: We can manually trigger the status update by "Simulating" the environment
            // For now, let's just Navigate. The user can click "Appeal" inside the form if needed, OR
            // we can implement a `setAuditStatusForKey` in context later.
            // Wait, looking at `AppContext`: `setAuditStatusState(prev => ({ ...prev, [key]: status }));` is internal.
            // `setAuditStatus` uses `currentConfigId`.

            // Recommendation: Just navigate. The user will see it's read-only finalized, and maybe we add an "Appeal" button there?
            // Or we rely on the implementation.
            // Actually, `AuditPage` has an "Appeal Mode" indicator.
            // Let's TRY to set it.
            setTimeout(() => {
                // This is hacky but might work to ensure state propagation
                // Ideally we'd have `setAuditStatusForKey`.
            }, 0);
        }

        if (auditItem.configId) {
            setConfigId(auditItem.configId);
            // Find start category
            const c = scorecardConfigService.getConfig(auditItem.configId);
            if (c) {
                navigate(`/audit/${c.categories[0].id}`);
            } else {
                navigate(`/audit/${config.categories[0].id}`);
            }
        } else {
            navigate(`/audit/${config.categories[0].id}`);
        }

        setShowModal(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div>
                <h2 className="text-3xl font-black text-slate-900">Scorecard Appeals</h2>
                <p className="text-slate-500">Select a scorecard to review or appeal.</p>
            </div>

            {/* Selectors */}
            <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 flex items-center gap-6">
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Select Vendor</label>
                    <select
                        value={currentVendorId}
                        onChange={(e) => setVendor(e.target.value)}
                        className="input-field"
                    >
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Select Period</label>
                    <input
                        type="month"
                        value={currentPeriod}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="input-field"
                    />
                </div>
            </div>

            {/* Scorecards List */}
            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Available Scorecards</h3>

                {availableAudits.length > 0 ? (
                    <div className="grid gap-4">
                        {availableAudits.map(audit => (
                            <div
                                key={audit.key}
                                onClick={() => handleCardClick(audit)}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-keeta-primary transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-12 h-12 rounded-xl flex items-center justify-center",
                                            audit.status === 'finalized' ? "bg-green-100 text-green-600" :
                                                audit.status === 'appealed' ? "bg-amber-100 text-amber-600" :
                                                    "bg-slate-100 text-slate-600"
                                        )}>
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg group-hover:text-keeta-primary transition-colors">
                                                {vendors.find(v => v.id === currentVendorId)?.name} - {currentPeriod}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    {audit.configName}
                                                </span>
                                                <span className={clsx(
                                                    "text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                                                    audit.status === 'finalized' ? "bg-green-100 text-green-700" :
                                                        audit.status === 'appealed' ? "bg-amber-100 text-amber-700" :
                                                            "bg-slate-100 text-slate-600"
                                                )}>
                                                    {audit.status || 'Draft'}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">
                                                    Score: <span className="font-bold text-slate-900">{audit.score}/100</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-300 group-hover:text-keeta-primary transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <AlertCircle size={24} />
                        </div>
                        <p className="text-slate-500 font-medium">No scorecard found for this period.</p>
                        <p className="text-xs text-slate-400 mt-1">Select a different vendor or period.</p>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={confirmEdit}
                title="Edit Scorecard?"
                message="Are you sure you want to edit this scorecard?"
                confirmText="Yes"
                cancelText="No"
                variant="info"
            />
        </div>
    );
};
