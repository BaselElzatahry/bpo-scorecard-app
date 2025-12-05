import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AppConfig, AuditEntry, Category, KPI, Vendor } from '../types';
import { DEFAULT_CONFIG, DEFAULT_VENDORS } from '../data/defaults';
import { calculateScores } from '../utils/scoring';
import { indexedDBService } from '../services/indexedDB.service';
import { vendorService } from '../services/vendor.service';
import { scorecardConfigService } from '../services/scorecard-config.service';

interface AppState {
    vendors: Vendor[];
    categories: Category[];
    kpis: KPI[];
    config: AppConfig;
    reloadConfig: () => void;  // NEW: Reload config from active scorecard
    audits: Record<string, AuditEntry[]>;
    startedAudits: Record<string, boolean>; // Key: vendorId-period
    editingAudits: Record<string, boolean>; // Key: vendorId-period
    auditStatus: Record<string, 'draft' | 'finalized' | 'appealed'>; // Key: vendorId-period
    currentVendorId: string;
    currentPeriod: string;
    setVendor: (id: string) => void;
    setVendorId: (id: string) => void;
    setPeriod: (period: string) => void;
    startAudit: (vendorId: string, period: string) => void;
    markAsEditing: (vendorId: string, period: string) => void;
    setAuditStatus: (vendorId: string, period: string, status: 'draft' | 'finalized' | 'appealed') => void;
    setAuditsForKey: (vendorId: string, period: string, entries: AuditEntry[]) => void;
    updateAudit: (audit: AuditEntry) => void;
    clearAudit: (vendorId: string, period: string) => void;
    deleteAudit: (vendorId: string, period: string) => void;
    saveConfig: (config: AppConfig) => void;
    resetConfig: () => void;
    exportData: () => string;
    importData: (json: string) => boolean;
    calculateScore: (vendorId: string, period: string) => any;
    // Vendor management
    addVendor: (name: string, metadata?: { color?: string; region?: string; logo?: string }) => Vendor;
    updateVendor: (id: string, updates: { name?: string; color?: string; region?: string; logo?: string }) => Vendor;
    removeVendor: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize vendors from service (with DEFAULT_VENDORS fallback)
    const [vendors, setVendors] = useState<Vendor[]>(() => {
        // Initialize from defaults if empty
        vendorService.initializeFromDefaults(DEFAULT_VENDORS);
        return vendorService.getActiveVendors();
    });

    const [config, setConfig] = useState<AppConfig>(() => {
        try {
            // CRITICAL FIX: Load from active scorecard configuration instead of defaults
            const activeConfigs = scorecardConfigService.getActiveConfigs();

            if (activeConfigs.length > 0) {
                // Use the first active scorecard configuration
                const activeConfig = activeConfigs[0];
                console.log(`✅ Loaded active scorecard: ${activeConfig.name}`);
                return {
                    categories: activeConfig.categories,
                    kpis: activeConfig.kpis
                };
            }

            // Fallback to defaults if no saved configs
            console.log('⚠️ No active scorecard found, using defaults');
            return DEFAULT_CONFIG;
        } catch (e) {
            console.error('Failed to load config', e);
            return DEFAULT_CONFIG;
        }
    });

    const [audits, setAudits] = useState<Record<string, AuditEntry[]>>(() => {
        try {
            const saved = localStorage.getItem('audits');
            const parsed = saved ? JSON.parse(saved) : {};

            // Trigger automatic migration in background (non-blocking)
            indexedDBService.migrateBase64Attachments(parsed).then(({ audits: migratedAudits, migrated, count }) => {
                if (migrated) {
                    console.log(`✅ Migrated ${count} attachments to IndexedDB`);
                    setAudits(migratedAudits);
                }
            }).catch(error => {
                console.error('Migration failed:', error);
            });

            return parsed; // Return original immediately, update happens async
        } catch (e) {
            console.error('Failed to load audits', e);
            return {};
        }
    });

