/**
 * Enhanced Configuration Type System
 * 
 * This module defines the comprehensive type system for the modular,
 * department-agnostic configuration framework.
 */

// ============================================================================
// Scoring Logic Types
// ============================================================================

export type ScoringLogicType =
    | 'standard'      // Current 95/85/70/50 → 100/80/60/40/30 bands
    | 'binary'        // Pass/Fail (100% = 100, else 0)
    | 'inverse'       // Higher percentage is worse (e.g., attrition)
    | 'linear'        // Direct percentage mapping (score = percentage)
    | 'threshold'     // Single threshold (above/below)
    | 'custom-bands'  // User-defined scoring bands
    | 'formula';      // Custom mathematical formula

// ============================================================================
// Custom Bands
// ============================================================================

export interface ScoringBand {
    id: string;
    minPercentage: number;  // 0-100 (inclusive)
    maxPercentage: number;  // 0-100 (inclusive)
    score: number;          // 0-100 (the score to assign)
}

export interface CustomBandsConfig {
    bands: ScoringBand[];
    description?: string;
}

// ============================================================================
// Formula Logic
// ============================================================================

export interface FormulaVariable {
    name: 'percentage' | 'met' | 'done' | 'missed';
    description: string;
    example: number;
}

export interface FormulaLogic {
    expression: string;  // e.g., "(percentage - 50) * 2"
    description?: string;
    variables: FormulaVariable[];
}

export const FORMULA_VARIABLES: FormulaVariable[] = [
    { name: 'percentage', description: 'Compliance percentage (met/done * 100)', example: 75.5 },
    { name: 'met', description: 'Number of audits met', example: 15 },
    { name: 'done', description: 'Total number of audits done', example: 20 },
    { name: 'missed', description: 'Number of audits missed', example: 5 }
];

// ============================================================================
// Threshold Logic
// ============================================================================

export interface ThresholdConfig {
    threshold: number;      // The cutoff percentage (0-100)
    aboveScore: number;     // Score if >= threshold
    belowScore: number;     // Score if < threshold
}

// ============================================================================
// RAG Thresholds
// ============================================================================

export interface RAGThresholds {
    green: number;   // Score >= this = green
    amber: number;   // Score >= this (but < green) = amber
    // red is anything below amber
}

export const DEFAULT_RAG_THRESHOLDS: RAGThresholds = {
    green: 95,
    amber: 85
};

// ============================================================================
// Enhanced KPI with Scoring Logic
// ============================================================================

export interface ScoringLogicConfig {
    type: ScoringLogicType;

    // Configuration for specific logic types
    customBands?: CustomBandsConfig;
    formula?: FormulaLogic;
    threshold?: ThresholdConfig;

    // Optional override of global RAG thresholds
    ragThresholds?: RAGThresholds;
}

// Re-export base types from main types.ts for convenience
export type { KPI, Category, AppConfig } from '../types';

// ============================================================================
// Enhanced KPI (extends base KPI)
// ============================================================================

export interface EnhancedKPI {
    id: string;
    categoryId: string;
    label: string;
    description?: string;
    weight: number;

    // Legacy field (kept for backward compatibility)
    scoringLogic?: 'standard' | 'inverse' | 'binary';

    // New enhanced scoring configuration
    scoringConfig?: ScoringLogicConfig;

    // Custom labels for inputs
    labels?: {
        done: string;
        met: string;
    };

    // Additional metadata
    notes?: string;
    targetType?: 'percentage' | 'count' | 'ratio';
}

// ============================================================================
// Enhanced App Configuration
// ============================================================================

export interface EnhancedCategory {
    id: string;
    label: string;
    weight: number;
    description?: string;
    icon?: string;
    color?: string;
}

export interface GlobalRAGSettings {
    green: number;
    amber: number;
    applyToAll?: boolean;  // If true, override all KPI-level thresholds
}

export interface EnhancedAppConfig {
    version: number;  // Config schema version (2 for enhanced)
    categories: EnhancedCategory[];
    kpis: EnhancedKPI[];
    globalRAGSettings?: GlobalRAGSettings;
    metadata?: {
        name?: string;
        department?: string;
        lastModified?: string;
        createdBy?: string;
    };
}

// ============================================================================
// Template System
// ============================================================================

export interface ConfigTemplate {
    id: string;
    name: string;
    description: string;
    department: string;  // e.g., "QA", "CX", "Training", "BPO"
    config: EnhancedAppConfig;
    createdAt: string;
    updatedAt: string;
    isBuiltIn?: boolean;  // True for pre-packaged templates
    tags?: string[];
}

export interface TemplateMetadata {
    id: string;
    name: string;
    description: string;
    department: string;
    isBuiltIn?: boolean;
    tags?: string[];
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

// ============================================================================
// Scoring Logic Metadata (for UI)
// ============================================================================

export interface ScoringLogicMetadata {
    type: ScoringLogicType;
    label: string;
    description: string;
    icon?: string;
    requiresConfig: boolean;  // Does it need additional configuration?
    examples?: string[];
}

export const SCORING_LOGIC_METADATA: Record<ScoringLogicType, ScoringLogicMetadata> = {
    'standard': {
        type: 'standard',
        label: 'Standard Bands',
        description: 'Default 5-tier scoring: 95%→100, 85%→80, 70%→60, 50%→40, <50%→30',
        requiresConfig: false,
        examples: ['95% → Score: 100', '75% → Score: 60', '25% → Score: 30']
    },
    'binary': {
        type: 'binary',
        label: 'Binary (Pass/Fail)',
        description: 'Only 100% compliance scores 100, everything else scores 0',
        requiresConfig: false,
        examples: ['100% → Score: 100', '99% → Score: 0', '50% → Score: 0']
    },
    'inverse': {
        type: 'inverse',
        label: 'Inverse (Lower is Better)',
        description: 'For metrics where lower values are better (e.g., attrition, defects)',
        requiresConfig: false,
        examples: ['5% → Score: 100', '15% → Score: 60', '25% → Score: 30']
    },
    'linear': {
        type: 'linear',
        label: 'Linear (Direct %)',
        description: 'Score equals the percentage directly (no bands)',
        requiresConfig: false,
        examples: ['95% → Score: 95', '75% → Score: 75', '50% → Score: 50']
    },
    'threshold': {
        type: 'threshold',
        label: 'Threshold',
        description: 'Single cutoff point with different scores above and below',
        requiresConfig: true,
        examples: ['Threshold: 80% | Above: 100, Below: 30']
    },
    'custom-bands': {
        type: 'custom-bands',
        label: 'Custom Bands',
        description: 'Define your own percentage ranges and scores',
        requiresConfig: true,
        examples: ['0-50%→20, 51-80%→60, 81-100%→100']
    },
    'formula': {
        type: 'formula',
        label: 'Formula',
        description: 'Write a custom mathematical formula for scoring',
        requiresConfig: true,
        examples: ['(percentage - 50) * 2', 'percentage * 1.2', 'percentage >= 95 ? 100 : 30']
    }
};

// ============================================================================
// Helper Types
// ============================================================================

export interface PreviewTestCase {
    percentage: number;
    expectedScore?: number;
    label: string;
}

export const DEFAULT_PREVIEW_CASES: PreviewTestCase[] = [
    { percentage: 0, label: 'Complete Failure' },
    { percentage: 25, label: 'Poor' },
    { percentage: 50, label: 'Below Average' },
    { percentage: 75, label: 'Good' },
    { percentage: 95, label: 'Excellent' },
    { percentage: 100, label: 'Perfect' }
];
