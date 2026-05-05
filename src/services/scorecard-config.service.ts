import { ScorecardConfig } from '../types';
import { DEFAULT_SCORECARD_MODELS } from '../data/defaults';

/**
 * Service for managing multiple scorecard configurations
 * Supports CRUD operations and persistence to localStorage
 */
class ScorecardConfigService {
    private readonly STORAGE_KEY = 'scorecard_configs';

    /**
     * Get all scorecard configurations
     */
    getAllConfigs(): ScorecardConfig[] {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (!saved) {
                console.log('📋 No saved scorecard configs found, initializing defaults');
                this.initializeDefaults();
                return this.getAllConfigs();
            }

            const configs: ScorecardConfig[] = JSON.parse(saved);

            // Migration: inject any missing default scorecards (e.g. V2.0 added later)
            const injected = this.injectMissingDefaults(configs);
            if (injected) {
                return JSON.parse(localStorage.getItem(this.STORAGE_KEY)!);
            }

            console.log(`📋 Loaded ${configs.length} scorecard configuration(s)`);
            return configs;
        } catch (error) {
            console.error('❌ Failed to load scorecard configs:', error);
            return [];
        }
    }

    /**
     * Inject any default scorecards that are missing from the saved list.
     * This handles the case where a new default scorecard is added to the codebase
     * but existing users already have configs saved in localStorage.
     * Returns true if any configs were injected.
     */
    private injectMissingDefaults(existing: ScorecardConfig[]): boolean {
        try {
            if (!DEFAULT_SCORECARD_MODELS || !Array.isArray(DEFAULT_SCORECARD_MODELS)) return false;

            const existingIds = new Set(existing.map((c: ScorecardConfig) => c.id));
            const missing = DEFAULT_SCORECARD_MODELS.filter((m: ScorecardConfig) => !existingIds.has(m.id));

            if (missing.length === 0) return false;

            // Prepend missing defaults so they appear first
            const updated = [...missing, ...existing];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
            console.log(`✅ Injected ${missing.length} missing default scorecard(s): ${missing.map((m: ScorecardConfig) => m.name).join(', ')}`);
            return true;
        } catch (e) {
            console.error('❌ Failed to inject missing defaults:', e);
            return false;
        }
    }

    /**
     * Get a specific scorecard configuration by ID
     */
    getConfig(id: string): ScorecardConfig | null {
        const configs = this.getAllConfigs();
        const config = configs.find(c => c.id === id);

        if (!config) {
            console.error(`❌ Scorecard config '${id}' not found`);
            return null;
        }

        return config;
    }

    /**
     * Get only active configurations (available for selection)
     */
    getActiveConfigs(): ScorecardConfig[] {
        return this.getAllConfigs().filter(c => c.isActive);
    }

    /**
     * Save or update a scorecard configuration
     */
    saveConfig(config: ScorecardConfig): void {
        try {
            const configs = this.getAllConfigs();
            const existingIndex = configs.findIndex(c => c.id === config.id);

            // Update timestamp
            const updatedConfig = {
                ...config,
                updatedAt: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                // Update existing
                configs[existingIndex] = updatedConfig;
                console.log(`💾 Updated scorecard config: ${config.name}`);
            } else {
                // Add new
                configs.push(updatedConfig);
                console.log(`💾 Created new scorecard config: ${config.name}`);
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
        } catch (error) {
            console.error('❌ Failed to save scorecard config:', error);
            throw error;
        }
    }

    /**
     * Delete a scorecard configuration
     */
    deleteConfig(id: string): void {
        try {
            const configs = this.getAllConfigs();
            const filtered = configs.filter(c => c.id !== id);

            if (filtered.length === configs.length) {
                console.warn(`⚠️ Scorecard config '${id}' not found, nothing to delete`);
                return;
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
            console.log(`🗑️ Deleted scorecard config: ${id}`);
        } catch (error) {
            console.error('❌ Failed to delete scorecard config:', error);
            throw error;
        }
    }

    /**
     * Initialize with default BPO Training scorecard
     * Called on first app load or when no configs exist
     */
    initializeDefaults(): void {
        if (DEFAULT_SCORECARD_MODELS && Array.isArray(DEFAULT_SCORECARD_MODELS)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(DEFAULT_SCORECARD_MODELS));
            console.log(`✅ Initialized ${DEFAULT_SCORECARD_MODELS.length} default scorecards`);
        } else {
            console.error('❌ Failed to load DEFAULT_SCORECARD_MODELS');
        }
    }

    /**
     * Duplicate a scorecard configuration with a new ID
     */
    duplicateConfig(sourceId: string, newName: string): ScorecardConfig | null {
        const source = this.getConfig(sourceId);
        if (!source) {
            return null;
        }

        const newConfig: ScorecardConfig = {
            ...source,
            id: `${sourceId}-copy-${Date.now()}`,
            name: newName,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.saveConfig(newConfig);
        return newConfig;
    }

    /**
     * Get default/fallback configuration ID
     */
    getDefaultConfigId(): string {
        const configs = this.getActiveConfigs();
        if (configs.length === 0) {
            this.initializeDefaults();
            return 'bpo-training-default';
        }
        return configs[0].id;
    }
}

// Export singleton instance
export const scorecardConfigService = new ScorecardConfigService();
