import React from 'react';
import clsx from 'clsx';

export type TabOption = {
    id: string;
    label: string;
    icon?: React.ReactNode;
};

interface StatisticsTabsProps {
    tabs: TabOption[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export const StatisticsTabs: React.FC<StatisticsTabsProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div
            className="flex gap-3 border-b border-slate-200 mb-6"
            role="tablist"
            aria-label="Statistics navigation"
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`panel-${tab.id}`}
                        id={`tab-${tab.id}`}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => onTabChange(tab.id)}
                        onKeyDown={(e) => {
                            // Keyboard navigation
                            const currentIndex = tabs.findIndex(t => t.id === tab.id);

                            if (e.key === 'ArrowRight') {
                                e.preventDefault();
                                const nextIndex = (currentIndex + 1) % tabs.length;
                                onTabChange(tabs[nextIndex].id);
                            } else if (e.key === 'ArrowLeft') {
                                e.preventDefault();
                                const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
                                onTabChange(tabs[prevIndex].id);
                            } else if (e.key === 'Home') {
                                e.preventDefault();
                                onTabChange(tabs[0].id);
                            } else if (e.key === 'End') {
                                e.preventDefault();
                                onTabChange(tabs[tabs.length - 1].id);
                            }
                        }}
                        className={clsx(
                            "relative px-6 py-4 text-base font-bold transition-all duration-200 border-b-4 hover:bg-slate-50",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-keeta-primary focus-visible:ring-offset-2 rounded-t-lg",
                            isActive
                                ? "text-keeta-primary border-keeta-primary bg-slate-50"
                                : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {tab.icon && <span className="w-5 h-5">{tab.icon}</span>}
                            <span>{tab.label}</span>
                        </div>

                        {/* Active indicator */}
                        {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-keeta-primary rounded-t-full" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
