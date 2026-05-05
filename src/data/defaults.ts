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

// ============================================================================
// V2.0: GCC Vendor Training Scorecard (New Model)
// Source: https://km.sankuai.com/collabpage/2749138324
// Section 1 – Onboarding Performance (55%): NH (30%) + Nesting (25%)
// Section 2 – Ongoing Training & Compliance (45%): SOP (15%) + MKC (15%) + Refresher (15%)
// Dynamic Weight Redistribution: NA pillars redistribute weight within their section.
// ============================================================================

export const V2_CATEGORIES: Category[] = [
    {
        id: 'v2_nh',
        label: '1. New Hire (NH)',
        weight: 30,
        description: 'section:onboarding | Onboarding training for new agents. Weight redistributes within Section 1 if NA.',
    },
    {
        id: 'v2_nesting',
        label: '2. Nesting',
        weight: 25,
        description: 'section:onboarding | Agent nesting performance after initial training. Weight redistributes within Section 1 if NA.',
    },
    {
        id: 'v2_sop',
        label: '3. SOP (On-Job Training)',
        weight: 15,
        description: 'section:ongoing | SOP update cascading and quiz compliance. Weight redistributes within Section 2 if NA.',
    },
    {
        id: 'v2_mkc',
        label: '4. MKC (On-Job Training)',
        weight: 15,
        description: 'section:ongoing | Monthly Knowledge Check pass and participation rates. Weight redistributes within Section 2 if NA.',
    },
    {
        id: 'v2_refresher',
        label: '5. Refresher (On-Job Training)',
        weight: 15,
        description: 'section:ongoing | Refresher training success and adherence rates. Weight redistributes within Section 2 if NA.',
    },
];

