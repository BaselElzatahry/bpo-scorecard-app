import React from 'react';
import clsx from 'clsx';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({
    children,
    className,
    hover = false,
    padding = 'md',
    onClick,
}) => {
    const isClickable = !!onClick;

    return (
        <div
            onClick={onClick}
            className={clsx(
                'bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-300',
                paddingStyles[padding],
                hover && 'hover:shadow-lg',
                isClickable && 'cursor-pointer',
                className
            )}
        >
            {children}
        </div>
    );
};
