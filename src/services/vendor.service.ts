import { Vendor } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Vendor Management Service
 * Handles CRUD operations for vendors with audit integrity protection
 */

export interface VendorWithMetadata extends Vendor {
    color?: string;
    region?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

class VendorService {
    private readonly STORAGE_KEY = 'vendors';

    /**
     * Get all vendors from localStorage
     */
    getVendors(): VendorWithMetadata[] {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load vendors:', error);
            return [];
        }
    }

    /**
     * Get only active vendors
     */
    getActiveVendors(): VendorWithMetadata[] {
        return this.getVendors().filter(v => v.isActive !== false);
    }

    /**
     * Get vendor by ID
     */
    getVendorById(id: string): VendorWithMetadata | null {
        const vendors = this.getVendors();
        return vendors.find(v => v.id === id) || null;
    }

    /**
     * Add a new vendor
     */
    addVendor(
        name: string,
        metadata?: {
            color?: string;
            region?: string;
            logo?: string;
        }
    ): VendorWithMetadata {
        const vendors = this.getVendors();

        // Check for duplicate name
        const existingVendor = vendors.find(
            v => v.name.toLowerCase() === name.toLowerCase() && v.isActive !== false
        );
        if (existingVendor) {
            throw new Error(`Vendor with name "${name}" already exists`);
        }

        const newVendor: VendorWithMetadata = {
            id: `vendor-${uuidv4()}`,
            name: name.trim(),
            logo: metadata?.logo,
            color: metadata?.color,
            region: metadata?.region,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        vendors.push(newVendor);
        this.saveVendors(vendors);

        return newVendor;
    }

    /**
     * Update vendor (rename or update metadata)
     * Vendor ID remains unchanged to preserve audit linkage
     */
    updateVendor(
        id: string,
        updates: {
            name?: string;
            color?: string;
            region?: string;
            logo?: string;
        }
    ): VendorWithMetadata {
        const vendors = this.getVendors();
        const vendorIndex = vendors.findIndex(v => v.id === id);

        if (vendorIndex === -1) {
            throw new Error(`Vendor with ID "${id}" not found`);
        }

        // Check for duplicate name if renaming
        if (updates.name) {
            const duplicateName = vendors.find(
                v => v.id !== id &&
                    v.name.toLowerCase() === updates.name!.toLowerCase() &&
                    v.isActive !== false
            );
            if (duplicateName) {
                throw new Error(`Vendor with name "${updates.name}" already exists`);
            }
        }

        const updatedVendor: VendorWithMetadata = {
            ...vendors[vendorIndex],
            ...updates,
            name: updates.name?.trim() || vendors[vendorIndex].name,
            updatedAt: new Date().toISOString()
        };

        vendors[vendorIndex] = updatedVendor;
        this.saveVendors(vendors);

        return updatedVendor;
    }

    /**
     * Soft delete vendor (maintains audit integrity)
     * Vendor is marked as inactive but data is preserved
     */
    removeVendor(id: string): void {
        const vendors = this.getVendors();
        const vendorIndex = vendors.findIndex(v => v.id === id);

        if (vendorIndex === -1) {
            throw new Error(`Vendor with ID "${id}" not found`);
        }

        // Soft delete - mark as inactive
        vendors[vendorIndex] = {
            ...vendors[vendorIndex],
            isActive: false,
            updatedAt: new Date().toISOString()
        };

        this.saveVendors(vendors);
    }

    /**
     * Hard delete vendor (permanent removal)
     * WARNING: Only use if you're certain there are no linked audits
     */
    hardDeleteVendor(id: string): void {
        const vendors = this.getVendors();
        const filteredVendors = vendors.filter(v => v.id !== id);

        if (filteredVendors.length === vendors.length) {
            throw new Error(`Vendor with ID "${id}" not found`);
        }

        this.saveVendors(filteredVendors);
    }

    /**
     * Restore a soft-deleted vendor
     */
    restoreVendor(id: string): VendorWithMetadata {
        const vendors = this.getVendors();
        const vendorIndex = vendors.findIndex(v => v.id === id);

        if (vendorIndex === -1) {
            throw new Error(`Vendor with ID "${id}" not found`);
        }

        vendors[vendorIndex] = {
            ...vendors[vendorIndex],
            isActive: true,
            updatedAt: new Date().toISOString()
        };

        this.saveVendors(vendors);
        return vendors[vendorIndex];
    }

    /**
     * Check if vendor has any audits
     * Returns count of audits associated with this vendor
     */
    getVendorAuditCount(vendorId: string): number {
        try {
            const auditsJson = localStorage.getItem('audits');
            if (!auditsJson) return 0;

            const audits = JSON.parse(auditsJson);
            let count = 0;

            Object.keys(audits).forEach(key => {
                if (key.startsWith(vendorId + '-')) {
                    count += audits[key].length;
                }
            });

            return count;
        } catch (error) {
            console.error('Failed to count vendor audits:', error);
            return 0;
        }
    }

    /**
     * Save vendors to localStorage
     */
    private saveVendors(vendors: VendorWithMetadata[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vendors));
        } catch (error) {
            console.error('Failed to save vendors:', error);
            throw new Error('Failed to save vendors to storage');
        }
    }

    /**
     * Initialize vendors from default list if empty
     */
    initializeFromDefaults(defaultVendors: Vendor[]): void {
        const existingVendors = this.getVendors();

        if (existingVendors.length === 0) {
            const initializedVendors: VendorWithMetadata[] = defaultVendors.map(v => ({
                ...v,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));

            this.saveVendors(initializedVendors);
            console.log('✅ Initialized vendors from defaults');
        }
    }

    /**
     * Export vendors as JSON
     */
    exportVendors(): string {
        const vendors = this.getVendors();
        return JSON.stringify(vendors, null, 2);
    }

    /**
     * Import vendors from JSON
     * Merges with existing vendors (doesn't overwrite)
     */
    importVendors(jsonData: string): { imported: number; skipped: number } {
        try {
            const importedVendors: VendorWithMetadata[] = JSON.parse(jsonData);
            const existingVendors = this.getVendors();

            let imported = 0;
            let skipped = 0;

            importedVendors.forEach(vendor => {
                const exists = existingVendors.find(v => v.id === vendor.id);
                if (!exists) {
                    existingVendors.push(vendor);
                    imported++;
                } else {
                    skipped++;
                }
            });

            this.saveVendors(existingVendors);

            return { imported, skipped };
        } catch (error) {
            console.error('Failed to import vendors:', error);
            throw new Error('Invalid vendor data format');
        }
    }
}

// Export singleton instance
export const vendorService = new VendorService();
