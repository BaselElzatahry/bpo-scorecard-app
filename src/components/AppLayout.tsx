
import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Settings,
    ClipboardCheck,
    Users,
    ChevronRight,
    LogOut,
    BarChart2,
    FileSpreadsheet,
    ShieldAlert
} from 'lucide-react';
import clsx from 'clsx';
import { ConfirmationModal } from './ConfirmationModal';
import { scorecardConfigService } from '../services/scorecard-config.service';
import { ScorecardSelector } from './ScorecardSelector';

export const AppLayout: React.FC = () => {
    const { config, currentVendorId, currentPeriod, startedAudits, audits, auditStatus, auditConfigs, clearAudit, editingAudits, setAuditStatus } = useApp();
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Modal State
    const [showExitModal, setShowExitModal] = useState(false);
    const [pendingPath, setPendingPath] = useState<string | null>(null);

    const handleNavigationAttempt = (path: string, e: React.MouseEvent) => {
        const key = `${currentVendorId}-${currentPeriod}`;
        const isStarted = startedAudits[key];
        const status = auditStatus[key];

        // Only warn if we are LEAVING the audit context (not navigating between categories)
        // And if the audit is started but not finalized
        // AND if we are currently ON an audit page
        // AND if the target path is NOT an audit page
        if (location.pathname.includes('/audit/') &&
            !path.includes('/audit/') &&
            isStarted &&
            status !== 'finalized') {
            e.preventDefault();
            setPendingPath(path);
            setShowExitModal(true);
        }
    };

    const confirmExit = () => {
        if (pendingPath) {
            const key = `${currentVendorId}-${currentPeriod}`;
            if (editingAudits[key]) {
                // If we were editing, don't delete! Just finalize (save changes) and exit.
                setAuditStatus(currentVendorId, currentPeriod, 'finalized');
            } else {
                // New audit -> Delete
                clearAudit(currentVendorId, currentPeriod);
            }
            navigate(pendingPath);
            setShowExitModal(false);
            setPendingPath(null);
        }
    };

    const cancelExit = () => {
        setShowExitModal(false);
        setPendingPath(null);
    };

    const pauseExit = () => {
        if (pendingPath) {
            // Just navigate without clearing
            navigate(pendingPath);
            setShowExitModal(false);
            setPendingPath(null);
        }
    };

    // Determine the active config for the sidebar
    // If an audit is started, we MUST use that audit's configuration
    const activeConfig = React.useMemo(() => {
        const key = `${currentVendorId}-${currentPeriod}`;

        // Priority 1: Check if an audit is currently associated with a specific config ID
        if (auditConfigs && auditConfigs[key]) {
            const specificConfig = scorecardConfigService.getConfig(auditConfigs[key]);
            if (specificConfig) return specificConfig;
        }

        // Priority 2: Check existing audit entries (legacy support)
        const currentAudits = audits[key];
        if (currentAudits && currentAudits.length > 0) {
            const configId = currentAudits[0].scorecardConfigId;
            if (configId) {
                const specificConfig = scorecardConfigService.getConfig(configId);
                if (specificConfig) return specificConfig;
            }
        }
        return config; // Fallback to global default
    }, [config, audits, auditConfigs, currentVendorId, currentPeriod]);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-80 bg-[#1A1A1A] text-white flex flex-col shadow-2xl z-30 sticky top-0 h-screen">
                {/* Header - Fixed */}
                <div className="p-8 pb-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <img src="/keeta-logo.png" alt="Keeta Logo" className="w-14 h-14 rounded-xl shadow-glow" />
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white">Keeta</h1>
                            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">BPO Scorecard</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable Navigation */}
                <div className="flex-1 overflow-y-auto px-8 pb-4 custom-scrollbar">
                    <nav className="space-y-1">
                        <div className="pb-4">
                            <ScorecardSelector />
                        </div>
                        <NavLink
                            to="/"
                            onClick={(e) => handleNavigationAttempt('/', e)}
                            end
                            className={({ isActive }) => clsx(
                                "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-keeta-primary text-slate-900 shadow-glow font-bold"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <LayoutDashboard size={18} />
                            Dashboard
                        </NavLink>

                        <NavLink
                            to="/new-audit"
                            onClick={(e) => handleNavigationAttempt('/new-audit', e)}
                            className={({ isActive }) => clsx(
                                "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-keeta-primary text-slate-900 shadow-glow font-bold"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <ClipboardCheck size={18} />
                            Conduct Audit
                        </NavLink>

                        {/* Audit Status Indicator */}
                        {(() => {
                            const key = `${currentVendorId}-${currentPeriod}`;
                            const isStarted = startedAudits[key];
                            const status = auditStatus[key];

                            if (isStarted && status !== 'finalized') {
                                return (
                                    <div
                                        onClick={() => navigate(`/audit/${activeConfig.categories[0].id}`)}
                                        className="mx-4 mt-4 mb-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 animate-pulse cursor-pointer hover:bg-amber-500/20 transition-colors group"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                        <div className="flex-1">
                                            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block">Audit In Progress</span>
                                            <span className="text-[10px] text-amber-500/80 font-medium group-hover:text-amber-500 transition-colors">Click to Continue</span>
                                        </div>
                                        <ChevronRight size={14} className="text-amber-500 opacity-50 group-hover:opacity-100" />
                                    </div>
                                );
                            }
                            return null;
                        })()}


                        <div className="pt-4 pb-2">
                            <p className="px-4 text-[10px] uppercase font-bold tracking-wider text-slate-500">Analysis & Admin</p>
                        </div>

                        <NavLink
                            to="/statistics"
                            onClick={(e) => handleNavigationAttempt('/statistics', e)}
                            className={({ isActive }) => clsx(
                                "group flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <BarChart2 size={18} />
                            Statistics
                        </NavLink>

                        <NavLink
                            to="/reports"
                            onClick={(e) => handleNavigationAttempt('/reports', e)}
                            className={({ isActive }) => clsx(
                                "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <FileSpreadsheet size={18} />
                            Reports
                        </NavLink>

                        <NavLink
                            to="/appeals"
                            onClick={(e) => handleNavigationAttempt('/appeals', e)}
                            className={({ isActive }) => clsx(
                                "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <ShieldAlert size={18} />
                            Appeals & Status
                        </NavLink>

                        <NavLink
                            to="/config"
                            onClick={(e) => handleNavigationAttempt('/config', e)}
                            className={({ isActive }) => clsx(
                                "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Settings size={18} />
                            Configuration
                        </NavLink>

                        <NavLink
                            to="/users"
                            onClick={(e) => handleNavigationAttempt('/users', e)}
                            className={({ isActive }) => clsx(
                                "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Users size={18} />
                            User Management
                        </NavLink>
                    </nav>
                </div>

                {/* User Profile - Fixed at Bottom */}
                <div className="p-6 bg-[#1A1A1A] border-t border-white/5 shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold shadow-inner">
                            {user?.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all duration-200"
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 min-w-0 overflow-auto">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Exit Confirmation Modal */}
            <ConfirmationModal
                isOpen={showExitModal}
                onClose={cancelExit}
                onConfirm={confirmExit}
                onPause={pauseExit}
                title="Audit In Progress"
                message="You have an audit in progress. How would you like to proceed?"
                confirmText="Terminate & Clear"
                pauseText="Pause & Exit"
                cancelText="Stay & Continue"
                variant="warning"
            />
        </div>
    );
};
