import React from 'react';
import clsx from 'clsx';
import type { RAGStatus } from '../../types';

interface ScoreBadgeProps {
    score: number;
    rag: RAGStatus;
    size?: 'sm' | 'md' | 'lg';
    showPercentage?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'text-sm px-3 py-1',
    md: 'text-base px-4 py-1.5',
    lg: 'text-lg px-5 py-2',
};

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
    score,
    rag,
    size = 'md',
    showPercentage = true,
    className = '',
}) => {
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 rounded-full font-bold',
                sizeClasses[size],
                {
                    'bg-green-50 text-green-600': rag === 'green',
                    'bg-amber-50 text-amber-600': rag === 'amber',
                    'bg-red-50 text-red-600': rag === 'red',
                },
                className
            )}
        >
            {Math.round(score)}
            {showPercentage && '%'}
        </span>
    );
};
