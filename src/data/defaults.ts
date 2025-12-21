import { AppConfig, Category, KPI, ScorecardConfig } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'PlaceHolder', label: 'PlaceHolder', weight: 100 },
];

export const DEFAULT_KPIS: KPI[] = [
    // 1. Test KPI
    {
        id: '1.1',
        categoryId: 'PlaceHolder',
        label: '1.1 PlaceHolder',
        weight: 100,
        description: 'Placeholder',
        scoringLogic: 'linear',
        labels: { done: 'Done', met: 'Met' }
    },
];

export const DEFAULT_VENDORS = [
    { id: 'raya', name: 'Raya' },
    { id: 'xceed', name: 'Xceed' },
    { id: 'tp', name: 'Teleperformance' },
    { id: 'etisalat', name: 'e&' },
    { id: 'intelcia', name: 'Intelcia' },
    { id: 'cnx', name: 'CNX' },
    { id: 'csm', name: 'CSM' },
];

export const DEFAULT_CONFIG: AppConfig = {
    categories: DEFAULT_CATEGORIES,
    kpis: DEFAULT_KPIS,
};

// ============================================================================
// NEW: Tier 1 & Tier 2 Scorecards
// ============================================================================

export const DEFAULT_TIER1_CATEGORIES: Category[] = [
    { id: 't1_trainingExcellence', label: '1. Training Delivery Excellence', weight: 50 },
    { id: 't1_agentPerformance', label: '2. Agent Performance Outcomes', weight: 50 },
];

export const DEFAULT_TIER1_KPIS: KPI[] = [
    // 1. Training Delivery Excellence (50%)
    {
        id: '1.1',
        categoryId: 't1_trainingExcellence',
        label: '1.1 Pre-Certification Attrition',
        weight: 33.33,
        description: 'Pass if attrition < 15%, Fail if ≥15% (Calculation: Agents dropped / Agents started).',
        scoringLogic: 'binary',
        labels: { done: 'Agents Started', met: 'Agents Dropped' }
    },
    {
        id: '1.2',
        categoryId: 't1_trainingExcellence',
        label: '1.2 Certification Pass Rate',
        weight: 33.33,
        description: 'Pass if >=95%, Fail if <95% (Calculation: Agents passed / Agents took certification).',
        scoringLogic: 'binary',
        labels: { done: 'Agents Took Cert', met: 'Agents Passed' }
    },
    {
        id: '1.3',
        categoryId: 't1_trainingExcellence',
        label: '1.3 On-Job Training Delivery',
        weight: 33.34,
        description: 'Score based on training completion (≥94% attendance) / Trainings requested.',
        scoringLogic: 'standard',
        labels: { done: 'Trainings Requested', met: 'Trainings Completed' }
    },

    // 2. Agent Performance Outcomes (50%)
    {
        id: '2.1',
        categoryId: 't1_agentPerformance',
        label: '2.1 Nesting Performance',
        weight: 100,
        description: 'Score based on agents graduated nesting / Total agents started nesting.',
        scoringLogic: 'standard',
        labels: { done: 'Started Nesting', met: 'Graduated Free' }
    }
];

export const DEFAULT_TIER1_SCORECARD: ScorecardConfig = {
    id: 'tier1-billing-v1',
    name: 'Tier 1 — Billing Scorecard',
    description: 'Tracks training delivery excellence, agent performance outcomes, and capacity delivery.',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    tier: 'tier1',
    isDefault: true,
    categories: DEFAULT_TIER1_CATEGORIES,
    kpis: DEFAULT_TIER1_KPIS,
};

export const DEFAULT_TIER2_CATEGORIES: Category[] = [
    { id: 't2_governance', label: 'Monthly Governance', weight: 100 },
];

export const DEFAULT_TIER2_KPIS: KPI[] = [
    {
        id: '3.1',
        categoryId: 't2_governance',
        label: '3.1 Training Plan',
        weight: 20,
        description: 'On-time submissions / Eligible waves.',
        scoringLogic: 'standard',
        labels: { done: 'Eligible Waves', met: 'On-Time Submissions' }
    },
    {
        id: '3.2',
        categoryId: 't2_governance',
        label: '3.2 Certification Tracker',
        weight: 20,
        description: 'Updated within 24 hours / Eligible waves.',
        scoringLogic: 'standard',
        labels: { done: 'Eligible Waves', met: 'Updated on Time' }
    },
    {
        id: '3.3',
        categoryId: 't2_governance',
        label: '3.3 Training Hours Accuracy',
        weight: 20,
        description: 'Accurate and on-time submissions / Inaccurate or late submissions.',
        scoringLogic: 'binary',
        labels: { done: 'Submissions', met: 'Accurate & On-Time' }
    },
    {
        id: '3.4',
        categoryId: 't2_governance',
        label: '3.4 Training Toolkit Readiness',
        weight: 20,
        description: 'Passed audits / Total audits.',
        scoringLogic: 'standard',
        labels: { done: 'Total Audits', met: 'Passed Audits' }
    },
    {
        id: '3.5',
        categoryId: 't2_governance',
        label: '3.5 Training Completion vs Locked FTE',
        weight: 20,
        description: 'HC delivered on committed date / Locked FTE commitment.',
        scoringLogic: 'standard',
        labels: { done: 'Locked FTE', met: 'HC Delivered' }
    }
];

export const DEFAULT_TIER2_SCORECARD: ScorecardConfig = {
    id: 'tier2-governance-v1',
    name: 'Tier 2 — Monthly Governance Scorecard',
    description: 'Tracks monthly governance, accuracy, and compliance.',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    tier: 'tier2',
    isDefault: true,
    categories: DEFAULT_TIER2_CATEGORIES,
    kpis: DEFAULT_TIER2_KPIS,
};

export const DEFAULT_SCORECARD_MODELS: ScorecardConfig[] = [
    DEFAULT_TIER1_SCORECARD,
    DEFAULT_TIER2_SCORECARD,
];

