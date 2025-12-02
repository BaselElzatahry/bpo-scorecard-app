import { useMemo } from 'react';

/**
 * Custom hook to generate available periods for audit selection
 * Includes past months, current month, and future months
 */
export function useAvailablePeriods(
    pastMonths: number = 12,
    futureMonths: number = 1
): string[] {
    return useMemo(() => {
        const periods: string[] = [];
        const today = new Date();

        // Generate past months including current month
        for (let i = pastMonths; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            periods.push(date.toISOString().slice(0, 7)); // YYYY-MM format
        }

        // Generate future months
        for (let i = 1; i <= futureMonths; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            periods.push(date.toISOString().slice(0, 7));
        }

        return periods;
    }, [pastMonths, futureMonths]);
}
