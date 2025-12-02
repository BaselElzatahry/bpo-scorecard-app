import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
    className = '',
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 ${className}`}>
            <div className="bg-slate-100 p-6 rounded-full mb-6">
                <Icon size={48} className="text-slate-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">{title}</h2>
            {description && (
                <p className="text-slate-500 mb-8 text-center max-w-md">{description}</p>
            )}
            {action}
        </div>
    );
};