export const V2_KPIS: KPI[] = [
    // ── Section 1: New Hire (30% of total) ──────────────────────────────────
    // KPI weights below are relative within the NH category (must sum to 100)
    // NH has 4 KPIs with pillar weights: 20%, 50%, 20%, 10% → sum = 100%
    {
        id: 'v2_nh_1',
        categoryId: 'v2_nh',
        label: '1.1 NH Pre-Certification Attrition',
        weight: 20,
        description: 'Pass if <10% attrition, Fail if ≥10%. (Agents dropped before certification / Agents started training). Only agents whose nesting start date falls in the respective month are counted.',
        scoringLogic: 'threshold',
        scoringConfig: {
            type: 'threshold',
            threshold: { threshold: 90, aboveScore: 100, belowScore: 0 },
        },
        labels: { done: 'Agents Started', met: 'Agents Retained' },
    },
    {
        id: 'v2_nh_2',
        categoryId: 'v2_nh',
        label: '1.2 NH Certification Pass Rate',
        weight: 50,
        description: 'Linear scoring. (Agents passed / Agents took certification). Only agents whose nesting start date falls in the respective month are counted.',
        scoringLogic: 'linear',
        scoringConfig: { type: 'linear' },
        labels: { done: 'Took Certification', met: 'Agents Passed' },
    },
    {
        id: 'v2_nh_3',
        categoryId: 'v2_nh',
        label: '1.3 NH End-of-Class (EOC) Survey Completion Rate',
        weight: 20,
        description: 'Linear scoring. (Agents completed survey / Agents graduated to nesting phase). Only agents whose nesting start date falls in the respective month are counted.',
        scoringLogic: 'linear',
        scoringConfig: { type: 'linear' },
        labels: { done: 'Graduated to Nesting', met: 'Completed Survey' },
    },
    {
        id: 'v2_nh_4',
        categoryId: 'v2_nh',
        label: '1.4 NH Trainer Observation Completion Rate',
        weight: 10,
        description: 'Pass if ≥90%, Fail if <90%. (Training observations completed / Required training observations). 1 observation expected per wave. Only waves with nesting start date in the respective month are counted.',
        scoringLogic: 'threshold',
        scoringConfig: {
            type: 'threshold',
            threshold: { threshold: 90, aboveScore: 100, belowScore: 0 },
        },
        labels: { done: 'Required Observations', met: 'Completed' },
    },

    // ── Section 1: Nesting (25% of total) ───────────────────────────────────
    // KPI weights: 80% + 20% = 100%
    {
        id: 'v2_nesting_1',
        categoryId: 'v2_nesting',
        label: '2.1 Nesting Passing Rate',
        weight: 80,
        description: 'Linear scoring. (Agents graduated nesting per pre-defined criteria / Total agents started nesting). Only agents whose nesting end date falls in the respective month are counted.',
        scoringLogic: 'linear',
        scoringConfig: { type: 'linear' },
        labels: { done: 'Agents Started Nesting', met: 'Agents Graduated Nesting' },
    },
    {
        id: 'v2_nesting_2',
        categoryId: 'v2_nesting',
        label: '2.2 Nesting Survey Completion Rate',
        weight: 20,
        description: 'Linear scoring. (Agents submitted survey / Total agents passed nesting phase). Only agents whose nesting end date falls in the respective month are counted.',
        scoringLogic: 'linear',
        scoringConfig: { type: 'linear' },
        labels: { done: 'Agents Passed Nesting', met: 'Agents Submitted Survey' },
    },

    // ── Section 2: SOP (15% of total) ───────────────────────────────────────
    // KPI weights: 60% + 40% = 100%
    {
        id: 'v2_sop_1',
        categoryId: 'v2_sop',
        label: '3.1 OJT SOP Update Quiz Pass Rate',
        weight: 60,
        description: 'Pass if ≥90%, Fail if <90%. (Agents passed / Agents took exam). Average passing rate across all LOBs/Regions for all SOP updates effective in the respective month.',
        scoringLogic: 'threshold',
        scoringConfig: {
            type: 'threshold',
            threshold: { threshold: 90, aboveScore: 100, belowScore: 0 },
        },
        labels: { done: 'Agents Took SOP Quiz', met: 'Agents Passed SOP Quiz' },
    },
    {
        id: 'v2_sop_2',
        categoryId: 'v2_sop',
        label: '3.2 OJT SOP Update Completion Rate',
        weight: 40,
        description: 'Linear scoring. (SOP updates completed with ≥94% attendance / SOP updates cascaded from regional training team). Only updates with effective date in the respective month are counted.',
        scoringLogic: 'linear',
        scoringConfig: { type: 'linear' },
        labels: { done: 'SOP Updates Cascaded', met: 'SOP Updates Completed (≥94% attendance)' },
    },

    // ── Section 2: MKC (15% of total) ───────────────────────────────────────
    // KPI weights: 60% + 40% = 100%
    {
        id: 'v2_mkc_1',
        categoryId: 'v2_mkc',
        label: '4.1 OJT MKC Pass Rate',
        weight: 60,
        description: 'Pass if ≥85%, Fail if <85%. (Agents passed / Agents took exam). Average passing rate across all LOBs/Regions for all MKCs conducted during the respective month.',
        scoringLogic: 'threshold',
        scoringConfig: {
            type: 'threshold',
            threshold: { threshold: 85, aboveScore: 100, belowScore: 0 },
        },
        labels: { done: 'Agents Took MKC Exam', met: 'Agents Passed MKC' },
    },
    {
        id: 'v2_mkc_2',
        categoryId: 'v2_mkc',
        label: '4.2 OJT MKC Participation Rate',
        weight: 40,
        description: 'Pass if ≥94%, Fail if <94%. (Agents took exam / Official HC for all LOBs). Completion rate calculated on the 15th of the month (official DDL). Exceptions require regional training team approval.',
        scoringLogic: 'threshold',
        scoringConfig: {
            type: 'threshold',
            threshold: { threshold: 94, aboveScore: 100, belowScore: 0 },
        },
        labels: { done: 'Official HC (All LOBs)', met: 'Agents Took MKC Exam' },
    },

    // ── Section 2: Refresher (15% of total) ─────────────────────────────────
    // KPI weights: 60% + 40% = 100%
    {
        id: 'v2_refresher_1',
        categoryId: 'v2_refresher',
        label: '5.1 OJT Refresher Successful Rate (RSR)',
        weight: 60,
        description: 'Pass if ≥80%, Fail if <80%. (Successful refresher trainings / Total refresher trainings conducted). Results measured in first 2 weeks of current month based on targets from previous month\'s refreshers.',
        scoringLogic: 'threshold',
        scoringConfig: {
            type: 'threshold',
            threshold: { threshold: 80, aboveScore: 100, belowScore: 0 },
        },
        labels: { done: 'Total Refresher Trainings Conducted', met: 'Successful Refresher Trainings' },
    },
    {
        id: 'v2_refresher_2',
        categoryId: 'v2_refresher',
        label: '5.2 OJT Refresher Adherence Rate',
        weight: 40,
        description: 'Pass if ≥90%, Fail if <90%. (Agents graduated from refresher / Agents planned for refresher). Accounts for all refresher trainings across all applicable LOBs/Regions throughout the month.',
        scoringLogic: 'threshold',
        scoringConfig: {
            type: 'threshold',
            threshold: { threshold: 90, aboveScore: 100, belowScore: 0 },
        },
        labels: { done: 'Agents Planned for Refresher', met: 'Agents Graduated from Refresher' },
    },
];

export const V2_SCORECARD: ScorecardConfig = {
    id: 'gcc-vendor-scorecard-v2',
    name: 'GCC Vendor Training Scorecard V2.0',
    description: 'Rebalanced scorecard ensuring continuous training accountability. Section 1 – Onboarding (NH 30% + Nesting 25%). Section 2 – Ongoing Training (SOP 15% + MKC 15% + Refresher 15%). Supports dynamic weight redistribution when pillars are N/A.',
    department: 'BPO Training',
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    tier: 'tier1',
    isDefault: true,
    categories: V2_CATEGORIES,
    kpis: V2_KPIS,
};

export const DEFAULT_SCORECARD_MODELS: ScorecardConfig[] = [
    V2_SCORECARD,
    DEFAULT_TIER1_SCORECARD,
    DEFAULT_TIER2_SCORECARD,
];

