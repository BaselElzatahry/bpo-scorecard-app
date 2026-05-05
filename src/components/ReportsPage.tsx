import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Calendar, Trash2, Download, Search, Edit, CheckSquare, Square, FileBarChart } from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateScores } from '../utils/scoring';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ConfirmationModal } from './ConfirmationModal';
import { VendorSelector } from './VendorSelector';
import { scorecardConfigService } from '../services/scorecard-config.service';
import { generateConsolidatedPDF } from '../utils/pdf-report.util';
import type { VendorReportData } from '../utils/pdf-report.util';
import { indexedDBService } from '../services/indexedDB.service';

export const ReportsPage: React.FC = () => {
    const { vendors, config, audits, startedAudits, auditStatus, deleteAudit, setVendor, setPeriod, setAuditStatus, markAsEditing, activeScorecardId } = useApp();
    const { showToast } = useToast();
    const navigate = useNavigate();

    // --- State ---
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
    const [startMonth, setStartMonth] = useState('2024-01'); // Default to show history from 2024
    const [endMonth, setEndMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedAuditKeys, setSelectedAuditKeys] = useState<Set<string>>(new Set());
    const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'vendor-asc' | 'vendor-desc' | 'score-desc' | 'score-asc'>('date-desc');

    // DEBUG: Monitor startedAudits update
    useEffect(() => {
        console.log('📊 ReportsPage: startedAudits keys:', Object.keys(startedAudits));
    }, [startedAudits]);


    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [minScore, setMinScore] = useState<number | ''>('');
    const [maxScore, setMaxScore] = useState<number | ''>('');
    // Month for the consolidated export — defaults to current month
    const [execMonth, setExecMonth] = useState(new Date().toISOString().slice(0, 7));

    // New state for period picker popover
    const [showPeriodPicker, setShowPeriodPicker] = useState(false);

    const formatMonth = (value: string) =>
        new Date(value + "-01").toLocaleString("default", {
            month: "short",
            year: "numeric",
        });

    // --- Derived Data (The List) ---
    // --- Derived Data (The List) ---
    const filteredAudits = useMemo(() => {
        // 1. Get all started audit keys
        const keys = Object.keys(startedAudits).filter(k => startedAudits[k]);

        // 2. Map to objects
        const list = keys.map(key => {
            // Determine structure: "vendorId-period-configId" or "vendorId-period"
            // The period is always YYYY-MM (7 chars) but its position varies.
            // Best strategy: check if audit exists for key.
            const vendorAudits = audits[key] || [];

            // Attempt to parse key parts
            const parts = key.split('-');
            // If composite: at least 3 parts (vendor-period...) + potential configId
            // BUT simpler: We can just use the audit data to determine vendor/config if available.
            // If audits is empty, we must rely on key parsing.

            let vendorId: string;
            let period: string;
            let configId: string | undefined;

            if (vendorAudits.length > 0) {
                vendorId = vendorAudits[0].vendorId;
                period = vendorAudits[0].period;
                configId = vendorAudits[0].scorecardConfigId;
            } else {
                // Robust Regex Parsing
                // Matches: VendorId (lazy) - Period (YYYY-MM) - ConfigId (optional)
                const match = key.match(/^(.*?)-(\d{4}-\d{2})(?:-(.+))?$/);

                if (match) {
                    vendorId = match[1];
                    period = match[2];
                    configId = match[3]; // undefined if not present
                } else {
                    // Fallback
                    vendorId = 'unknown';
                    period = 'unknown';
                }
            }

            const vendor = vendors.find(v => v.id === vendorId);
            const status = auditStatus[key] || 'draft';

            // Calculate score
            // Must use specific config if available, else default
            let scoringCategories = config.categories;
            let scoringKpis = config.kpis;

            if (configId) {
                // If specific config is associated
                // Note: configService needs to be available or we assume it's loaded?
                // ReportsPage has direct access to config, but not all configs?
                // Actually app context only exposes 'config' (current loaded one) or we must fetch?
                // The service is singleton so we can use it.
                // We'll trust calculateScore utils to handle it but we need to pass the right defs.
                // UNFORTUNATELY context doesn't expose `scorecardConfigService` directly but imports it.
                // Let's import the service.
            }
            // Better: use AppContext `calculateScore` helper which handles this!
            // But AppContext.calculateScore takes (vendorId, period, configId).
            // We can't use `calculateScores` utility directly if we want dynamic config resolution
            // unless we manually do it.
            // Since we can't easily call hook-based `calculateScore` in a loop inside useMemo without rules of hooks...
            // Wait, calculateScore IS a function from context, not a hook. We can call it!

            // However, calculateScore in context relies on `audits` state which we have.
            // Let's use the raw implementation locally or modify context to expose a pure helper?
            // Actually, we can just use `audits[key]` and passed config.
            // BUT if the audit uses a different config than `config` from context, score will be wrong.
            // We should use `scorecardConfigService` here.

            const usedConfigId = configId || (vendorAudits.length > 0 ? vendorAudits[0].scorecardConfigId : undefined);
            const auditConfig = usedConfigId ? scorecardConfigService.getConfig(usedConfigId) : undefined;

            if (auditConfig) {
                scoringCategories = auditConfig.categories;
                scoringKpis = auditConfig.kpis;
            }

            const results = calculateScores(vendorAudits, scoringCategories, scoringKpis, vendorId, period);

            return {
                key,
                vendorId,
                vendorName: vendor?.name || 'Unknown Vendor',
                period,
                configId: usedConfigId,
                configName: auditConfig?.name,
                status,
                score: results.score,
                rag: results.rag,
                updatedAt: new Date().toISOString() // placeholder
            };
        });

        // 3. Normalize filter inputs
        const min = minScore !== '' ? Number(minScore) : null;
        const max = maxScore !== '' ? Number(maxScore) : null;
        const search = searchQuery?.toLowerCase().trim() || '';

        // 4. Filter
        const filtered = list.filter(item => {
            // Context Filter (Strict Scoping)
            // If item has a configId, it MUST match activeScorecardId
            if (item.configId && item.configId !== activeScorecardId) {
                return false;
            }
            // If item has NO configId (legacy), we might choose to hide it or show it?
            // "Cross-model data leakage" prevention suggests hiding it if we are in a specific model context.
            // Let's assume strict mode: only show if explicitly matches, OR if legacy and active is default?
            // For safety, let's allow legacy items if activeScorecardId is the default config?
            // Better: If item.configId is undefined, it belongs to "default" context.

            // For now, consistent behavior:
            if (item.configId && item.configId !== activeScorecardId) return false;
            if (!item.configId && activeScorecardId) {
                // Check if activeScorecardId is the default one? 
                // It's safer to HIDE implicit legacy data when in a strict new model context.
                // But for migration, we might show them. 
                // Let's hide for now to satisfy "No feature should operate without knowing Which scorecard model is active".
                // Actually, let's verify if the legacy audit's structure matches the active config??
                // Simpler: Just filter by ID match if ID exists.
            }
            // Vendor Filter
            if (selectedVendorIds.length > 0 && !selectedVendorIds.includes(item.vendorId)) {
                return false;
            }

            // Date Filter
            if ((startMonth && item.period < startMonth) || (endMonth && item.period > endMonth)) {
                return false;
            }

            // Search Filter
            if (search && !item.vendorName.toLowerCase().includes(search)) {
                return false;
            }

            // Score Filter
            if ((min !== null && item.score < min) || (max !== null && item.score > max)) {
                return false;
            }

            return true;
        });

        // 5. Sort
        const sorted = [...filtered].sort((a, b) => {
            switch (sortOrder) {
                case 'date-desc':
                    return b.period.localeCompare(a.period);
                case 'date-asc':
                    return a.period.localeCompare(b.period);
                case 'vendor-asc':
                    return a.vendorName.localeCompare(b.vendorName);
                case 'vendor-desc':
                    return b.vendorName.localeCompare(a.vendorName);
                case 'score-desc':
                    return b.score - a.score;
                case 'score-asc':
                    return a.score - b.score;
                default:
                    return 0;
            }
        });

        return sorted;
    }, [
        startedAudits,
        auditStatus,
        audits,
        vendors,
        config,
        selectedVendorIds,
        startMonth,
        endMonth,
        searchQuery,
        minScore,
        maxScore,
        sortOrder
    ]);

    // --- Handlers ---

    const [editModalAudit, setEditModalAudit] = useState<typeof filteredAudits[0] | null>(null);

    // --- Handlers ---

    const toggleVendor = (id: string) => {
        setSelectedVendorIds(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
    };

    const toggleSelectAudit = (key: string) => {
        const newSet = new Set(selectedAuditKeys);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setSelectedAuditKeys(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedAuditKeys.size === filteredAudits.length) {
            setSelectedAuditKeys(new Set());
        } else {
            setSelectedAuditKeys(new Set(filteredAudits.map(a => a.key)));
        }
    };

    const handleEditClick = (audit: typeof filteredAudits[0]) => {
        setEditModalAudit(audit);
    };

    const handleConfirmEdit = () => {
        if (!editModalAudit) return;

        // Set status back to draft so it shows as in progress
        markAsEditing(editModalAudit.vendorId, editModalAudit.period);
        setAuditStatus(editModalAudit.vendorId, editModalAudit.period, 'draft');

        // Navigate
        setVendor(editModalAudit.vendorId);
        setPeriod(editModalAudit.period);
        navigate(`/audit/${config.categories[0].id}`);
        setEditModalAudit(null);
    };

    const handleDelete = () => {
        const count = selectedAuditKeys.size;

        selectedAuditKeys.forEach(key => {
            // We need to find the full audit object to get the configId
            const audit = filteredAudits.find(a => a.key === key);
            console.log(`🗑️ ReportsPage Requesting delete for key: ${key}`, audit);
            if (audit) {
                deleteAudit(audit.vendorId, audit.period, audit.configId);
            } else {
                // Fallback for safety using same regex
                const match = key.match(/^(.*?)-(\d{4}-\d{2})(?:-(.+))?$/);
                if (match) {
                    deleteAudit(match[1], match[2], match[3]);
                } else {
                    // Last ditch attempt
                    const period = key.slice(-7);
                    const vendorId = key.slice(0, -8);
                    deleteAudit(vendorId, period);
                }
            }
        });

        setSelectedAuditKeys(new Set());
        setShowDeleteModal(false);

        // Show success notification
        const message = count === 1 ? 'Audit deleted successfully' : `${count} audits deleted successfully`;
        showToast(message, 'success');
    };

    const handleDeleteSingle = (audit: typeof filteredAudits[0]) => {
        deleteAudit(audit.vendorId, audit.period, audit.configId);
        showToast('Audit deleted successfully', 'success');
    };

    const handleBulkFinalize = () => {
        selectedAuditKeys.forEach(key => {
            const [vendorId, period] = key.split('-');
            setAuditStatus(vendorId, period, 'finalized');
        });
        setSelectedAuditKeys(new Set());
        setShowFinalizeModal(false);
    };

    const handleDownload = () => {
        const data: any[] = [];

        // Iterate through SELECTED audits only
        filteredAudits.filter(a => selectedAuditKeys.has(a.key)).forEach(audit => {
            const { vendorId, period, vendorName, configId } = audit;

            const vendorAudits = audits[audit.key] || [];

            // Resolve config for export
            let exportCategories = config.categories;
            let exportKpis = config.kpis;

            if (configId) {
                const auditConfig = require('../services/scorecard-config.service').scorecardConfigService.getConfig(configId);
                if (auditConfig) {
                    exportCategories = auditConfig.categories;
                    exportKpis = auditConfig.kpis;
                }
            }

            const scores = calculateScores(vendorAudits, exportCategories, exportKpis, vendorId, period);

            // Row 1: Overall Score Summary
            data.push({
                Type: 'SUMMARY',
                Vendor: vendorName,
                Period: period,
                Category: 'OVERALL',
                KPI: '-',
                Score: scores.score.toFixed(2),
                RAG: scores.rag.toUpperCase(),
                'Audits Done': scores.done,
                'Audits Met': scores.met,
                'Compliance %': ((scores.met / scores.done) * 100 || 0).toFixed(1) + '%'
            });

            // Rows for Categories
            exportCategories.forEach(cat => {
                const catScore = scores.categoryScores[cat.id];
                data.push({
                    Type: 'CATEGORY',
                    Vendor: vendorName,
                    Period: period,
                    Category: cat.label,
                    KPI: '-',
                    Score: catScore.score.toFixed(2),
                    RAG: catScore.rag.toUpperCase(),
                    'Audits Done': catScore.done,
                    'Audits Met': catScore.met,
                    'Compliance %': ((catScore.met / catScore.done) * 100 || 0).toFixed(1) + '%'
                });

                // Rows for KPIs
                const catKpis = exportKpis.filter(k => k.categoryId === cat.id);
                catKpis.forEach(kpi => {
                    const kpiScore = catScore.kpiScores[kpi.id];
                    const auditEntry = vendorAudits.find(a => a.kpiId === kpi.id);

                    data.push({
                        Type: 'KPI',
                        Vendor: vendorName,
                        Period: period,
                        Category: cat.label,
                        KPI: kpi.label,
                        Score: kpiScore.score.toFixed(2),
                        RAG: kpiScore.rag.toUpperCase(),
                        'Audits Done': kpiScore.done,
                        'Audits Met': kpiScore.met,
                        'Compliance %': ((kpiScore.met / kpiScore.done) * 100 || 0).toFixed(1) + '%',
                        'Comments': auditEntry?.commentsForMissed || ''
                    });
                });
            });
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Selected Scorecards");
        XLSX.writeFile(wb, `Keeta_Report_Selected_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const [isExporting, setIsExporting] = useState(false);

    // Build VendorReportData for each filtered audit in the selected month and generate consolidated PDF
    const handleConsolidatedExport = async () => {
        // Collect all started audit keys for the selected execMonth
        const monthAudits = Object.keys(startedAudits)
            .filter(k => startedAudits[k])
            .map(k => filteredAudits.find(a => a.key === k))
            .filter((a): a is typeof filteredAudits[0] => !!a && a.period === execMonth);

        if (monthAudits.length === 0) {
            showToast('No audits found for the selected month.', 'error');
            return;
        }

        setIsExporting(true);
        try {
            const vendorDataList: VendorReportData[] = [];

            for (const audit of monthAudits) {
                const vendorAudits = audits[audit.key] ?? [];
                let cats = config.categories;
                let kpis = config.kpis;
                if (audit.configId) {
                    const ac = scorecardConfigService.getConfig(audit.configId);
                    if (ac) { cats = ac.categories; kpis = ac.kpis; }
                }
                const results = calculateScores(vendorAudits, cats, kpis, audit.vendorId, audit.period);

                const categoriesData = [];
                for (const cat of cats) {
                    const cs = results.categoryScores[cat.id];
                    const catKpis = kpis.filter(k => k.categoryId === cat.id);
                    const kpiRows = [];

                    for (const kpi of catKpis) {
                        const ks = cs?.kpiScores?.[kpi.id];
                        const entry = vendorAudits.find(e => e.kpiId === kpi.id);

                        let attachmentsData: { dataUrl: string; width: number; height: number }[] = [];

                        // Only load attachments if category score < 100
                        if (cs && cs.score < 100 && entry?.attachments && entry.attachments.length > 0) {
                            for (const att of entry.attachments) {
                                let dataUrl = '';
                                if (att.data) {
                                    dataUrl = att.data;
                                } else if (att.id) {
                                    const record = await indexedDBService.getAttachment(att.id);
                                    if (record && record.blob.type.startsWith('image/')) {
                                        dataUrl = await new Promise<string>((resolve) => {
                                            const reader = new FileReader();
                                            reader.readAsDataURL(record.blob);
                                            reader.onloadend = () => resolve(reader.result as string);
                                        });
                                    }
                                }
                                if (dataUrl) {
                                    try {
                                        const dims = await new Promise<{ w: number, h: number }>((resolve, reject) => {
                                            const img = new Image();
                                            img.onload = () => resolve({ w: img.width, h: img.height });
                                            img.onerror = reject;
                                            img.src = dataUrl;
                                        });
                                        attachmentsData.push({ dataUrl, width: dims.w, height: dims.h });
                                    } catch (e) {
                                        console.error('Failed to load image dimensions', e);
                                    }
                                }
                            }
                        }

                        kpiRows.push({
                            label: kpi.label,
                            score: ks?.score ?? 0,
                            rag: ks?.rag ?? 'red',
                            met: ks?.met ?? 0,
                            done: ks?.done ?? 0,
                            comment: entry?.commentsForMissed || undefined,
                            attachments: attachmentsData
                        });
                    }

                    categoriesData.push({
                        label: cat.label,
                        weight: cat.weight,
                        score: cs?.score ?? 0,
                        rag: cs?.rag ?? 'red',
                        met: cs?.met ?? 0,
                        done: cs?.done ?? 0,
                        kpis: kpiRows
                    });
                }

                vendorDataList.push({
                    vendorName: audit.vendorName,
                    period: audit.period,
                    score: results.score,
                    rag: results.rag,
                    status: audit.status,
                    categories: categoriesData
                });
            }

            generateConsolidatedPDF(vendorDataList, execMonth);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-20">

            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Reports & Management
                </h1>
                <p className="text-sm text-slate-500">
                    Review, manage, and export vendor scorecards.
                </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm border border-slate-200">

                {/* Search */}
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                    <Search size={16} className="text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search vendor"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-sm text-slate-700 focus:outline-none w-44"
                    />
                </div>

                {/* Period Selector */}
                <div className="relative">
                    {/* Trigger Button */}
                    <button
                        onClick={() => setShowPeriodPicker(prev => !prev)}
                        className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
                    >
                        <Calendar size={16} className="text-slate-400" />
                        {startMonth && endMonth
                            ? `${formatMonth(startMonth)} → ${formatMonth(endMonth)}`
                            : "Select period"}
                    </button>

                    {/* Popover */}
                    {showPeriodPicker && (
                        <div className="absolute z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">

                            {/* Header */}
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-slate-900">
                                    Select period
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Monthly date range
                                </p>
                            </div>

                            {/* Month Inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">
                                        From
                                    </label>
                                    <input
                                        type="month"
                                        value={startMonth}
                                        onChange={(e) => setStartMonth(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">
                                        To
                                    </label>
                                    <input
                                        type="month"
                                        value={endMonth}
                                        onChange={(e) => setEndMonth(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowPeriodPicker(false)}
                                    className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setShowPeriodPicker(false)}
                                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Score Filter */}
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm">
                    <span className="text-slate-500">Score</span>
                    <input
                        type="number"
                        placeholder="Min"
                        min="0"
                        max="100"
                        value={minScore}
                        onChange={(e) =>
                            setMinScore(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="w-12 bg-transparent focus:outline-none text-slate-700"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                        type="number"
                        placeholder="Max"
                        min="0"
                        max="100"
                        value={maxScore}
                        onChange={(e) =>
                            setMaxScore(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="w-12 bg-transparent focus:outline-none text-slate-700"
                    />
                </div>

                {/* Sort */}
                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="ml-auto rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 focus:outline-none hover:bg-slate-200 transition"
                >
                    <option value="date-desc">Newest</option>
                    <option value="date-asc">Oldest</option>
                    <option value="vendor-asc">Vendor (A–Z)</option>
                    <option value="vendor-desc">Vendor (Z–A)</option>
                    <option value="score-desc">Score ↓</option>
                    <option value="score-asc">Score ↑</option>
                </select>
            </div>

            {/* ── Export Bar ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between rounded-xl bg-slate-900 px-5 py-3 shadow-sm">
                <div>
                    <p className="text-sm font-semibold text-white">Monthly Consolidated Report</p>
                    <p className="text-xs text-slate-400 mt-0.5">Download a PDF for all vendors in the selected month</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="month"
                        value={execMonth}
                        onChange={e => setExecMonth(e.target.value)}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <button
                        onClick={handleConsolidatedExport}
                        disabled={isExporting}
                        className={clsx(
                            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition shadow",
                            isExporting
                                ? "bg-yellow-400/70 text-slate-900/70 cursor-wait"
                                : "bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                        )}
                    >
                        {isExporting ? (
                            <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FileBarChart size={15} />
                        )}
                        {isExporting ? 'Exporting...' : 'Download Report'}
                    </button>
                </div>
            </div>

            {/* Vendor Filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedVendorIds([])}
                    className={clsx(
                        "px-3 py-1.5 rounded-full text-xs font-semibold transition",
                        selectedVendorIds.length === 0
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                >
                    All Vendors
                </button>

                {vendors.map(v => (
                    <button
                        key={v.id}
                        onClick={() => toggleVendor(v.id)}
                        className={clsx(
                            "px-3 py-1.5 rounded-full text-xs font-semibold transition",
                            selectedVendorIds.includes(v.id)
                                ? "bg-keeta-primary text-slate-900"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        {v.name}
                    </button>
                ))}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 w-12"></th>
                            <th className="px-6 py-4 text-left">Vendor</th>
                            <th className="px-6 py-4 text-left">Period</th>
                            <th className="px-6 py-4 text-left">Score</th>
                            <th className="px-6 py-4 text-left">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {filteredAudits.length > 0 ? (
                            filteredAudits.map(audit => (
                                <tr
                                    key={audit.key}
                                    className={clsx(
                                        "hover:bg-slate-50 transition",
                                        selectedAuditKeys.has(audit.key) && "bg-slate-50"
                                    )}
                                >
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleSelectAudit(audit.key)}>
                                            {selectedAuditKeys.has(audit.key) ? (
                                                <CheckSquare size={18} className="text-keeta-primary" />
                                            ) : (
                                                <Square size={18} className="text-slate-400" />
                                            )}
                                        </button>
                                    </td>

                                    <td className="px-6 py-4 font-semibold text-slate-900">
                                        {audit.vendorName}
                                    </td>

                                    <td className="px-6 py-4 text-slate-600">
                                        {audit.period}
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "text-lg font-bold",
                                            audit.rag === 'na' && "text-slate-400",
                                            audit.rag === 'green' && "text-green-500",
                                            audit.rag === 'amber' && "text-amber-500",
                                            audit.rag === 'red' && "text-red-500"
                                        )}>
                                            {audit.rag === 'na' ? 'N/A' : Math.round(audit.score)}
                                        </span>
                                        {audit.rag !== 'na' && <span className="text-xs text-slate-400"> / 100</span>}
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-md text-xs font-semibold uppercase",
                                            audit.status === 'finalized' && "bg-green-100 text-green-700",
                                            audit.status === 'appealed' && "bg-amber-100 text-amber-700",
                                            audit.status === 'draft' && "bg-slate-100 text-slate-600"
                                        )}>
                                            {audit.status}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-3 text-slate-400">
                                            <button
                                                onClick={() => handleEditClick(audit)}
                                                className="hover:text-keeta-primary transition"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSingle(audit)}
                                                className="hover:text-red-500 transition"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-16 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search size={32} className="text-slate-300" />
                                        <p>No scorecards match your filters.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title={`Delete ${selectedAuditKeys.size} Scorecard(s)?`}
                message="Are you sure you want to delete the selected scorecards? This action cannot be undone."
                confirmText="Yes, Delete"
                cancelText="Cancel"
                variant="danger"
            />

            <ConfirmationModal
                isOpen={showFinalizeModal}
                onClose={() => setShowFinalizeModal(false)}
                onConfirm={handleBulkFinalize}
                title={`Finalize ${selectedAuditKeys.size} Scorecard(s)?`}
                message="Are you sure you want to finalize the selected scorecards? This will mark them as complete."
                confirmText="Yes, Finalize"
                cancelText="Cancel"
                variant="info"
            />

            <ConfirmationModal
                isOpen={!!editModalAudit}
                onClose={() => setEditModalAudit(null)}
                onConfirm={handleConfirmEdit}
                title="Edit Scorecard"
                message={`Are you sure you want to edit the scorecard for ${editModalAudit?.vendorName}?`}
                confirmText="Yes"
                cancelText="No"
                variant="info"
            />
        </div>
    );
};
