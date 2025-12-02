import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { ConfirmationModal } from './ConfirmationModal';
import { calculateScores } from '../utils/scoring';

export const AppealsPage: React.FC = () => {
    const { vendors, currentPeriod, setPeriod, setVendor, currentVendorId, auditStatus, setAuditStatus, audits, config, startedAudits } = useApp();
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);

    const key = `${currentVendorId}-${currentPeriod}`;
    const status = auditStatus[key];
    const isStarted = startedAudits[key];

    // Calculate score for preview
    const currentAudits = audits[key] || [];
    const results = calculateScores(currentAudits, config.categories, config.kpis, currentVendorId, currentPeriod);
    const score = Math.round(results.score);

    const handleCardClick = () => {
        if (!isStarted) return;
        setShowModal(true);
    };

    const confirmEdit = () => {
        // Set status to appealed to allow editing (if not already)
        if (status !== 'appealed') {
            setAuditStatus(currentVendorId, currentPeriod, 'appealed');
        }
        // Navigate to the first category
        navigate(`/audit/${config.categories[0].id}`);
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

                {isStarted ? (
                    <div
                        onClick={handleCardClick}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-keeta-primary transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-12 h-12 rounded-xl flex items-center justify-center",
                                    status === 'finalized' ? "bg-green-100 text-green-600" :
                                        status === 'appealed' ? "bg-amber-100 text-amber-600" :
                                            "bg-slate-100 text-slate-600"
                                )}>
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg group-hover:text-keeta-primary transition-colors">
                                        {vendors.find(v => v.id === currentVendorId)?.name} - {currentPeriod}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={clsx(
                                            "text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                                            status === 'finalized' ? "bg-green-100 text-green-700" :
                                                status === 'appealed' ? "bg-amber-100 text-amber-700" :
                                                    "bg-slate-100 text-slate-600"
                                        )}>
                                            {status || 'Draft'}
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">
                                            Score: <span className="font-bold text-slate-900">{score}/100</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-slate-300 group-hover:text-keeta-primary transition-colors" />
                        </div>
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
