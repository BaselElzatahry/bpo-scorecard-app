export type VendorId = string;
export type CategoryId = string;
export type KpiId = string;

export interface Vendor {
    id: VendorId;
    name: string;
    logo?: string;
    color?: string;
    region?: string;
    isActive?: boolean;
}

export interface Category {
    id: CategoryId;
    label: string;
    weight: number; // 0-100
    description?: string;
}

export interface KPI {
    id: KpiId;
    categoryId: CategoryId;
    label: string;
    description?: string;
    scoringLogic?: 'standard' | 'inverse' | 'binary'; // Default 'standard'
    labels?: {
        done: string; // e.g., "Total Headcount"
        met: string;  // e.g., "Dropped Agents"
    };
    weight: number; // 0-100 relative to category
    targetType?: 'percentage' | 'count' | 'ratio';
}

export interface AuditEntry {
    id: string;
    vendorId: VendorId;
    categoryId: CategoryId;
    kpiId: KpiId;
    period: string; // e.g., "2023-10"
    auditsDone: number;
    auditsMet: number;
    auditsMissed: number;
    commentsForMissed: string;
    attachments?: Array<{
        // New format (IndexedDB reference)
        id?: string;
        name: string;
        type: string;
        size?: number;
        uploadedAt?: string;
        // Old format (base64 - for migration compatibility)
        data?: string;
    }>;
}

export interface AppConfig {
    categories: Category[];
    kpis: KPI[];
}

export interface ScoreResult {
    score: number;
    rag: 'green' | 'amber' | 'red';
    met: number;
    done: number;
    missed: number;
}

export interface CategoryScoreResult extends ScoreResult {
    categoryId: CategoryId;
    kpiScores: Record<KpiId, ScoreResult>;
}

export interface OverallScoreResult extends ScoreResult {
    categoryScores: Record<CategoryId, CategoryScoreResult>;
}

export type AppealStatus = 'pending' | 'approved' | 'rejected' | 'info_requested';

export interface Appeal {
    id: string;
    auditId: string;
    vendorId: VendorId;
    period: string;
    pillarId: CategoryId;
    vendorComments: string;
    attachments?: {
        name: string;
        url: string;
    }[];
    status: AppealStatus;
    adminComments?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AggregatedScoreResult extends OverallScoreResult {
    periodsIncluded: string[];
}

export type RAGStatus = 'green' | 'amber' | 'red';

