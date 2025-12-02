import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { RAGStatus } from '../types';

export interface AuditStatusInfo {
    key: string;
    vendorId: string;
    vendorName: string;
    period: string;
    status: 'draft' | 'finalized' | 'appealed';
    score: number;
    rag: RAGStatus;
    entryCount: number;
    hasData: boolean;
}

/**
 * Custom hook to get all audit statuses with computed information
 */
export function useAuditStatuses(): AuditStatusInfo[] {
    const { audits, auditStatus, vendors, calculateScore } = useApp();

    return useMemo(() => {
        const statuses: AuditStatusInfo[] = [];

        Object.keys(audits).forEach((key) => {
            const [vendorId, period] = key.split('-');
            const vendor = vendors.find((v) => v.id === vendorId);
            const entries = audits[key];
            const status = auditStatus[key];

            if (entries && entries.length > 0) {
                const scoreResult = calculateScore(vendorId, period);

                statuses.push({
                    key,
                    vendorId,
                    vendorName: vendor?.name || 'Unknown',
                    period,
                    status: status || 'draft',
                    score: scoreResult.score,
                    rag: scoreResult.rag,
                    entryCount: entries.length,
                    hasData: true,
                });
            }
        });

        // Sort by period (newest first), then by vendor name
        return statuses.sort((a, b) => {
            const periodCompare = b.period.localeCompare(a.period);
            if (periodCompare !== 0) return periodCompare;
            return a.vendorName.localeCompare(b.vendorName);
        });
    }, [audits, auditStatus, vendors, calculateScore]);
}
