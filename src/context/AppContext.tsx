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
    activeScorecardId: string; // NEW: The primary context
    setActiveScorecardId: (id: string) => void; // NEW
    auditConfigs: Record<string, string>; // Key: vendorId-period -> configId
    currentVendorId: string;
    currentPeriod: string;
    currentConfigId: string | undefined; // NEW: Track specific config
    setVendor: (id: string) => void;
    setVendorId: (id: string) => void;
    setPeriod: (period: string) => void;
    setConfigId: (id: string) => void; // NEW
    startAudit: (vendorId: string, period: string, configId?: string) => void;
    markAsEditing: (vendorId: string, period: string) => void;
    setAuditStatus: (vendorId: string, period: string, status: 'draft' | 'finalized' | 'appealed') => void;
    setAuditsForKey: (vendorId: string, period: string, entries: AuditEntry[]) => void;
    updateAudit: (audit: AuditEntry) => void;
    clearAudit: (vendorId: string, period: string, configId?: string) => void;
    deleteAudit: (vendorId: string, period: string, configId?: string) => void;
    saveConfig: (config: AppConfig) => void;
    resetConfig: () => void;
    exportData: () => string;
    importData: (json: string) => boolean;
    calculateScore: (vendorId: string, period: string, configId?: string) => any;
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
            const savedId = localStorage.getItem('activeScorecardId');

            // Determine which config to load
            let configToLoad = activeConfigs.length > 0 ? activeConfigs[0] : null;

            if (savedId) {
                const specific = activeConfigs.find(c => c.id === savedId);
                if (specific) configToLoad = specific;
            }

            if (configToLoad) {
                console.log(`✅ Loaded active scorecard: ${configToLoad.name} (${configToLoad.id})`);
                return {
                    categories: configToLoad.categories,
                    kpis: configToLoad.kpis
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

    const [auditConfigs, setAuditConfigs] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem('auditConfigs');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Failed to load auditConfigs', e);
            return {};
        }
    });

    const [currentVendorId, setCurrentVendorId] = useState<string>(() => {
        return localStorage.getItem('currentVendorId') || vendors[0]?.id || '';
    });

    const [currentPeriod, setCurrentPeriod] = useState<string>(() => {
        return localStorage.getItem('currentPeriod') || new Date().toISOString().slice(0, 7);
    });

    const [currentConfigId, setCurrentConfigId] = useState<string | undefined>(undefined);

    // NEW: Active Scorecard Context
    const [activeScorecardId, setActiveScorecardIdState] = useState<string>(() => {
        const saved = localStorage.getItem('activeScorecardId');
        // Default to first available if none saved, or keep saved
        const configs = scorecardConfigService.getActiveConfigs();
        if (saved && configs.find(c => c.id === saved)) return saved;
        return configs.length > 0 ? configs[0].id : '';
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
        localStorage.setItem('auditConfigs', JSON.stringify(auditConfigs));
    }, [auditConfigs]);

    useEffect(() => {
        localStorage.setItem('currentVendorId', currentVendorId);
    }, [currentVendorId]);

    useEffect(() => {
        localStorage.setItem('currentPeriod', currentPeriod);
    }, [currentPeriod]);

    useEffect(() => {
        localStorage.setItem('activeScorecardId', activeScorecardId);
    }, [activeScorecardId]);

    const setVendor = useCallback((id: string) => setCurrentVendorId(id), []);
    const setVendorId = useCallback((id: string) => setCurrentVendorId(id), []);
    const setPeriod = useCallback((period: string) => setCurrentPeriod(period), []);
    const setConfigId = useCallback((id: string) => setCurrentConfigId(id), []);

    // CRITICAL FIX: Reload config from active scorecard
    const reloadConfig = useCallback(() => {
        try {
            const activeConfigs = scorecardConfigService.getActiveConfigs();
            // Use current activeScorecardId
            const targetId = activeScorecardId;
            const configToLoad = activeConfigs.find(c => c.id === targetId) || activeConfigs[0];

            if (configToLoad) {
                console.log(`🔄 Reloading config from: ${configToLoad.name}`);
                setConfig({
                    categories: configToLoad.categories,
                    kpis: configToLoad.kpis
                });
            } else {
                console.warn('⚠️ No active scorecard found during reload');
            }
        } catch (error) {
            console.error('❌ Failed to reload config:', error);
        }
    }, [activeScorecardId]);

    const setActiveScorecardId = useCallback((id: string) => {
        setActiveScorecardIdState(id);
        // We will let the effect or reloadConfig handle the implementation update
        // But for immediate response we can trigger reload logic here too
        const config = scorecardConfigService.getConfig(id);
        if (config) {
            setConfig({
                categories: config.categories,
                kpis: config.kpis
            });
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

    const startAudit = useCallback((vendorId: string, period: string, configId?: string) => {
        // Use composite key if configId matches the new pattern
        const key = configId ? `${vendorId}-${period}-${configId}` : `${vendorId}-${period}`;

        setStartedAudits(prev => ({ ...prev, [key]: true }));

        if (configId) {
            // New logic: Set the current config context
            setCurrentConfigId(configId);

            const selectedConfig = scorecardConfigService.getConfig(configId);
            if (selectedConfig) {
                console.log(`✅ Audit started with config: ${selectedConfig.name}`);
                setConfig({
                    categories: selectedConfig.categories,
                    kpis: selectedConfig.kpis
                });
            }
        }
    }, []);

    const markAsEditing = useCallback((vendorId: string, period: string) => {
        const key = `${vendorId}-${period}`;
        setEditingAudits(prev => ({ ...prev, [key]: true }));
    }, []);

    const setAuditStatus = useCallback((vendorId: string, period: string, status: 'draft' | 'finalized' | 'appealed') => {
        // Try current config first, then fallback to composite or legacy
        const key = currentConfigId
            ? `${vendorId}-${period}-${currentConfigId}`
            : `${vendorId}-${period}`;

        setAuditStatusState(prev => ({ ...prev, [key]: status }));
    }, [currentConfigId]);

    const updateAudit = useCallback((entry: AuditEntry) => {
        // Determine key: prioritizes entry.scorecardConfigId for uniqueness
        const key = entry.scorecardConfigId
            ? `${entry.vendorId}-${entry.period}-${entry.scorecardConfigId}`
            : `${entry.vendorId}-${entry.period}`;

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
        // Try to infer configId from entries
        const configId = entries.length > 0 ? entries[0].scorecardConfigId : currentConfigId;
        const key = configId ? `${vendorId}-${period}-${configId}` : `${vendorId}-${period}`;
        setAudits(prev => ({ ...prev, [key]: entries }));
    }, [currentConfigId]);

    const clearAudit = useCallback((vendorId: string, period: string, configId?: string) => {
        // Determine the primary key for data deletion
        const key = configId
            ? `${vendorId}-${period}-${configId}`
            : `${vendorId}-${period}`;

        console.log(`🗑️ Deleting audit with key: ${key} (ConfigId: ${configId})`);

        // Legacy key is used for auditConfigs mapping (vendor-period -> active config)
        const legacyKey = `${vendorId}-${period}`;

        setAudits(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setStartedAudits(prev => {
            const next = { ...prev };
            delete next[key];
            // Also try legacy key just in case
            if (configId) delete next[legacyKey];
            return next;
        });
        setEditingAudits(prev => {
            const next = { ...prev };
            delete next[key];
            if (configId) delete next[legacyKey];
            return next;
        });
        setAuditStatusState(prev => {
            const next = { ...prev };
            delete next[key];
            if (configId) delete next[legacyKey];
            localStorage.setItem('auditStatus', JSON.stringify(next));
            return next;
        });
        setAuditConfigs(prev => {
            const next = { ...prev };
            // Ensure we remove the mapping for this period, which uses the legacy key
            delete next[legacyKey];
            // Also try the composite key just in case it was stored that way erroneously
            delete next[key];
            localStorage.setItem('auditConfigs', JSON.stringify(next));
            return next;
        });

        // Clear current config ID if it matches the one being deleted
        if (configId && currentConfigId === configId) {
            setCurrentConfigId(undefined);
        }
    }, [currentConfigId]);

    const deleteAudit = useCallback((vendorId: string, period: string, configId?: string) => {
        clearAudit(vendorId, period, configId);
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
            if (data.editingAudits) setEditingAudits(data.editingAudits || {}); // Add fallback
            if (data.auditStatus) setAuditStatusState(data.auditStatus);
            if (data.auditConfigs) setAuditConfigs(data.auditConfigs);
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

    const calculateScore = useCallback((vendorId: string, period: string, overrideConfigId?: string) => {
        // Determine which key to use
        // If override provided, use it.
        // If not, check if we have a currentConfigId active.
        // If not, try legacy key.
        const targetConfigId = overrideConfigId || currentConfigId;

        let key = targetConfigId ? `${vendorId}-${period}-${targetConfigId}` : `${vendorId}-${period}`;
        let vendorAudits = audits[key] || [];

        // Fallback: If no audits found with composite key, check legacy key
        if (vendorAudits.length === 0 && !targetConfigId) {
            key = `${vendorId}-${period}`;
            vendorAudits = audits[key] || [];
        }

        // CRITICAL: Use the config associated with these audits, not the global config
        let scoringCategories = config.categories;
        let scoringKpis = config.kpis;

        // Try to find the config definition
        const usedConfigId = targetConfigId || (vendorAudits.length > 0 ? vendorAudits[0].scorecardConfigId : undefined);

        if (usedConfigId) {
            const auditConfig = scorecardConfigService.getConfig(usedConfigId);
            if (auditConfig) {
                scoringCategories = auditConfig.categories;
                scoringKpis = auditConfig.kpis;
            }
        }

        return calculateScores(vendorAudits, scoringCategories, scoringKpis, vendorId, period);
    }, [audits, config, currentConfigId]);

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
            auditConfigs,
            currentVendorId,
            currentPeriod,
            currentConfigId, // NEW
            activeScorecardId, // NEW
            setActiveScorecardId, // NEW
            setVendor,
            setVendorId,
            setPeriod,
            setConfigId, // NEW
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
            auditConfigs,
            currentPeriod,
            currentConfigId,
            activeScorecardId,
            setVendor,
            setVendorId,
            setPeriod,
            setConfigId,
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
