import React from 'react';
import { useApp } from '../context/AppContext';
import { scorecardConfigService } from '../services/scorecard-config.service';
import { Layout } from 'lucide-react';

export const ScorecardSelector: React.FC<{ className?: string }> = ({ className }) => {
    const { activeScorecardId, setActiveScorecardId } = useApp();
    const activeConfigs = scorecardConfigService.getActiveConfigs();

    if (!activeConfigs || activeConfigs.length === 0) return null;

    // Find active name
    const activeName = activeConfigs.find(c => c.id === activeScorecardId)?.name || 'Select Model';

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <Layout className="w-3 h-3" />
                Active Workflow
            </label>

            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <div className="w-2 h-2 rounded-full bg-keeta-primary shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                </div>
                <select
                    value={activeScorecardId}
                    onChange={(e) => setActiveScorecardId(e.target.value)}
                    className="w-full appearance-none bg-slate-800 text-white text-sm font-bold border border-slate-700 rounded-xl pl-8 pr-8 py-3 focus:outline-none focus:ring-2 focus:ring-keeta-primary/50 focus:border-keeta-primary transition-all cursor-pointer shadow-lg hover:bg-slate-750"
                    title="Switch Scorecard Model"
                >
                    {activeConfigs.map(config => (
                        <option key={config.id} value={config.id} className="bg-slate-800 text-white py-2">
                            {config.name}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Context Indicator - subtle help text */}
            <div className="px-1">
                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                    All views and reports will be filtered to this model.
                </p>
            </div>
        </div>
    );
};
