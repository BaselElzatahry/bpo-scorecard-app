import { AppConfig, Category, KPI } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'trainingDelivery', label: 'Training Delivery', weight: 25 },
    { id: 'toolsReadiness', label: 'Tools & Access Readiness', weight: 10 },
    { id: 'trackerCompliance', label: 'Tracker Management Compliance', weight: 10 },
    { id: 'wbrs', label: 'WBRs', weight: 20 },
    { id: 'trainingPerformance', label: 'Training Performance', weight: 25 },
    { id: 'vendorBehavior', label: 'Vendor Management Behavior', weight: 10 },
];

export const DEFAULT_KPIS: KPI[] = [
    // 1. Training Delivery (25%)
    {
        id: '1.1',
        categoryId: 'trainingDelivery',
        label: '1.1 Training Completion (NH & Upskill)',
        weight: 25,
        description: 'Score = (Training classes completed on time / Total classes planned). Completion is counted only if delivered as per agreed training plan and schedule.',
        scoringLogic: 'standard',
        labels: { done: 'Classes Planned', met: 'Classes Completed' }
    },
    {
        id: '1.2',
        categoryId: 'trainingDelivery',
        label: '1.2 On-Job Training',
        weight: 25,
        description: 'Raw completion = Total number of trainings completed / Total number of trainings requested. A training is counted as complete only if at least 94% of targeted HC attended or were covered.',
        scoringLogic: 'standard',
        labels: { done: 'Trainings Requested', met: 'Trainings Completed' }
    },
    {
        id: '1.3',
        categoryId: 'trainingDelivery',
        label: '1.3 Attrition Rate',
        weight: 25,
        description: 'Attrition rate = Agents dropped before certification / Total agents who started the training phase. Vendor passes when attrition rate < 15%.',
        scoringLogic: 'inverse',
        labels: { done: 'Total Started Training', met: 'Total Dropped' }
    },
    {
        id: '1.4',
        categoryId: 'trainingDelivery',
        label: '1.4 Certification Rate',
        weight: 25,
        description: 'Certification rate = Agents who passed certification / Agents who took certification. Vendor passes when certification rate ≥ 95%.',
        scoringLogic: 'standard',
        labels: { done: 'Agents Tested', met: 'Agents Passed' }
    },

    // 2. Tools & Access Readiness (10%)
    {
        id: '2.1',
        categoryId: 'toolsReadiness',
        label: '2.1 Daxiang Requests',
        weight: 50,
        description: 'Score = On time and accurate submissions / Total number of eligible waves. Each eligible wave is counted only if tools were requested on time with correct details.',
        scoringLogic: 'standard',
        labels: { done: 'Eligible Waves', met: 'On-Time Submissions' }
    },
    {
        id: '2.2',
        categoryId: 'toolsReadiness',
        label: '2.2 Keeservice Access Requests',
        weight: 50,
        description: 'Score = On time and accurate submissions / Total number of eligible waves. Same logic as Daxiang, using Keeservice access requests and related communication.',
        scoringLogic: 'standard',
        labels: { done: 'Eligible Waves', met: 'On-Time Submissions' }
    },

    // 3. Tracker Management Compliance (10%)
    {
        id: '3.1',
        categoryId: 'trackerCompliance',
        label: '3.1 Training Plan',
        weight: 10,
        description: 'Score = Accurate, on time submissions / Total number of eligible waves. A submission is counted as compliant when submitted on time and without errors.',
        scoringLogic: 'standard',
        labels: { done: 'Eligible Waves', met: 'Compliant Submissions' }
    },
    {
        id: '3.2',
        categoryId: 'trackerCompliance',
        label: '3.2 Certification Tracker',
        weight: 15,
        description: 'Score = Accurate, on time updates / Total number of eligible waves. Vendor must update all certified waves within 24 hours of certification date.',
        scoringLogic: 'standard',
        labels: { done: 'Eligible Waves', met: 'On-Time Updates' }
    },
    {
        id: '3.3',
        categoryId: 'trackerCompliance',
        label: '3.3 Training Toolkit',
        weight: 15,
        description: 'Score = Passed weekly audits / Total number of audits in the month. Weekly audit checks that wave performance, trainee roster, and trainer roster are up to date.',
        scoringLogic: 'standard',
        labels: { done: 'Audits Conducted', met: 'Audits Passed' }
    },
    {
        id: '3.4',
        categoryId: 'trackerCompliance',
        label: '3.4 Initiatives Tracker',
        weight: 15,
        description: 'Score = Passed weekly audits / Total number of audits in the month. Audit checks that all initiative related trackers are updated on time.',
        scoringLogic: 'standard',
        labels: { done: 'Audits Conducted', met: 'Audits Passed' }
    },
    {
        id: '3.5',
        categoryId: 'trackerCompliance',
        label: '3.5 SOP Updates',
        weight: 15,
        description: 'Score = Updates cascaded on time / Total number of updates within the month. To count as on time, the update must be cascaded, logged in the tracker, and evidence attached.',
        scoringLogic: 'standard',
        labels: { done: 'Updates Required', met: 'Updates Cascaded' }
    },
    {
        id: '3.6',
        categoryId: 'trackerCompliance',
        label: '3.6 Training Hours',
        weight: 30,
        description: 'Binary scoring for each invoice period. 100% if submission is fully accurate and on time, 0% otherwise. Monthly score is the average.',
        scoringLogic: 'binary',
        labels: { done: 'N/A', met: 'Pass/Fail' }
    },

    // 4. WBRs (20%)
    {
        id: '4.1',
        categoryId: 'wbrs',
        label: '4.1 WBR Attendance',
        weight: 50,
        description: 'Score = Number of successful WBRs attended and presented / Total WBRs scheduled in the month. A WBR is successful when vendor attends on time and presents their section.',
        scoringLogic: 'standard',
        labels: { done: 'WBRs Scheduled', met: 'WBRs Attended' }
    },
    {
        id: '4.2',
        categoryId: 'wbrs',
        label: '4.2 Quality of WBR Slides',
        weight: 50,
        description: 'Score = Number of WBRs with acceptable quality slides / Total WBRs scheduled in the month. Slides must show current STP performance, analysis, and action plans.',
        scoringLogic: 'standard',
        labels: { done: 'WBRs Scheduled', met: 'Quality Slides' }
    },

    // 5. Training Performance (25%)
    {
        id: '5.1',
        categoryId: 'trainingPerformance',
        label: '5.1 Nesting Performance',
        weight: 50,
        description: 'Score = Waves that met nesting performance threshold / Total eligible waves. Eligible waves are those with Go Live in the month.',
        scoringLogic: 'standard',
        labels: { done: 'Eligible Waves', met: 'Threshold Met' }
    },
    {
        id: '5.2',
        categoryId: 'trainingPerformance',
        label: '5.2 New Hires Performance',
        weight: 50,
        description: 'Score = KPIs showing steady improvement / Total KPIs tracked (reference is 5 KPIs). Focus is on STP trend for new hire waves.',
        scoringLogic: 'standard',
        labels: { done: 'KPIs Tracked', met: 'Improved KPIs' }
    },

    // 6. Vendor Management Behavior (10%)
    {
        id: '6.1',
        categoryId: 'vendorBehavior',
        label: '6.1 Alignment with Process',
        weight: 50,
        description: 'Default score is 100%. If there is a critical failure with negative business impact (e.g., not following SOP update cascading), score becomes 0.',
        scoringLogic: 'binary',
        labels: { done: 'N/A', met: 'Pass/Fail' }
    },
    {
        id: '6.2',
        categoryId: 'vendorBehavior',
        label: '6.2 Proactive Communication',
        weight: 50,
        description: 'Default score is 100%. If there is a critical failure (e.g., Regional team having to chase a critical ask), score becomes 0.',
        scoringLogic: 'binary',
        labels: { done: 'N/A', met: 'Pass/Fail' }
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
