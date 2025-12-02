import { useMemo } from 'react';

interface ScoreDeltaParams {
    currentScore: number | null;
    currentPeriod: string;
    vendorId: string;
    audits: Record<string, any[]>;
    calculateScore: (vendorId: string, period: string) => { score: number };
}

/**
 * Custom hook to calculate score change from previous period
 * Returns the delta (difference) between current and previous period scores
 */
export function useScoreDelta({
    currentScore,
    currentPeriod,
    vendorId,
    audits,
    calculateScore,
}: ScoreDeltaParams): number | null {
    return useMemo(() => {
        if (currentScore === null) return null;

        const prevDate = new Date(currentPeriod + '-01');
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevPeriod = prevDate.toISOString().slice(0, 7);
        const prevKey = `${vendorId}-${prevPeriod}`;

        if (audits[prevKey] && audits[prevKey].length > 0) {
            const prevResult = calculateScore(vendorId, prevPeriod);
            return currentScore - prevResult.score;
        }

        return null;
    }, [currentScore, currentPeriod, vendorId, audits, calculateScore]);
}
