import { AuditEntry } from '../types';

/**
 * IndexedDB Service for File Attachment Storage
 * Provides efficient storage for file attachments using IndexedDB
 * Replaces base64 localStorage storage to eliminate QuotaExceededError
 */

const DB_NAME = 'bpo-scorecard-db';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

export interface AttachmentRecord {
    id: string;
    blob: Blob;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
    kpiId?: string;
    auditKey?: string;
}

export interface AttachmentMetadata {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
}

class IndexedDBService {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize IndexedDB database
     */
    private async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create attachments object store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    objectStore.createIndex('auditKey', 'auditKey', { unique: false });
                    objectStore.createIndex('kpiId', 'kpiId', { unique: false });
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Add an attachment to IndexedDB
     */
    async addAttachment(
        file: File | Blob,
        metadata: {
            id: string;
            name: string;
            auditKey?: string;
            kpiId?: string;
        }
    ): Promise<AttachmentMetadata> {
        await this.init();

        const record: AttachmentRecord = {
            id: metadata.id,
            blob: file,
            name: metadata.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            auditKey: metadata.auditKey,
            kpiId: metadata.kpiId
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(record);

            request.onsuccess = () => {
                resolve({
                    id: record.id,
                    name: record.name,
                    type: record.type,
                    size: record.size,
                    uploadedAt: record.uploadedAt
                });
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get an attachment from IndexedDB
     */
    async getAttachment(id: string): Promise<AttachmentRecord | null> {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete an attachment from IndexedDB
     */
    async deleteAttachment(id: string): Promise<void> {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all attachments for a specific audit
     */
    async getAttachmentsByAuditKey(auditKey: string): Promise<AttachmentRecord[]> {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('auditKey');
            const request = index.getAll(auditKey);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all attachments
     */
    async getAllAttachments(): Promise<AttachmentRecord[]> {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Convert base64 data URI to Blob
     */
    base64ToBlob(base64: string, mimeType: string): Blob {
        // Remove data URI prefix if present
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    /**
     * Generate unique attachment ID
     */
    generateAttachmentId(auditKey: string, kpiId: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `${auditKey}_${kpiId}_${timestamp}_${random}`;
    }

    /**
     * Find all attachments with base64 data in audits
     */
    private findAttachmentsWithBase64(audits: Record<string, AuditEntry[]>): Array<{
        auditKey: string;
        entryIndex: number;
        attachmentIndex: number;
        attachment: any;
    }> {
        const needsMigration: Array<{
            auditKey: string;
            entryIndex: number;
            attachmentIndex: number;
            attachment: any;
        }> = [];

        Object.entries(audits).forEach(([auditKey, entries]) => {
            entries.forEach((entry, entryIndex) => {
                if (entry.attachments && Array.isArray(entry.attachments)) {
                    entry.attachments.forEach((attachment, attachmentIndex) => {
                        // Check if attachment has base64 data (old format)
                        if (attachment.data && typeof attachment.data === 'string') {
                            needsMigration.push({
                                auditKey,
                                entryIndex,
                                attachmentIndex,
                                attachment
                            });
                        }
                    });
                }
            });
        });

        return needsMigration;
    }

    /**
     * Automatically migrate base64 attachments to IndexedDB
     * This runs once on app initialization
     */
    async migrateBase64Attachments(audits: Record<string, AuditEntry[]>): Promise<{
        audits: Record<string, AuditEntry[]>;
        migrated: boolean;
        count: number;
    }> {
        // Check if migration already done
        const migrationFlag = localStorage.getItem('attachments_migrated');
        if (migrationFlag === 'true') {
            return { audits, migrated: false, count: 0 };
        }

        // Find all attachments with base64 data
        const needsMigration = this.findAttachmentsWithBase64(audits);

        if (needsMigration.length === 0) {
            localStorage.setItem('attachments_migrated', 'true');
            return { audits, migrated: false, count: 0 };
        }

        console.log(`🔄 Migrating ${needsMigration.length} attachments to IndexedDB...`);

        // Create a deep copy of audits to avoid mutations
        const migratedAudits = JSON.parse(JSON.stringify(audits));

        // Convert each base64 attachment to Blob and store in IndexedDB
        for (const { auditKey, entryIndex, attachmentIndex, attachment } of needsMigration) {
            try {
                const blob = this.base64ToBlob(attachment.data, attachment.type);
                const attachmentId = this.generateAttachmentId(
                    auditKey,
                    migratedAudits[auditKey][entryIndex].kpiId
                );

                // Store in IndexedDB
                await this.addAttachment(blob, {
                    id: attachmentId,
                    name: attachment.name,
                    auditKey,
                    kpiId: migratedAudits[auditKey][entryIndex].kpiId
                });

                // Replace attachment in audit entry (remove base64 data, add id)
                migratedAudits[auditKey][entryIndex].attachments[attachmentIndex] = {
                    id: attachmentId,
                    name: attachment.name,
                    type: attachment.type,
                    size: attachment.size || blob.size,
                    uploadedAt: attachment.uploadedAt || new Date().toISOString()
                };
            } catch (error) {
                console.error(`Failed to migrate attachment: ${attachment.name}`, error);
                // Continue with other attachments even if one fails
            }
        }

        // Save migrated audits back to localStorage (now without base64)
        localStorage.setItem('audits', JSON.stringify(migratedAudits));
        localStorage.setItem('attachments_migrated', 'true');

        console.log(`✅ Successfully migrated ${needsMigration.length} attachments to IndexedDB`);

        return {
            audits: migratedAudits,
            migrated: true,
            count: needsMigration.length
        };
    }

    /**
     * Get storage quota information
     */
    async getStorageQuota(): Promise<{ used: number; total: number; percentage: number } | null> {
        if (!navigator.storage || !navigator.storage.estimate) {
            return null;
        }

        try {
            const estimate = await navigator.storage.estimate();
            const used = estimate.usage || 0;
            const total = estimate.quota || 0;
            const percentage = total > 0 ? (used / total) * 100 : 0;

            return { used, total, percentage };
        } catch (error) {
            console.error('Failed to get storage quota:', error);
            return null;
        }
    }

    /**
     * Clear all attachments (for testing/debugging)
     */
    async clearAllAttachments(): Promise<void> {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