    const [startedAudits, setStartedAudits] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem('startedAudits');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Failed to load startedAudits', e);
            return {};
        }
    });

    const [editingAudits, setEditingAudits] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem('editingAudits');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Failed to load editingAudits', e);
            return {};
        }
    });

    const [auditStatus, setAuditStatusState] = useState<Record<string, 'draft' | 'finalized' | 'appealed'>>(() => {
        try {
            const saved = localStorage.getItem('auditStatus');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Failed to load auditStatus', e);
            return {};
        }
    });

    const [currentVendorId, setCurrentVendorId] = useState<string>(() => {
        return localStorage.getItem('currentVendorId') || vendors[0]?.id || '';
    });

    const [currentPeriod, setCurrentPeriod] = useState<string>(() => {
        return localStorage.getItem('currentPeriod') || new Date().toISOString().slice(0, 7);
    });

    // Persist changes
    useEffect(() => {
        localStorage.setItem('appConfig', JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        localStorage.setItem('audits', JSON.stringify(audits));
    }, [audits]);

    useEffect(() => {
        localStorage.setItem('startedAudits', JSON.stringify(startedAudits));
    }, [startedAudits]);

    useEffect(() => {
        localStorage.setItem('editingAudits', JSON.stringify(editingAudits));
    }, [editingAudits]);

    useEffect(() => {
        localStorage.setItem('auditStatus', JSON.stringify(auditStatus));
    }, [auditStatus]);

    useEffect(() => {
        localStorage.setItem('currentVendorId', currentVendorId);
    }, [currentVendorId]);

    useEffect(() => {
        localStorage.setItem('currentPeriod', currentPeriod);
    }, [currentPeriod]);

    const setVendor = useCallback((id: string) => setCurrentVendorId(id), []);
    const setVendorId = useCallback((id: string) => setCurrentVendorId(id), []);
    const setPeriod = useCallback((period: string) => setCurrentPeriod(period), []);

    // CRITICAL FIX: Reload config from active scorecard
    const reloadConfig = useCallback(() => {
        try {
            const activeConfigs = scorecardConfigService.getActiveConfigs();

            if (activeConfigs.length > 0) {
                const activeConfig = activeConfigs[0];
                console.log(`🔄 Reloading config from: ${activeConfig.name}`);
                setConfig({
                    categories: activeConfig.categories,
                    kpis: activeConfig.kpis
                });
            } else {
                console.warn('⚠️ No active scorecard found during reload');
            }
        } catch (error) {
            console.error('❌ Failed to reload config:', error);
        }
    }, []);

    // CRITICAL FIX: Listen for scorecard save events and reload config
    useEffect(() => {
        const handleScorecardSaved = () => {
            console.log('📢 Scorecard saved event detected, reloading config...');
            reloadConfig();
        };

        window.addEventListener('scorecard-saved', handleScorecardSaved);
        return () => window.removeEventListener('scorecard-saved', handleScorecardSaved);
    }, [reloadConfig]);

    const startAudit = useCallback((vendorId: string, period: string) => {
        const key = `${vendorId}-${period}`;
        setStartedAudits(prev => ({ ...prev, [key]: true }));
    }, []);

    const markAsEditing = useCallback((vendorId: string, period: string) => {
        const key = `${vendorId}-${period}`;
        setEditingAudits(prev => ({ ...prev, [key]: true }));
    }, []);

    const setAuditStatus = useCallback((vendorId: string, period: string, status: 'draft' | 'finalized' | 'appealed') => {
        const key = `${vendorId}-${period}`;
        setAuditStatusState(prev => ({ ...prev, [key]: status }));
    }, []);

    const updateAudit = useCallback((entry: AuditEntry) => {
        const key = `${entry.vendorId}-${entry.period}`;
        setAudits(prev => {
            const currentAudits = prev[key] || [];
            const existingIndex = currentAudits.findIndex(a => a.kpiId === entry.kpiId);

            let newAudits;
            if (existingIndex >= 0) {
                newAudits = [...currentAudits];
                newAudits[existingIndex] = entry;
            } else {
                newAudits = [...currentAudits, entry];
            }

            return { ...prev, [key]: newAudits };
        });
    }, []);

    const setAuditsForKey = useCallback((vendorId: string, period: string, entries: AuditEntry[]) => {
        const key = `${vendorId}-${period}`;
        setAudits(prev => ({ ...prev, [key]: entries }));
    }, []);

    const clearAudit = useCallback((vendorId: string, period: string) => {
        const key = `${vendorId}-${period}`;
        setAudits(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setStartedAudits(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setEditingAudits(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setAuditStatusState(prev => {
            const next = { ...prev };
            delete next[key];
            localStorage.setItem('auditStatus', JSON.stringify(next));
            return next;
        });
    }, []);

    const deleteAudit = useCallback((vendorId: string, period: string) => {
        clearAudit(vendorId, period);
    }, [clearAudit]);

    const saveConfig = useCallback((newConfig: AppConfig) => {
        setConfig(newConfig);
    }, []);

    const resetConfig = useCallback(() => {
        setConfig(DEFAULT_CONFIG);
    }, []);

    const exportData = useCallback(() => {
        const data = {
            config,
            audits,
            startedAudits,
            auditStatus,
            vendors: vendorService.getVendors(),
            version: '2.0' // Updated version for vendor management
        };
        return JSON.stringify(data, null, 2);
    }, [config, audits, startedAudits, auditStatus]);

    const importData = useCallback((json: string) => {
        try {
            const data = JSON.parse(json);
            if (data.config) setConfig(data.config);
            if (data.audits) setAudits(data.audits);
            if (data.startedAudits) setStartedAudits(data.startedAudits);
            if (data.auditStatus) setAuditStatusState(data.auditStatus);
            if (data.vendors) {
                vendorService.importVendors(JSON.stringify(data.vendors));
                setVendors(vendorService.getActiveVendors());
            }
            return true;
        } catch (e) {
            console.error('Import failed', e);
            return false;
        }
    }, []);

    const calculateScore = useCallback((vendorId: string, period: string) => {
        const key = `${vendorId}-${period}`;
        const vendorAudits = audits[key] || [];
        return calculateScores(vendorAudits, config.categories, config.kpis, vendorId, period);
    }, [audits, config.categories, config.kpis]);

    // Vendor management functions
    const addVendor = useCallback((name: string, metadata?: { color?: string; region?: string; logo?: string }) => {
        const newVendor = vendorService.addVendor(name, metadata);
        setVendors(vendorService.getActiveVendors());
        return newVendor;
    }, []);

    const updateVendor = useCallback((id: string, updates: { name?: string; color?: string; region?: string; logo?: string }) => {
        const updatedVendor = vendorService.updateVendor(id, updates);
        setVendors(vendorService.getActiveVendors());
        return updatedVendor;
    }, []);

    const removeVendor = useCallback((id: string) => {
        vendorService.removeVendor(id);
        setVendors(vendorService.getActiveVendors());
    }, []);

    const contextValue = useMemo(
        () => ({
            vendors,
            categories: config.categories,
            kpis: config.kpis,
            config,
            audits,
            startedAudits,
            editingAudits,
            auditStatus,
            currentVendorId,
            currentPeriod,
            setVendor,
            setVendorId,
            setPeriod,
            reloadConfig,  // NEW: Expose reload function
            startAudit,
            markAsEditing,
            setAuditStatus,
            setAuditsForKey,
            updateAudit,
            clearAudit,
            deleteAudit,
            saveConfig,
            resetConfig,
            exportData,
            importData,
            calculateScore,
            addVendor,
            updateVendor,
            removeVendor,
        }),
        [
            vendors,
            config,
            audits,
            startedAudits,
            editingAudits,
            auditStatus,
            currentVendorId,
            currentPeriod,
            setVendor,
            setVendorId,
            setPeriod,
            startAudit,
            markAsEditing,
            setAuditStatus,
            setAuditsForKey,
            updateAudit,
            clearAudit,
            deleteAudit,
            saveConfig,
            resetConfig,
            exportData,
            importData,
            calculateScore,
            addVendor,
            updateVendor,
            removeVendor,
        ]
    );

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

// Force HMR update
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
};
