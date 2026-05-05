import React, { useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
    Trophy, Target, TrendingUp, AlertTriangle,
    Download, FileText, Plus, BarChart2
} from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { VendorSelector } from './VendorSelector';
import { scorecardConfigService } from '../services/scorecard-config.service';
import { generateSingleVendorPDF } from '../utils/pdf-report.util';
import type { VendorReportData } from '../utils/pdf-report.util';
import { indexedDBService } from '../services/indexedDB.service';

export const SummaryScorecard: React.FC = () => {
    const {
        config,
        vendors,
        audits,
        currentVendorId,
        setVendorId,
        currentPeriod,
        setPeriod,
        auditStatus,
        calculateScore,
        activeScorecardId // NEW
    } = useApp();

    const navigate = useNavigate();
    const dashboardRef = useRef<HTMLDivElement>(null);

    // Generate last 12 months + current month 
    const availablePeriods = useMemo(() => {
        const periods: string[] = [];
        const today = new Date();

        // Last 12 months including current month
        for (let i = 12; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            periods.push(d.toISOString().slice(0, 7)); // YYYY-MM
        }

        // Next 3 months (adjustable)
        for (let i = 1; i <= 1; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            periods.push(d.toISOString().slice(0, 7)); // YYYY-MM
        }

        return periods;
    }, []);

    // Set initial period if not already set - default to current month
    useEffect(() => {
        if (!currentPeriod && availablePeriods.length > 0) {
            // Current month = last month from "past months" (before future months)
            setPeriod(availablePeriods[12]); // dynamically, 12 = current month in last 12 + current
        }
    }, [currentPeriod, availablePeriods, setPeriod]);


    const activeConfigDetails = useMemo(() => {
        if (!currentVendorId || !currentPeriod) return null;
        const key = `${currentVendorId}-${currentPeriod}`;
        const currentAudits = audits[key];

        if (currentAudits && currentAudits.length > 0) {
            const configId = currentAudits[0].scorecardConfigId;
            if (configId) {
                return scorecardConfigService.getConfig(configId);
            }
        }
        return null; // or fallback to active
    }, [audits, currentVendorId, currentPeriod]);

    // Guard against empty currentPeriod
    if (!currentPeriod || !currentVendorId) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-slate-500">Loading...</div>
            </div>
        );
    }




    // Use activeScorecardId for calculation context
    const viewConfigId = activeScorecardId;



    const isFinalized = auditStatus[`${currentVendorId}-${currentPeriod}-${viewConfigId}`] === 'finalized'
        || auditStatus[`${currentVendorId}-${currentPeriod}`] === 'finalized';

    // Calculate score using specific config if selected, or default behavior
    const hasData = true; // Always true now as we can show blank template
    const results = viewConfigId ? calculateScore(currentVendorId, currentPeriod, viewConfigId) : null;

    // Calculate previous month's score for trend
    const scoreDelta = useMemo(() => {
        if (!results) return null;
        const prevDate = new Date(currentPeriod + '-01');
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevPeriod = prevDate.toISOString().slice(0, 7);
        const prevKey = `${currentVendorId}-${prevPeriod}`;
        if (audits[prevKey] && audits[prevKey].length > 0) {
            const prevRes = calculateScore(currentVendorId, prevPeriod);
            return results.score - prevRes.score;
        }
        return null;
    }, [results, currentPeriod, currentVendorId, audits, calculateScore]);

    // Focus Areas & Top Pillars Logic (using utility functions)
    const { focusAreas, topPillars } = useMemo(() => {
        if (!results) return { focusAreas: [], topPillars: [], focusMessage: null };

        const cats = Object.values(results.categoryScores);

        // Use utility functions
        const identifiedFocusAreas = cats.filter((c: any) => c.score < 100).sort((a: any, b: any) => a.score - b.score);
        const focusAreas = identifiedFocusAreas.length >= 2
            ? identifiedFocusAreas.slice(0, 2)
            : identifiedFocusAreas.length === 1
                ? identifiedFocusAreas
                : [];

        const topPerformers = cats.filter((c: any) => c.score > 90).sort((a: any, b: any) => b.score - a.score);
        const topPillars = topPerformers.slice(0, 2);

        return { focusAreas, topPillars };
    }, [results]);

    const handleExportExcel = () => {
        if (!results) return;
        const wb = XLSX.utils.book_new();
        const vendor = vendors.find(v => v.id === currentVendorId);

        const summaryData = [
            ['Vendor Scorecard Report'],
            ['Vendor', vendor?.name],
            ['Period', currentPeriod],
            ['Generated', new Date().toLocaleDateString()],
            [''],
            ['Overall Score', `${Math.round(results.score)}%`],
            ['Status', results.rag.toUpperCase()],
            [''],
            ['Category Performance'],
            ['Category', 'Score', 'Status']
        ];

        config.categories.forEach(cat => {
            const catScore = results.categoryScores[cat.id];
            summaryData.push([
                cat.label,
                `${Math.round(catScore.score)}%`,
                catScore.rag.toUpperCase()
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws, "Summary");
        XLSX.writeFile(wb, `Scorecard_${vendor?.name}_${currentPeriod}.xlsx`);
    };

    const [isExporting, setIsExporting] = React.useState(false);

    const handleExportPDF = async () => {
        if (!results || !currentVendorId || !currentPeriod) return;

        setIsExporting(true);
        try {
            // Resolve audit key — try plain first, then composite with configId
            let auditKey = `${currentVendorId}-${currentPeriod}`;
            let auditEntries = audits[auditKey] ?? [];

            // Fallback: look for composite key vendorId-period-configId
            if (auditEntries.length === 0) {
                const prefix = `${currentVendorId}-${currentPeriod}-`;
                const foundKey = Object.keys(audits).find(k => k.startsWith(prefix));
                if (foundKey) {
                    auditKey = foundKey;
                    auditEntries = audits[auditKey] ?? [];
                }
            }

            const configId = auditEntries[0]?.scorecardConfigId ?? viewConfigId;
            const auditConfig = configId ? scorecardConfigService.getConfig(configId) : null;
            const cats = auditConfig?.categories ?? config.categories;
            const kpis = auditConfig?.kpis ?? config.kpis;

            const currentStatus =
                auditStatus[`${currentVendorId}-${currentPeriod}-${configId}`] ??
                auditStatus[`${currentVendorId}-${currentPeriod}`] ??
                'draft';

            const categoriesData = [];

            for (const cat of cats) {
                const cs = results.categoryScores[cat.id];
                const catKpis = kpis.filter(k => k.categoryId === cat.id);
                const kpiRows = [];

                for (const kpi of catKpis) {
                    const ks = cs?.kpiScores?.[kpi.id];
                    const entry = auditEntries.find(e => e.kpiId === kpi.id);

                    let attachmentsData: { dataUrl: string; width: number; height: number }[] = [];

                    // Only load attachments for categories that aren't 100%
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
                                    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
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
                        attachments: attachmentsData,
                    });
                }

                categoriesData.push({
                    label: cat.label,
                    weight: cat.weight,
                    score: cs?.score ?? 0,
                    rag: cs?.rag ?? 'red',
                    met: cs?.met ?? 0,
                    done: cs?.done ?? 0,
                    kpis: kpiRows,
                });
            }

            const data: VendorReportData = {
                vendorName: vendors.find(v => v.id === currentVendorId)?.name ?? 'Unknown',
                period: currentPeriod,
                score: results.score,
                rag: results.rag,
                status: currentStatus,
                categories: categoriesData,
            };

            generateSingleVendorPDF(data);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in pb-12" ref={dashboardRef}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                        Performance Dashboard
                    </h1>
                    <div className="flex items-center gap-3">
                        <p className="text-slate-500 font-medium">
                            Overview of vendor performance and compliance
                        </p>

                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className={clsx(
                            "btn-secondary flex items-center gap-2",
                            isExporting && "opacity-75 cursor-wait"
                        )}
                        title="Download as PDF"
                    >
                        {isExporting ? (
                            <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Download size={18} />
                        )}
                        {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                    <button
                        onClick={() => navigate(`/new-audit?vendorId=${currentVendorId}&period=${currentPeriod}`)}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-keeta-primary/20"
                    >
                        <Plus size={18} />
                        Start New Audit
                    </button>
                </div>
            </div >

            {/* Filters */}
            < div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-between" >
                <VendorSelector
                    selectedVendorId={currentVendorId}
                    onSelect={(id) => id && setVendorId(id)}
                    allowAll={false}
                />

                {/* Modern Period Selector */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm min-w-[250px]">
                    <div className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Period
                    </div>
                    <div className="relative flex-1">
                        <select
                            value={currentPeriod}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="w-full bg-transparent font-semibold text-gray-700 text-sm pl-3 pr-8 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 appearance-none cursor-pointer transition-all"
                        >
                            {availablePeriods.map((period) => (
                                <option key={period} value={period}>
                                    {new Date(period + '-01').toLocaleDateString('en-US', {
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </option>
                            ))}
                        </select>
                        {/* Custom Arrow */}
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

            </div >

            {
                hasData ? (
                    <>
                        {/* Main Grid Layout - Responsive */}
                        < div className="grid grid-cols-1 lg:grid-cols-12 gap-6" >

                            {/* Overall Score Card - Modern Dashboard Style */}
                            < div className="lg:col-span-8 relative overflow-hidden min-h-[320px] rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl group hover:shadow-3xl transition-shadow duration-500" >

                                {/* Soft Background Glows */}
                                < div className="absolute top-0 right-0 w-72 h-72 bg-keeta-primary rounded-full blur-[120px] opacity-20 -mr-20 -mt-20 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none" ></div >
                                <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-400 rounded-full blur-[140px] opacity-10 -ml-20 -mb-20 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>

                                <div className="relative z-10 w-full h-full flex flex-col justify-between">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-1">Overall Performance</div>
                                            <div className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white drop-shadow-lg">
                                                {vendors.find(v => v.id === currentVendorId)?.name || "Unknown Vendor"}
                                            </div>


                                        </div>

                                        {/* Action Buttons - Download Excel */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleExportExcel}
                                                className="flex items-center justify-center p-3 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                                                title="Export to Excel"
                                            >
                                                <FileText size={22} />
                                            </button>
                                        </div>

                                    </div>

                                    {/* Score & Status Section */}
                                    <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6">

                                        {/* Score Box */}
                                        <div className="flex items-center gap-6">

                                            {/* Score Circle */}
                                            <div className="relative flex flex-col items-center justify-center w-40 h-40 md:w-52 md:h-52 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-900/60 border border-white/20 shadow-2xl">

                                                {/* Soft Glow */}
                                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400/30 via-pink-400/20 to-purple-500/10 blur-3xl animate-pulse pointer-events-none"></div>

                                                <span className="relative text-6xl md:text-7xl font-extrabold text-keeta-primary drop-shadow-lg">
                                                    {Math.round(results?.score ?? 0)}
                                                </span>
                                                <span className="relative text-2xl md:text-3xl text-white/60">%</span>
                                            </div>

                                            {/* RAG & Delta */}
                                            <div className="flex flex-col gap-3 justify-center">

                                                {/* RAG Badge */}
                                                <div className={clsx(
                                                    "px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-center shadow-md",
                                                    results?.rag === 'na' ? 'bg-white/10 text-white/50' :
                                                    results?.rag === 'green' ? 'bg-green-500/25 text-green-300' :
                                                        results?.rag === 'amber' ? 'bg-amber-500/25 text-amber-300' :
                                                            results?.rag === 'red' ? 'bg-red-500/25 text-red-300' :
                                                                'bg-white/10 text-white/60'
                                                )}>
                                                    {results?.rag === 'na' ? 'N/A' : (results?.rag ?? 'N/A')}
                                                </div>

                                                {/* Delta Indicator */}
                                                {scoreDelta !== null && (
                                                    <div className={clsx(
                                                        "flex items-center gap-2 text-lg font-semibold",
                                                        scoreDelta > 0 ? "text-green-300" : scoreDelta < 0 ? "text-red-300" : "text-white/60"
                                                    )}>
                                                        {scoreDelta > 0
                                                            ? <TrendingUp size={20} className="animate-bounce" />
                                                            : scoreDelta < 0
                                                                ? <TrendingUp size={20} className="rotate-180 animate-bounce" />
                                                                : null
                                                        }
                                                        <span className="text-xl">{scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>


                                        {/* Status, Period & View Full Report */}
                                        <div className="flex flex-col items-center md:items-end gap-3">
                                            <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Status</div>
                                            <div className={clsx(
                                                "px-6 py-2 rounded-xl text-sm font-bold text-center",
                                                isFinalized ? "bg-green-500/20 text-green-300" : "bg-amber-500/20 text-amber-300"
                                            )}>
                                                {isFinalized ? 'Finalized' : 'In Progress'}
                                            </div>
                                            <div className="text-white/60 text-sm mt-1">Period: {currentPeriod}</div>

                                            {/* View Full Report Button */}
                                            <button
                                                onClick={() => navigate(`/audits/details/${currentVendorId}/${currentPeriod}?configId=${activeScorecardId}`)}
                                                className="mt-3 px-5 py-2 bg-white/10 hover:bg-white/25 text-white rounded-xl font-semibold text-sm transition-colors duration-300 flex items-center gap-2"
                                            >
                                                <BarChart2 size={16} />
                                                View Full Report
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div >

                            {/* Side Stats */}
                            < div className="lg:col-span-4 space-y-6" >

                                {/* Focus Areas */}
                                < div className="relative bg-white rounded-3xl p-6 border border-red-200 shadow-lg hover:shadow-2xl transition-shadow duration-300" >
                                    {/* Header */}
                                    < div className="flex items-center gap-3 mb-4" >
                                        <div className="p-3 bg-red-50 rounded-xl flex items-center justify-center">
                                            <AlertTriangle size={20} className="text-red-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm md:text-base font-bold text-slate-900">Focus Areas</h3>
                                            <p className="text-xs text-slate-500">Needs attention</p>
                                        </div>
                                    </div >


                                    {/* Items */}
                                    < div className="space-y-3" >
                                        {
                                            focusAreas.length === 0 ? (
                                                /* Celebration - all pillars at 100% */
                                                <div className="text-center py-6">
                                                    <div className="text-4xl mb-3">🎉</div>
                                                    <p className="text-sm font-bold text-green-600 mb-1">Excellent Performance!</p>
                                                    <p className="text-xs text-slate-600">
                                                        No focus areas this period — all pillars achieved 100%
                                                    </p>
                                                </div>
                                            ) : (
                                                /* Normal focus areas display */
                                                focusAreas.map((cat: any) => {
                                                    const categoryId = cat.categoryId || cat.id;
                                                    const category = config.categories.find(c => c.id === categoryId);
                                                    return (
                                                        <div
                                                            key={categoryId}
                                                            className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors duration-300"
                                                        >
                                                            <span className="text-sm md:text-base font-semibold text-slate-800 truncate">{category?.label}</span>
                                                            <span className="text-lg md:text-xl font-extrabold text-red-600">{Math.round(cat.score)}%</span>
                                                        </div>
                                                    );
                                                })
                                            )
                                        }
                                    </div >
                                </div >

                                {/* Top Pillars */}
                                < div className="relative bg-white rounded-3xl p-6 border border-green-200 shadow-lg hover:shadow-2xl transition-shadow duration-300" >
                                    {/* Header */}
                                    < div className="flex items-center gap-3 mb-4" >
                                        <div className="p-3 bg-green-50 rounded-xl flex items-center justify-center">
                                            <Trophy size={20} className="text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm md:text-base font-bold text-slate-900">Top Pillars</h3>
                                            <p className="text-xs text-slate-500">Excellence</p>
                                        </div>
                                    </div >

                                    {/* Items */}
                                    < div className="space-y-3" >
                                        {
                                            topPillars.map((cat: any) => {
                                                const categoryId = cat.categoryId || cat.id;
                                                const category = config.categories.find(c => c.id === categoryId);
                                                return (
                                                    <div
                                                        key={categoryId}
                                                        className="flex items-center justify-between p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors duration-300"
                                                    >
                                                        <span className="text-sm md:text-base font-semibold text-slate-800 truncate">{category?.label}</span>
                                                        <span className="text-lg md:text-xl font-extrabold text-green-600">{Math.round(cat.score)}%</span>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div >
                                </div >
                            </div >
                        </div >

                        {/* Category Breakdown */}
                        < div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg" >
                            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Category Performance</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {config.categories.map(category => {
                                    const catScore = results?.categoryScores[category.id];
                                    if (!catScore) return null;

                                    return (
                                        <div
                                            key={category.id}
                                            className="relative border-2 border-slate-200 rounded-2xl p-5 hover:shadow-2xl transition-all duration-300 group bg-white"
                                        >
                                            {/* Top Row */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex-1">
                                                    <h3 className="text-lg md:text-xl font-bold text-slate-900">{category.label}</h3>
                                                    <p className="text-xs md:text-sm text-slate-500 mt-1">Weight: {category.weight}%</p>
                                                </div>
                                                <div className={clsx(
                                                    "text-3xl md:text-4xl font-extrabold transition-colors",
                                                    catScore.rag === 'na' ? 'text-slate-400' :
                                                    catScore.rag === 'green' ? 'text-green-500' :
                                                        catScore.rag === 'amber' ? 'text-amber-500' :
                                                            'text-red-500'
                                                )}>
                                                    {catScore.rag === 'na' ? 'N/A' : `${Math.round(catScore.score)}%`}
                                                </div>
                                            </div>

                                            {/* Gradient Progress Bar */}
                                            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className={clsx(
                                                        "h-full rounded-full transition-all duration-500",
                                                        catScore.rag === 'na' ? 'bg-slate-200' :
                                                        catScore.rag === 'green' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                                            catScore.rag === 'amber' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                                                'bg-gradient-to-r from-red-400 to-red-500'
                                                    )}
                                                    style={{ width: catScore.rag === 'na' ? '100%' : `${catScore.score}%` }}
                                                />
                                            </div>

                                            {/* Spacer */}
                                            <div className="h-2"></div>

                                            {/* Edit Audit Button */}
                                            <button
                                                onClick={() => {
                                                    // Context is already active via AppContext
                                                    navigate(`/audit/${category.id}`);
                                                }}
                                                className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 font-semibold py-2 rounded-xl transition-all duration-300"
                                            >
                                                <Target size={16} />
                                                Edit Audit
                                            </button>

                                            {/* Optional Soft Glow on Hover */}
                                            <div className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-br from-yellow-200/10 to-pink-200/10 opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div >

                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
                        <div className="bg-slate-100 p-6 rounded-full mb-6">
                            <Target size={48} className="text-slate-400" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">No Audit Found</h2>
                        <p className="text-slate-500 mb-8 text-center max-w-md">
                            No audit data available for {vendors.find(v => v.id === currentVendorId)?.name} in {currentPeriod}
                        </p>
                        <button
                            onClick={() => navigate(`/new-audit?vendorId=${currentVendorId}&period=${currentPeriod}`)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Start New Audit
                        </button>
                    </div>
                )}
        </div >
    );
};
