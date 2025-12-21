import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
    ArrowLeft, Download, Edit, CheckCircle, XCircle,
    AlertTriangle, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import clsx from 'clsx';
import { getRagColor } from '../utils/scoring';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CategoryScoreResult, AppConfig } from '../types';
import { indexedDBService, AttachmentMetadata } from '../services/indexedDB.service';
import { scorecardConfigService } from '../services/scorecard-config.service';

// Component to load and display individual attachment from IndexedDB
const AttachmentThumbnail: React.FC<{ attachment: AttachmentMetadata; onClick: (url: string) => void }> = ({ attachment, onClick }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        loadAttachment();

        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [attachment.id]);

    const loadAttachment = async () => {
        try {
            setIsLoading(true);
            setError(false);

            const record = await indexedDBService.getAttachment(attachment.id);

            if (!record) {
                setError(true);
                return;
            }

            const url = URL.createObjectURL(record.blob);
            setImageUrl(url);
        } catch (err) {
            console.error('Failed to load attachment:', err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const isImage = attachment.type.startsWith('image/');

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl">
                <div className="w-8 h-8 border-3 border-slate-300 border-t-keeta-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !imageUrl) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
                <FileText size={32} className="mb-2 text-red-400" />
                <span className="text-xs font-medium">Failed to load</span>
            </div>
        );
    }

    if (isImage) {
        return (
            <div className="w-full h-full relative" onClick={() => onClick(imageUrl)}>
                <img
                    src={imageUrl}
                    alt={attachment.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-slate-900">
                        Click to enlarge
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <FileText size={32} className="mb-2" />
            <span className="text-xs font-medium truncate w-full px-2">{attachment.name}</span>
            <span className="text-[10px] text-slate-400 mt-1">
                {(attachment.size / 1024).toFixed(0)}KB
            </span>
        </div>
    );
};

export const AuditDetailsPage: React.FC = () => {
    const { vendorId, period } = useParams<{ vendorId: string; period: string }>();
    const { audits, config: globalConfig, vendors, auditStatus, calculateScore } = useApp();
    const navigate = useNavigate();

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // 1. Resolve Audit Key & Entries
    let key = `${vendorId}-${period}`;
    let auditEntries = audits[key];
    let status = auditStatus[key] || 'draft';

    // Fallback: Check for composite keys if legacy key not found
    if (!auditEntries || auditEntries.length === 0) {
        const prefix = `${vendorId}-${period}-`;
        const foundKey = Object.keys(audits).find(k => k.startsWith(prefix));
        if (foundKey) {
            key = foundKey;
            auditEntries = audits[key];
            status = auditStatus[key];
        }
    }

    auditEntries = auditEntries || [];

    // 2. Resolve Configuration for this specific audit
    // Priority:
    // 1. URL Query Param (explicit request)
    // 2. Audit's stored configId (implicit correct)
    // 3. Global active config (fallback)
    const [searchParams] = useSearchParams();
    const queryConfigId = searchParams.get('configId');

    const usedConfigId = queryConfigId || (auditEntries.length > 0 ? auditEntries[0].scorecardConfigId : undefined);

    const displayConfig: AppConfig = React.useMemo(() => {
        if (usedConfigId) {
            const specificConfig = scorecardConfigService.getConfig(usedConfigId);
            if (specificConfig) return specificConfig;
        }
        return globalConfig;
    }, [usedConfigId, globalConfig]);

    const vendor = vendors.find(v => v.id === vendorId);

    if (!vendor || auditEntries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <FileText size={40} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Audit Not Found</h2>
                <p className="text-slate-500 mb-8">No audit data found for this vendor and period.</p>
                <Link to="/" className="btn-primary flex items-center gap-2">
                    <ArrowLeft size={18} />
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    const results = calculateScore(vendorId!, period!, usedConfigId);

    const toggleCategory = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    const handleExportPDF = async () => {
        try {
            setIsExporting(true);

            // 1. Expand all categories to ensure everything is rendered
            const allCategoryIds = new Set(displayConfig.categories.map(c => c.id));
            const previousExpanded = new Set(expandedCategories);
            setExpandedCategories(allCategoryIds);

            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 1000));

            const element = document.getElementById('audit-details-content');
            if (!element) throw new Error('Content not found');

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                onclone: (doc: Document) => {
                    const el = doc.getElementById('audit-details-content');
                    if (el) {
                        // Remove animations
                        el.classList.remove('animate-in', 'fade-in');

                        // Hide buttons and no-print elements
                        const buttons = el.querySelectorAll('button, .no-print');
                        buttons.forEach((b: Element) => (b as HTMLElement).style.display = 'none');

                        // Ensure full height
                        el.style.height = 'auto';
                        el.style.overflow = 'visible';
                    }
                }
            });

            // Restore expanded state
            setExpandedCategories(previousExpanded);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            // Add margins to the PDF
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 5; // 5mm margins
            const imgWidth = pdfWidth - (2 * margin);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = margin;

            // Add first page with margins
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 2 * margin);

            // Add subsequent pages
            while (heightLeft > 0) {
                position = -(imgHeight - heightLeft) + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - 2 * margin);
            }

            pdf.save(`Audit_Report_${vendor.name}_${period}.pdf`);

        } catch (error) {
            console.error('Export failed', error);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const getStatusBadge = () => {
        const colors = {
            draft: 'bg-amber-100 text-amber-800 border-amber-200',
            finalized: 'bg-green-100 text-green-800 border-green-200',
            appealed: 'bg-blue-100 text-blue-800 border-blue-200'
        };
        return (
            <span className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border',
                colors[status as keyof typeof colors] || colors.draft
            )}>
                {status}
            </span>
        );
    };

    const totalKpis = displayConfig.kpis.length;
    const failedKpis = (Object.values(results.categoryScores) as CategoryScoreResult[]).flatMap((cat) =>
        Object.values(cat.kpiScores).filter((kpiScore) => kpiScore.score < 100)
    ).length;

    return (
        <div className="space-y-6 pb-12 animate-in fade-in" id="audit-details-content">
            {/* Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                    <button
                        className="absolute top-4 right-4 text-white hover:text-red-400 transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <XCircle size={32} />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-keeta-primary rounded-full blur-[100px] opacity-20 -mr-16 -mt-16"></div>

                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <Link to="/" className="text-white/60 hover:text-white transition-colors no-print">
                                    <ArrowLeft size={24} />
                                </Link>
                                <h1 className="text-3xl font-black text-white">Audit Report</h1>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                {getStatusBadge()}
                                <span className="text-white/60 text-sm">•</span>
                                <span className="text-white/90 font-medium">{vendor.name}</span>
                                <span className="text-white/60 text-sm">•</span>
                                <span className="text-white/90 font-medium">
                                    {new Date(period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 no-print">
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border border-white/20 transition-colors disabled:opacity-50"
                            >
                                {isExporting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Download size={16} />
                                )}
                                Export PDF
                            </button>
                            <button
                                onClick={() => navigate(`/audit/trainingDelivery`)}
                                className="bg-keeta-primary hover:bg-emerald-400 text-slate-900 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                            >
                                <Edit size={16} />
                                Edit Audit
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div>
                            <div className="text-sm font-bold text-white/60 uppercase tracking-wider mb-2">Overall Score</div>
                            <div className="text-6xl font-black text-keeta-primary">
                                {Math.round(results.score)}
                                <span className="text-2xl text-white/40 font-medium ml-2">/100</span>
                            </div>
                        </div>
                        <div className={clsx(
                            "w-2 h-24 rounded-full",
                            results.rag === 'green' ? "bg-green-400" :
                                results.rag === 'amber' ? "bg-amber-400" : "bg-red-400"
                        )}></div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                            <FileText size={20} className="text-slate-600" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Total KPIs</div>
                            <div className="text-2xl font-black text-slate-900">{totalKpis}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <CheckCircle size={20} className="text-green-600" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Passed</div>
                            <div className="text-2xl font-black text-green-600">{totalKpis - failedKpis}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-red-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                            <XCircle size={20} className="text-red-600" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Failed</div>
                            <div className="text-2xl font-black text-red-600">{failedKpis}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Breakdown */}
            <div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">Category Breakdown</h2>
                <div className="space-y-4">
                    {displayConfig.categories.map(category => {
                        const isExpanded = expandedCategories.has(category.id);
                        const categoryScore = results.categoryScores[category.id];
                        const categoryKpis = displayConfig.kpis.filter(kpi => kpi.categoryId === category.id);

                        return (
                            <div key={category.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-left">
                                            <div className="font-black text-lg text-slate-900">{category.label}</div>
                                            <div className="text-sm text-slate-500">
                                                Weight: {category.weight}% • {categoryKpis.length} KPIs
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right mr-4">
                                            <div className="text-xs font-bold text-slate-400 uppercase">Score</div>
                                            <div
                                                className="text-3xl font-black"
                                                style={{ color: getRagColor(categoryScore?.score || 0) }}
                                            >
                                                {Math.round(categoryScore?.score || 0)}%
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-slate-200 bg-slate-50 p-6">
                                        <div className="space-y-4">
                                            {categoryKpis.map(kpi => {
                                                const entry = auditEntries.find(e => e.kpiId === kpi.id);
                                                const kpiScore = categoryScore?.kpiScores[kpi.id];
                                                const isFailed = kpiScore && kpiScore.score < 100;

                                                return (
                                                    <div
                                                        key={kpi.id}
                                                        className={clsx(
                                                            "bg-white rounded-xl p-4 border-2",
                                                            isFailed ? "border-red-200" : "border-slate-100"
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold">{kpi.id}</span>
                                                                    <span className="font-bold text-slate-900">{kpi.label}</span>
                                                                </div>
                                                                <div className="text-sm text-slate-600">{kpi.description}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs font-bold text-slate-400 uppercase">Score</div>
                                                                <div
                                                                    className="text-2xl font-black"
                                                                    style={{ color: getRagColor(kpiScore?.score || 0) }}
                                                                >
                                                                    {Math.round(kpiScore?.score || 0)}%
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {entry && (
                                                            <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                                                                <span>Done: <strong>{entry.auditsDone}</strong></span>
                                                                <span>Met: <strong>{entry.auditsMet}</strong></span>
                                                                <span>Missed: <strong>{entry.auditsMissed}</strong></span>
                                                            </div>
                                                        )}

                                                        {entry?.commentsForMissed && (
                                                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
                                                                    <AlertTriangle size={12} className="text-amber-500" />
                                                                    Comments
                                                                </div>
                                                                <p className="text-sm text-slate-700 italic">"{entry.commentsForMissed}"</p>
                                                            </div>
                                                        )}

                                                        {/* Attachments */}
                                                        {entry?.attachments && entry.attachments.length > 0 && (
                                                            <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-slate-200">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <FileText size={16} className="text-keeta-primary" />
                                                                    <div className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                                                        Evidence Attached ({entry.attachments.length})
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                    {entry.attachments.map((attachment, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="group relative bg-white rounded-xl border-2 border-slate-200 overflow-hidden cursor-pointer hover:border-keeta-primary hover:shadow-lg transition-all aspect-square"
                                                                            title="Click to view full size"
                                                                        >
                                                                            <AttachmentThumbnail
                                                                                attachment={attachment as AttachmentMetadata}
                                                                                onClick={setSelectedImage}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};