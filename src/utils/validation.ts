import { AuditEntry, KPI } from '../types';

export interface ValidationError {
    field: string;
    message: string;
    kpiId?: string;
    severity: 'error' | 'warning';
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

/**
 * Validate numeric score input
 */
export const validateScore = (
    value: number,
    field: 'auditsDone' | 'auditsMet' | 'auditsMissed',
    kpi: KPI,
    relatedValues?: { auditsDone?: number; auditsMet?: number; auditsMissed?: number }
): string | null => {
    // Check if negative
    if (value < 0) {
        return `${field} cannot be negative`;
    }

    // Check if not a whole number  
    if (!Number.isInteger(value)) {
        return `${field} must be a whole number`;
    }

    // Check if met > done
    if (field === 'auditsMet' && relatedValues?.auditsDone !== undefined && value > relatedValues.auditsDone) {
        return 'Audits met cannot exceed audits done';
    }

    // Check if missed > done
    if (field === 'auditsMissed' && relatedValues?.auditsDone !== undefined && value > relatedValues.auditsDone) {
        return 'Audits missed cannot exceed audits done';
    }

    // For standard logic, validate done = met + missed
    if (kpi.scoringLogic === 'standard' && relatedValues) {
        const { auditsDone, auditsMet, auditsMissed } = relatedValues;
        if (auditsDone !== undefined && auditsMet !== undefined && auditsMissed !== undefined) {
            if (auditsMet + auditsMissed !== auditsDone) {
                return 'Met + Missed must equal Done for standard scoring';
            }
        }
    }

    return null; // Valid
};

/**
 * Image validation constants
 */
export const IMAGE_VALIDATION = {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxTotalSize: 50 * 1024 * 1024, // 50MB per audit
    maxFiles: 10,
};

/**
 * Validate image/file upload
 */
export const validateImageUpload = (
    file: File,
    currentAttachments: any[]
): string | null => {
    // Check file type
    if (!IMAGE_VALIDATION.allowedTypes.includes(file.type)) {
        const allowedList = IMAGE_VALIDATION.allowedExtensions.join(', ');
        return `Invalid file type "${file.type}". Allowed types: ${allowedList}`;
    }

    // Check file size
    if (file.size > IMAGE_VALIDATION.maxFileSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const maxMB = IMAGE_VALIDATION.maxFileSize / (1024 * 1024);
        return `File too large (${sizeMB}MB). Maximum: ${maxMB}MB`;
    }

    // Check total count
    if (currentAttachments.length >= IMAGE_VALIDATION.maxFiles) {
        return `Maximum ${IMAGE_VALIDATION.maxFiles} files allowed per KPI`;
    }

    // Check total size
    const currentTotalSize = currentAttachments.reduce((sum, att) => {
        // If attachment has a size property, use it; otherwise estimate from base64
        if (att.size) return sum + att.size;
        if (att.data) {
            // Base64 string size approximation
            const base64Size = att.data.length * 0.75; // Base64 is ~33% larger
            return sum + base64Size;
        }
        return sum;
    }, 0);

    if (currentTotalSize + file.size > IMAGE_VALIDATION.maxTotalSize) {
        const totalMB = ((currentTotalSize + file.size) / (1024 * 1024)).toFixed(2);
        const maxMB = IMAGE_VALIDATION.maxTotalSize / (1024 * 1024);
        return `Total attachment size (${totalMB}MB) exceeds ${maxMB}MB limit`;
    }

    return null; // Valid
};

/**
 * Validate comments for failed items
 */
export const validateComments = (
    auditEntry: AuditEntry,
    kpi: KPI
): string | null => {
    // Binary logic: if met = 0, comment required
    if (kpi.scoringLogic === 'binary' && auditEntry.auditsMet === 0) {
        if (!auditEntry.commentsForMissed || auditEntry.commentsForMissed.trim().length < 10) {
            return 'Please provide a detailed comment (at least 10 characters) explaining why this item failed';
        }
    }

    // Standard/Inverse logic: if there are missed items, comment required
    if ((kpi.scoringLogic === 'standard' || kpi.scoringLogic === 'inverse') && auditEntry.auditsMissed > 0) {
        if (!auditEntry.commentsForMissed || auditEntry.commentsForMissed.trim().length < 10) {
            return 'Please provide a detailed comment (at least 10 characters) explaining the missed items';
        }
    }

    // Check maximum length
    if (auditEntry.commentsForMissed && auditEntry.commentsForMissed.length > 500) {
        return 'Comment is too long (maximum 500 characters)';
    }

    return null; // Valid
};

/**
 * Validate single audit entry
 */
export const validateAuditEntry = (
    entry: AuditEntry,
    kpi: KPI
): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validate auditsDone
    if (entry.auditsDone < 0) {
        errors.push({
            field: 'auditsDone',
            message: 'Audits done cannot be negative',
            kpiId: kpi.id,
            severity: 'error'
        });
    }

