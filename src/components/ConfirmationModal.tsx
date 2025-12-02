import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onPause?: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    pauseText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onPause,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    pauseText = 'Pause',
    variant = 'warning'
}) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={clsx(
                            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                            variant === 'danger' && "bg-red-100 text-red-600",
                            variant === 'warning' && "bg-amber-100 text-amber-600",
                            variant === 'info' && "bg-blue-100 text-blue-600"
                        )}>
                            <AlertTriangle size={24} />
                        </div>

                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                            <p className="text-slate-500 leading-relaxed">{message}</p>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 transition-all"
                    >
                        {cancelText}
                    </button>

                    {onPause && (
                        <button
                            onClick={onPause}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                        >
                            {pauseText}
                        </button>
                    )}

                    <button
                        onClick={onConfirm}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all transform active:scale-95",
                            variant === 'danger' && "bg-red-500 hover:bg-red-600",
                            variant === 'warning' && "bg-amber-500 hover:bg-amber-600",
                            variant === 'info' && "bg-blue-500 hover:bg-blue-600"
                        )}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
