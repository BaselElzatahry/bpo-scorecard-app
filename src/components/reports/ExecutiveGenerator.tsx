import React, { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { calculateScores, getRagColor } from '../../utils/scoring';
import { scorecardConfigService } from '../../services/scorecard-config.service';
import { useApp } from '../../context/AppContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExecutiveAuditItem {
    key: string;
    vendorId: string;
    vendorName: string;
    period: string;
    configId?: string;
    score: number;
    rag: 'green' | 'amber' | 'red';
}

interface ExecutiveGeneratorProps {
    /** Filtered audit items from ReportsPage */
    audits: ExecutiveAuditItem[];
    /** Called when the PDF has been saved (or failed) */
    onDone: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RAG_BG: Record<string, string> = {
    green: '#dcfce7',
    amber: '#fef9c3',
    red: '#fee2e2',
};

const RAG_TEXT: Record<string, string> = {
    green: '#16a34a',
    amber: '#ca8a04',
    red: '#dc2626',
};

const RAG_LABEL: Record<string, string> = {
    green: 'GREEN',
    amber: 'AMBER',
    red: 'RED',
};

/** Format "2025-01" → "January 2025" */
function formatPeriod(p: string): string {
    try {
        return new Date(p + '-02').toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return p;
    }
}

// ---------------------------------------------------------------------------
// Page renderer – one A4-sized card per vendor audit
// ---------------------------------------------------------------------------

interface PageProps {
    audit: ExecutiveAuditItem;
    pageRef: React.RefCallback<HTMLDivElement>;
    categories: { id: string; label: string; weight: number }[];
    categoryScores: Record<string, { score: number; rag: string }>;
}

const ExecutivePage: React.FC<PageProps> = ({ audit, pageRef, categories, categoryScores }) => {
    // A4 at 96 dpi is roughly 794 × 1123 px; we use 794 × 1050 to keep things tight.
    const scoreColor = RAG_TEXT[audit.rag] ?? '#1e293b';
    const focusAreas = categories
        .filter(c => (categoryScores[c.id]?.score ?? 100) < 100)
        .map(c => ({ ...c, score: categoryScores[c.id]?.score ?? 0, rag: categoryScores[c.id]?.rag ?? 'red' }))
        .sort((a, b) => a.score - b.score);

    return (
        <div
            ref={pageRef}
            style={{
                width: '794px',
                minHeight: '1050px',
                backgroundColor: '#ffffff',
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* ── HEADER ── */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
                    padding: '36px 40px 32px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Decorative glow */}
                <div style={{
                    position: 'absolute', top: '-60px', right: '-60px',
                    width: '260px', height: '260px',
                    background: 'radial-gradient(circle, rgba(250,204,21,0.18) 0%, transparent 70%)',
                    borderRadius: '50%',
                }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                    {/* Left — name + period + label */}
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Vendor Performance Report
                        </div>
                        <div style={{ color: '#ffffff', fontSize: '30px', fontWeight: 800, lineHeight: 1.15, marginBottom: '8px' }}>
                            {audit.vendorName}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500 }}>
                            {formatPeriod(audit.period)}
                        </div>
                    </div>

                    {/* Right — score circle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '110px', height: '110px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            border: `3px solid ${scoreColor}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 0 24px ${scoreColor}55`,
                        }}>
                            <span style={{ fontSize: '38px', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                                {Math.round(audit.score)}
                            </span>
                            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>/ 100</span>
                        </div>
                        <div style={{
                            padding: '4px 14px', borderRadius: '20px',
                            backgroundColor: RAG_BG[audit.rag],
                            color: RAG_TEXT[audit.rag],
                            fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px',
                        }}>
                            {RAG_LABEL[audit.rag]}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── BODY ── */}
            <div style={{ padding: '32px 40px', flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>

                {/* Category Performance */}
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>
                        Category Performance
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {categories.map(cat => {
                            const cs = categoryScores[cat.id];
                            if (!cs) return null;
                            const pct = Math.round(cs.score);
                            const barColor = getRagColor(cs.score);
                            return (
                                <div key={cat.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{cat.label}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: RAG_TEXT[cs.rag] ?? barColor }}>
                                                {pct}%
                                            </span>
                                            <span style={{
                                                padding: '2px 9px', borderRadius: '12px',
                                                background: RAG_BG[cs.rag] ?? '#f1f5f9',
                                                color: RAG_TEXT[cs.rag] ?? '#475569',
                                                fontSize: '9px', fontWeight: 700, letterSpacing: '1px',
                                            }}>
                                                {RAG_LABEL[cs.rag] ?? cs.rag.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div style={{ height: '8px', borderRadius: '8px', background: '#f1f5f9', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${pct}%`,
                                            borderRadius: '8px',
                                            background: `linear-gradient(90deg, ${barColor}aa, ${barColor})`,
                                            transition: 'width 0s',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Focus Areas */}
                {focusAreas.length > 0 && (
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
                            Focus Areas
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {focusAreas.map(fa => (
                                <div key={fa.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', borderRadius: '10px',
                                    background: RAG_BG[fa.rag] ?? '#fef9c3',
                                    border: `1px solid ${RAG_TEXT[fa.rag]}33`,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '14px' }}>⚠</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{fa.label}</span>
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: RAG_TEXT[fa.rag] }}>
                                        {Math.round(fa.score)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {focusAreas.length === 0 && (
                    <div style={{
                        padding: '20px', borderRadius: '12px', background: '#f0fdf4',
                        border: '1px solid #bbf7d0', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '24px', marginBottom: '6px' }}>🎉</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>All pillars at 100% — Excellent performance!</div>
                    </div>
                )}
            </div>

            {/* ── FOOTER ── */}
            <div style={{
                borderTop: '1px solid #e2e8f0', padding: '14px 40px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                    BPO Scorecard — Executive Report
                </span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                    Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const ExecutiveGenerator: React.FC<ExecutiveGeneratorProps> = ({ audits, onDone }) => {
    const { audits: allAudits, config } = useApp();
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Build per-audit scoring data
    const auditDataList = audits.map(audit => {
        const vendorAudits = allAudits[audit.key] ?? [];

        // Resolve the scorecard config for this audit
        let categories = config.categories;
        let kpis = config.kpis;

        if (audit.configId) {
            const auditConfig = scorecardConfigService.getConfig(audit.configId);
            if (auditConfig) {
                categories = auditConfig.categories;
                kpis = auditConfig.kpis;
            }
        }

        const results = calculateScores(vendorAudits, categories, kpis, audit.vendorId, audit.period);

        return { audit, categories, categoryScores: results.categoryScores };
    });

    useEffect(() => {
        const generate = async () => {
            if (auditDataList.length === 0) {
                onDone();
                return;
            }

            try {
                const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();   // 210 mm
                const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

                for (let i = 0; i < auditDataList.length; i++) {
                    const el = pageRefs.current[i];
                    if (!el) continue;

                    const canvas = await html2canvas(el, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff',
                    });

                    const imgData = canvas.toDataURL('image/png');
                    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

                    if (i > 0) pdf.addPage();

                    // If content is shorter than a full A4 page, centre it vertically
                    const yOffset = imgHeight < pdfHeight ? (pdfHeight - imgHeight) / 2 : 0;
                    pdf.addImage(imgData, 'PNG', 0, yOffset, pdfWidth, Math.min(imgHeight, pdfHeight));
                }

                const dateStr = new Date().toISOString().slice(0, 10);
                pdf.save(`Executive_Report_${dateStr}.pdf`);
            } catch (error) {
                console.error('Executive PDF export failed:', error);
            } finally {
                onDone();
            }
        };

        // Small timeout allows the DOM to fully paint before capture
        const timer = setTimeout(generate, 150);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        // Rendered off-screen — invisible to the user but captured by html2canvas
        <div
            aria-hidden="true"
            style={{
                position: 'fixed',
                top: 0,
                left: '-9999px',
                zIndex: -1,
                pointerEvents: 'none',
                width: '794px',
            }}
        >
            {auditDataList.map(({ audit, categories, categoryScores }, i) => (
                <ExecutivePage
                    key={audit.key}
                    audit={audit}
                    pageRef={(el) => { pageRefs.current[i] = el; }}
                    categories={categories}
                    categoryScores={categoryScores}
                />
            ))}
        </div>
    );
};
