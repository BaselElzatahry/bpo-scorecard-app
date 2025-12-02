import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
    additionalInfo?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'danger',
    additionalInfo
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: 'text-red-500',
            button: 'bg-red-500 hover:bg-red-600 text-white'
        },
        warning: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            icon: 'text-amber-500',
            button: 'bg-amber-500 hover:bg-amber-600 text-white'
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            icon: 'text-blue-500',
            button: 'bg-blue-500 hover:bg-blue-600 text-white'
        }
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4">
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                        <div className={clsx('p-2 rounded-xl', styles.bg, `border ${styles.border}`)}>
                            <AlertTriangle className={styles.icon} size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3">
                    <p className="text-slate-600 leading-relaxed">{message}</p>
                    {additionalInfo && (
                        <div className={clsx('p-3 rounded-lg border', styles.bg, styles.border)}>
                            <p className="text-sm font-semibold text-slate-700">{additionalInfo}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={clsx('flex-1 px-4 py-2.5 rounded-xl font-bold transition-colors shadow-lg', styles.button)}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
