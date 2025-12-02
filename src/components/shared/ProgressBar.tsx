import React from 'react';
import clsx from 'clsx';
import type { RAGStatus } from '../../types';

interface ProgressBarProps {
    value: number; // 0-100
    rag?: RAGStatus;
    height?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const heightStyles = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    rag,
    height = 'md',
    showLabel = false,
    className = '',
}) => {
    const normalizedValue = Math.min(100, Math.max(0, value));

    return (
        <div className={className}>
            {showLabel && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-500">Progress</span>
                    <span className="text-xs font-bold text-slate-700">{Math.round(normalizedValue)}%</span>
                </div>
            )}
            <div className={clsx('w-full rounded-full bg-slate-100 overflow-hidden', heightStyles[height])}>
                <div
                    className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        rag === 'green' && 'bg-gradient-to-r from-green-400 to-green-500',
                        rag === 'amber' && 'bg-gradient-to-r from-amber-400 to-amber-500',
                        rag === 'red' && 'bg-gradient-to-r from-red-400 to-red-500',
                        !rag && 'bg-gradient-to-r from-keeta-primary to-amber-400'
                    )}
                    style={{ width: `${normalizedValue}%` }}
                />
            </div>
        </div>
    );
};
