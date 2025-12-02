import React from 'react';
import { AlertTriangle, Save, Trash2, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface NavigationWarningModalProps {
    isOpen: boolean;
    onConfirmTerminate: () => void;
    onConfirmSave: () => void;
    onCancel: () => void;
}

export const NavigationWarningModal: React.FC<NavigationWarningModalProps> = ({
    isOpen,
    onConfirmTerminate,
    onConfirmSave,
    onCancel,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="text-amber-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Unsaved Progress</h3>
                            <p className="text-slate-500 text-sm">You have an audit in progress. What would you like to do?</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={onConfirmSave}
                            className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-keeta-primary/50 hover:bg-keeta-primary/5 transition-all group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <Save size={20} />
                                </div>
                                <div>
                                    <span className="block font-bold text-slate-900">Save for Later</span>
                                    <span className="text-xs text-slate-500">Save draft and leave page</span>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-keeta-primary transition-colors" />
                        </button>

                        <button
                            onClick={onConfirmTerminate}
                            className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors">
                                    <Trash2 size={20} />
                                </div>
                                <div>
                                    <span className="block font-bold text-slate-900">Terminate Audit</span>
                                    <span className="text-xs text-slate-500">Discard changes and delete draft</span>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                        </button>

                        <button
                            onClick={onCancel}
                            className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors mt-4"
                        >
                            Continue Audit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
