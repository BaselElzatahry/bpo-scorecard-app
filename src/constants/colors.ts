/**
 * Color constants for RAG (Red-Amber-Green) status indicators
 */
export const RAG_COLORS = {
    green: {
        bg: 'bg-green-50',
        bgHover: 'hover:bg-green-100',
        text: 'text-green-600',
        border: 'border-green-200',
        badge: 'bg-green-500/25 text-green-300',
        gradient: 'from-green-400 to-green-500',
    },
    amber: {
        bg: 'bg-amber-50',
        bgHover: 'hover:bg-amber-100',
        text: 'text-amber-600',
        border: 'border-amber-200',
        badge: 'bg-amber-500/25 text-amber-300',
        gradient: 'from-amber-400 to-amber-500',
    },
    red: {
        bg: 'bg-red-50',
        bgHover: 'hover:bg-red-100',
        text: 'text-red-600',
        border: 'border-red-200',
        badge: 'bg-red-500/25 text-red-300',
        gradient: 'from-red-400 to-red-500',
    },
} as const;

export type RAGStatus = keyof typeof RAG_COLORS;
