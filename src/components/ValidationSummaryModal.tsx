import React from 'react';
import { X, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { ValidationError } from '../utils/validation';
import clsx from 'clsx';

interface ValidationSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveDraft?: () => void;
    onFix: () => void;
    errors: ValidationError[];
    warnings: ValidationError[];
}

export const ValidationSummaryModal: React.FC<ValidationSummaryModalProps> = ({
    isOpen,
    onClose,
    onSaveDraft,
    onFix,
    errors,
    warnings
}) => {
    if (!isOpen) return null;

    const hasErrors = errors.length > 0;
    const hasWarnings = warnings.length > 0;

    // Group errors by KPI
    const errorsByKpi = errors.reduce((acc, error) => {
        const key = error.kpiId || 'General';
        if (!acc[key]) acc[key] = [];
        acc[key].push(error);
        return acc;
    }, {} as Record<string, ValidationError[]>);

    const warningsByKpi = warnings.reduce((acc, warning) => {
        const key = warning.kpiId || 'General';
        if (!acc[key]) acc[key] = [];
        acc[key].push(warning);
        return acc;
    }, {} as Record<string, ValidationError[]>);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={clsx(
                            "w-16 h-16 rounded-full flex items-center justify-center",
                            hasErrors ? "bg-red-100" : "bg-amber-100"
                        )}>
                            {hasErrors ? (
                                <AlertCircle size={32} className="text-red-600" />
                            ) : (
                                <AlertTriangle size={32} className="text-amber-600" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">
                                {hasErrors ? 'Validation Failed' : 'Warnings Detected'}
                            </h2>
                            <p className="text-slate-600 text-sm mt-1">
                                {hasErrors
                                    ? 'Please fix the following issues before finalizing'
                                    : 'Review the following warnings'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Error Summary */}
                {hasErrors && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={18} className="text-red-600" />
                            <span className="font-bold text-red-900">
                                {errors.length} Error{errors.length !== 1 ? 's' : ''} Found
                            </span>
                        </div>
                        <p className="text-sm text-red-700">
                            These issues must be resolved before you can finalize the audit.
                        </p>
                    </div>
                )}

                {/* Errors List */}
                {hasErrors && (
                    <div className="space-y-4 mb-6">
                        <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider">
                            Errors
                        </h3>
                        {Object.entries(errorsByKpi).map(([kpiId, kpiErrors]) => (
                            <div key={kpiId} className="bg-white border-2 border-red-200 rounded-xl p-4">
                                <div className="font-bold text-red-900 mb-2 text-sm uppercase tracking-wider">
                                    {kpiId === 'General' ? 'General Errors' : `KPI: ${kpiId}`}
                                </div>
                                <ul className="space-y-2">
                                    {kpiErrors.map((error, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm">
                                            <span className="text-red-500 mt-0.5">•</span>
                                            <span className="text-red-800 flex-1">
                                                <span className="font-semibold">{error.field}:</span> {error.message}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                {/* Warnings List */}
                {hasWarnings && (
                    <div className="space-y-4 mb-6">
                        <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider">
                            Warnings
                        </h3>
                        {Object.entries(warningsByKpi).map(([kpiId, kpiWarnings]) => (
                            <div key={kpiId} className="bg-white border-2 border-amber-200 rounded-xl p-4">
                                <div className="font-bold text-amber-900 mb-2 text-sm uppercase tracking-wider">
                                    {kpiId === 'General' ? 'General Warnings' : `KPI: ${kpiId}`}
                                </div>
                                <ul className="space-y-2">
                                    {kpiWarnings.map((warning, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm">
                                            <span className="text-amber-500 mt-0.5">•</span>
                                            <span className="text-amber-800 flex-1">
                                                <span className="font-semibold">{warning.field}:</span> {warning.message}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                    {hasErrors ? (
                        <>
                            {onSaveDraft && (
                                <button
                                    onClick={onSaveDraft}
                                    className="flex-1 btn-secondary py-3 text-sm font-bold"
                                >
                                    Save as Draft
                                </button>
                            )}
                            <button
                                onClick={onFix}
                                className="flex-1 btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} />
                                Fix Issues
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 btn-secondary py-3 text-sm font-bold"
                            >
                                Review
                            </button>
                            <button
                                onClick={onFix}
                                className="flex-1 btn-primary py-3 text-sm font-bold"
                            >
                                Continue Anyway
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
