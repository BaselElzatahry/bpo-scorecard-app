/**
 * Utility function to format period string (YYYY-MM) into readable date
 */
export function formatPeriod(period: string): string {
    const date = new Date(period + '-01');
    return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Utility function to get current period in YYYY-MM format
 */
export function getCurrentPeriod(): string {
    const today = new Date();
    return today.toISOString().slice(0, 7);
}

/**
 * Utility function to add months to a period
 */
export function addMonthsToPeriod(period: string, months: number): string {
    const date = new Date(period + '-01');
    date.setMonth(date.getMonth() + months);
    return date.toISOString().slice(0, 7);
}