    // Validate auditsMet
    if (entry.auditsMet < 0) {
        errors.push({
            field: 'auditsMet',
            message: 'Audits met cannot be negative',
            kpiId: kpi.id,
            severity: 'error'
        });
    }

    if (entry.auditsMet > entry.auditsDone) {
        errors.push({
            field: 'auditsMet',
            message: 'Audits met cannot exceed audits done',
            kpiId: kpi.id,
            severity: 'error'
        });
    }

    // Validate auditsMissed
    if (entry.auditsMissed < 0) {
        errors.push({
            field: 'auditsMissed',
            message: 'Audits missed cannot be negative',
            kpiId: kpi.id,
            severity: 'error'
        });
    }

    // Standard logic validation
    if (kpi.scoringLogic === 'standard') {
        if (entry.auditsMet + entry.auditsMissed !== entry.auditsDone) {
            errors.push({
                field: 'calculation',
                message: 'Met + Missed must equal Done',
                kpiId: kpi.id,
                severity: 'error'
            });
        }
    }

    // Comments validation
    const commentError = validateComments(entry, kpi);
    if (commentError) {
        errors.push({
            field: 'commentsForMissed',
            message: commentError,
            kpiId: kpi.id,
            severity: 'error'
        });
    }

    return errors;
};

/**
 * Validate complete audit before finalization
 */
export const validateAuditCompletion = (
    entries: AuditEntry[],
    kpis: KPI[]
): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check all KPIs have entries
    const entryKpiIds = new Set(entries.map(e => e.kpiId));
    const missingKpis = kpis.filter(kpi => !entryKpiIds.has(kpi.id));

    if (missingKpis.length > 0) {
        missingKpis.forEach(kpi => {
            errors.push({
                field: 'kpi',
                message: `KPI "${kpi.label}" has no audit data`,
                kpiId: kpi.id,
                severity: 'error'
            });
        });
    }

    // Check all entries have auditsDone > 0
    const incompleteEntries = entries.filter(e => e.auditsDone === 0);
    if (incompleteEntries.length > 0) {
        incompleteEntries.forEach(entry => {
            const kpi = kpis.find(k => k.id === entry.kpiId);
            errors.push({
                field: 'auditsDone',
                message: `"${kpi?.label}" has no audits done`,
                kpiId: entry.kpiId,
                severity: 'error'
            });
        });
    }

    // Validate each entry
    entries.forEach(entry => {
        const kpi = kpis.find(k => k.id === entry.kpiId);
        if (kpi) {
            const entryErrors = validateAuditEntry(entry, kpi);
            errors.push(...entryErrors);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Check vendor-period uniqueness (for duplicate prevention)
 */
export const validateVendorPeriodUniqueness = (
    vendorId: string,
    period: string,
    existingAudits: Record<string, AuditEntry[]>
): boolean => {
    const key = `${vendorId}-${period}`;
    return !existingAudits[key] || existingAudits[key].length === 0;
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: ValidationError[]): string => {
    if (errors.length === 0) return '';

    const errorsByKpi: Record<string, ValidationError[]> = {};

    errors.forEach(error => {
        const kpiId = error.kpiId || 'general';
        if (!errorsByKpi[kpiId]) {
            errorsByKpi[kpiId] = [];
        }
        errorsByKpi[kpiId].push(error);
    });

    let message = '';
    Object.entries(errorsByKpi).forEach(([kpiId, kpiErrors]) => {
        if (kpiId === 'general') {
            message += kpiErrors.map(e => `• ${e.message}`).join('\n') + '\n';
        } else {
            message += `KPI ${kpiId}:\n`;
            message += kpiErrors.map(e => `  • ${e.message}`).join('\n') + '\n';
        }
    });

    return message;
};
