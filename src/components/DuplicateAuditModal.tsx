import React from 'react';
import { AlertTriangle, Calendar, Building2, Edit, X } from 'lucide-react';
import clsx from 'clsx';

interface DuplicateAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    details: {
        vendorName: string;
        period: string;
        status: string;
        score?: number;
        lastModified?: string;
        auditorName?: string;
        entryCount?: number;
    };
}

export const DuplicateAuditModal: React.FC<DuplicateAuditModalProps> = ({
    isOpen,
    onClose,
    onEdit,
    details
}) => {
    if (!isOpen) return null;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'finalized':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'draft':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'appealed':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl transform animate-in zoom-in-95 duration-200">
                {/* Icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={40} className="text-amber-600" />
                </div>

                {/* Header */}
                <h2 className="text-3xl font-black text-center mb-3 text-slate-900">
                    Audit Already Exists
                </h2>

                <p className="text-slate-600 text-center mb-6 text-lg">
                    An audit for <span className="font-bold text-slate-900">{details.vendorName}</span> in{' '}
                    <span className="font-bold text-slate-900">
                        {new Date(details.period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>{' '}
                    already exists in the system.
                </p>

                {/* Audit Details Card */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 mb-6 space-y-4 border border-slate-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Current Audit Details</span>
                        <span className={clsx(
                            'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border',
                            getStatusColor(details.status)
                        )}>
                            {details.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 font-medium mb-1">Last Modified</span>
                            <span className="font-bold text-slate-900 text-sm">{formatDate(details.lastModified)}</span>
                        </div>

                        {details.auditorName && (
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-500 font-medium mb-1">Auditor</span>
                                <span className="font-bold text-slate-900 text-sm">{details.auditorName}</span>
                            </div>
                        )}

                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 font-medium mb-1">Vendor</span>
                            <div className="flex items-center gap-2">
                                <Building2 size={14} className="text-slate-400" />
                                <span className="font-bold text-slate-900 text-sm">{details.vendorName}</span>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 font-medium mb-1">Period</span>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                <span className="font-bold text-slate-900 text-sm">{details.period}</span>
                            </div>
                        </div>

                        {details.entryCount !== undefined && (
                            <div className="flex flex-col col-span-2">
                                <span className="text-xs text-slate-500 font-medium mb-1">KPIs Evaluated</span>
                                <span className="font-bold text-keeta-primary text-sm">{details.entryCount} entries</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                    <p className="text-sm text-blue-900 font-medium">
                        <span className="font-bold">Note:</span> You can edit the existing audit or cancel to select a different vendor/period.
                    </p>
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
                        onClick={onEdit}
                        className="flex-1 btn-primary py-3.5 text-base font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                        <Edit size={20} />
                        Edit Existing
                    </button>
                </div>
            </div>
        </div>
    );
};
