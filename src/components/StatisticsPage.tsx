import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatisticsTabs, TabOption } from './StatisticsTabs';
import { VendorComparisonPanel, MonthlyTrendsPanel } from './statistics';
import { BarChart2, TrendingUp } from 'lucide-react';

type TabId = 'vendor-comparison' | 'monthly-trends';

const tabs: TabOption[] = [
    {
        id: 'vendor-comparison',
        label: 'Vendor Comparison',
        icon: <BarChart2 size={20} />
    },
    {
        id: 'monthly-trends',
        label: 'Monthly Trends',
        icon: <TrendingUp size={20} />
    }
];

export const StatisticsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab') as TabId;

    // Default to vendor-comparison if no tab is specified or invalid
    const [activeTab, setActiveTab] = useState<TabId>(
        tabFromUrl && ['vendor-comparison', 'monthly-trends'].includes(tabFromUrl)
            ? tabFromUrl
            : 'vendor-comparison'
    );

    // Sync URL with tab state
    useEffect(() => {
        const currentTab = searchParams.get('tab');
        if (currentTab !== activeTab) {
            setSearchParams({ tab: activeTab }, { replace: true });
        }
    }, [activeTab, searchParams, setSearchParams]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId as TabId);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Page Header */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black mb-2 text-keeta-primary tracking-tight">Statistics</h1>
                        <p className="text-slate-400 font-medium">Comprehensive vendor analytics and performance insights</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <StatisticsTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />

                {/* Tab Panels */}
                <div className="mt-6">
                    {/* Vendor Comparison Panel */}
                    <div
                        role="tabpanel"
                        id="panel-vendor-comparison"
                        aria-labelledby="tab-vendor-comparison"
                        hidden={activeTab !== 'vendor-comparison'}
                        className={activeTab === 'vendor-comparison' ? 'animate-in fade-in duration-200' : ''}
                    >
                        {activeTab === 'vendor-comparison' && <VendorComparisonPanel />}
                    </div>

                    {/* Monthly Trends Panel */}
                    <div
                        role="tabpanel"
                        id="panel-monthly-trends"
                        aria-labelledby="tab-monthly-trends"
                        hidden={activeTab !== 'monthly-trends'}
                        className={activeTab === 'monthly-trends' ? 'animate-in fade-in duration-200' : ''}
                    >
                        {activeTab === 'monthly-trends' && <MonthlyTrendsPanel />}
                    </div>
                </div>
            </div>
        </div>
    );
};
