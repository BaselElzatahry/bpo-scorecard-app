import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { ScorecardConfig } from '../types';

interface SaveScorecardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (details: { name: string; description: string; department: string }) => void;
    existingConfig?: ScorecardConfig;
}

export const SaveScorecardModal: React.FC<SaveScorecardModalProps> = ({ isOpen, onClose, onSave, existingConfig }) => {
    const [name, setName] = useState(existingConfig?.name || '');
    const [description, setDescription] = useState(existingConfig?.description || '');
    const [department, setDepartment] = useState(existingConfig?.department || 'Operations');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, description, department });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <Save className="text-keeta-primary" size={24} />
                            Save as Scorecard
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Save this configuration as a reusable template</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Scorecard Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-900 focus:border-keeta-primary focus:ring-0 transition-all outline-none"
                            placeholder="e.g., BPO Quality Scorecard 2024"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Department</label>
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-900 focus:border-keeta-primary focus:ring-0 transition-all outline-none"
                            value={department}
                            onChange={e => setDepartment(e.target.value)}
                        >
                            <option value="Operations">Operations</option>
                            <option value="Quality">Quality</option>
                            <option value="Training">Training</option>
                            <option value="Compliance">Compliance</option>
                            <option value="HR">HR</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Description</label>
                        <textarea
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-900 focus:border-keeta-primary focus:ring-0 transition-all outline-none resize-none"
                            placeholder="Brief description of this scorecard..."
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 px-4 bg-keeta-primary hover:bg-keeta-primary/90 text-white rounded-xl font-bold shadow-lg shadow-keeta-primary/20 transition-all transform hover:-translate-y-0.5"
                        >
                            Save Scorecard
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
