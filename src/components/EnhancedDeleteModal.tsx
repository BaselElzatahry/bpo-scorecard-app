import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import clsx from 'clsx';

interface EnhancedDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    auditDetails: {
        vendorName: string;
        period: string;
        score?: number;
        status?: string;
        entriesCount?: number;
    };
}

export const EnhancedDeleteModal: React.FC<EnhancedDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    auditDetails
}) => {
    const [confirmText, setConfirmText] = useState('');
    const expectedText = auditDetails.vendorName;

    if (!isOpen) return null;

    const isConfirmed = confirmText === expectedText;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl transform animate-in zoom-in-95 duration-200">
                {/* Warning Icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={40} className="text-red-600" />
                </div>

                {/* Header */}
                <h2 className="text-3xl font-black text-center mb-3 text-slate-900">
                    Permanently Delete Audit?
                </h2>

                <p className="text-slate-600 text-center mb-6 text-base">
                    This action <span className="font-bold text-red-600">cannot be undone</span>. All audit data, scores, comments, and attachments will be permanently deleted.
                </p>

                {/* Audit Info */}
                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-5 mb-6 border-2 border-red-200">
                    <div className="space-y-3">
                        <div>
                            <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Vendor</div>
                            <div className="font-black text-red-900 text-lg">{auditDetails.vendorName}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Period</div>
                                <div className="font-bold text-red-900">{auditDetails.period}</div>
                            </div>

                            {auditDetails.score !== undefined && (
                                <div>
                                    <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Score</div>
                                    <div className="font-bold text-red-900">{Math.round(auditDetails.score)}%</div>
                                </div>
                            )}
                        </div>

                        {auditDetails.entriesCount !== undefined && (
                            <div>
                                <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Audit Entries</div>
                                <div className="font-bold text-red-900">{auditDetails.entriesCount} KPI evaluations</div>
                            </div>
                        )}

                        {auditDetails.status && (
                            <div>
                                <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Status</div>
                                <span className={clsx(
                                    "inline-block px-2 py-1 rounded-full text-xs font-bold uppercase",
                                    auditDetails.status === 'finalized' ? "bg-red-600 text-white" : "bg-red-200 text-red-800"
                                )}>
                                    {auditDetails.status}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Confirmation Input */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Type <span className="text-red-600 font-black">{expectedText}</span> to confirm deletion:
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-900 focus:border-red-500 focus:ring-0 transition-all outline-none"
                        placeholder="Type vendor name here..."
                        autoFocus
                    />
                    {confirmText && !isConfirmed && (
                        <p className="text-xs text-red-500 font-medium mt-2">Text doesn't match. Please type exactly: {expectedText}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 btn-secondary py-3.5 text-base font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} />
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (isConfirmed) {
                                onConfirm();
                                setConfirmText('');
                            }
                        }}
                        disabled={!isConfirmed}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white py-3.5 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:transform-none disabled:cursor-not-allowed"
                    >
                        <Trash2 size={20} />
                        Delete Permanently
                    </button>
                </div>
            </div>
        </div>
    );
};
