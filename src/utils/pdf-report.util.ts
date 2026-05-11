import jsPDF from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpiReportRow {
    label: string;
    score: number;
    rag: 'green' | 'amber' | 'red';
    met: number;
    done: number;
    comment?: string;
    attachments?: { dataUrl: string; width: number; height: number }[];
}

export interface CategoryReportRow {
    label: string;
    weight: number;         // original configured weight
    effectiveWeight: number; // weight after N/A redistribution
    score: number;
    rag: 'green' | 'amber' | 'red' | 'na';
    met: number;
    done: number;
    kpis: KpiReportRow[];
}

export interface VendorReportData {
    vendorName: string;
    period: string; // YYYY-MM
    score: number;
    rag: 'green' | 'amber' | 'red' | 'na';
    status: string;
    categories: CategoryReportRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PW = 210; // page width mm
const PH = 297; // page height mm
const ML = 14;  // left margin
const MR = 14;  // right margin
const CW = PW - ML - MR; // content width = 182mm
const FOOTER_Y = 284;
const HEADER_H = 42;

type RGB = [number, number, number];

const C = {
    navy: [15, 23, 42] as RGB,
    navy2: [30, 41, 59] as RGB,
    slate7: [51, 65, 85] as RGB,
    slate6: [71, 85, 105] as RGB,
    slate4: [148, 163, 184] as RGB,
    slate2: [203, 213, 225] as RGB,
    slate1: [241, 245, 249] as RGB,
    slate05: [248, 250, 252] as RGB,
    white: [255, 255, 255] as RGB,
    gold: [245, 158, 11] as RGB,
    green: [22, 163, 74] as RGB,
    greenL: [220, 252, 231] as RGB,
    amber: [180, 100, 6] as RGB,
    amberL: [254, 243, 199] as RGB,
    red: [220, 38, 38] as RGB,
    redL: [254, 226, 226] as RGB,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ragFg(rag: string): RGB {
    if (rag === 'na') return [148, 163, 184] as RGB; // slate-400
    if (rag === 'green') return C.green;
    if (rag === 'amber') return C.amber;
    return C.red;
}
function ragBg(rag: string): RGB {
    if (rag === 'na') return [241, 245, 249] as RGB; // slate-100
    if (rag === 'green') return C.greenL;
    if (rag === 'amber') return C.amberL;
    return C.redL;
}
function ragLabel(rag: string) { return rag === 'na' ? 'N/A' : rag.toUpperCase(); }

function fmtPeriod(p: string) {
    try { return new Date(p + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
    catch { return p; }
}

function compliance(met: number, done: number): string {
    if (done === 0) return 'N/A';
    return `${Math.round((met / done) * 100)}%`;
}

// ─── Builder class ────────────────────────────────────────────────────────────

class PDF {
    d: jsPDF;
    constructor() { this.d = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); }

    fill(x: number, y: number, w: number, h: number, c: RGB) {
        this.d.setFillColor(c[0], c[1], c[2]);
        this.d.rect(x, y, w, h, 'F');
    }
    stroke(x: number, y: number, w: number, h: number, c: RGB, lw = 0.25) {
        this.d.setDrawColor(c[0], c[1], c[2]);
        this.d.setLineWidth(lw);
        this.d.rect(x, y, w, h, 'S');
    }
    fillStroke(x: number, y: number, w: number, h: number, fc: RGB, sc: RGB, lw = 0.25) {
        this.d.setFillColor(fc[0], fc[1], fc[2]);
        this.d.setDrawColor(sc[0], sc[1], sc[2]);
        this.d.setLineWidth(lw);
        this.d.rect(x, y, w, h, 'FD');
    }
    txt(s: string, x: number, y: number, opts: {
        sz?: number; bold?: boolean; c?: RGB; align?: 'left' | 'center' | 'right'; mw?: number;
    } = {}) {
        const { sz = 9, bold = false, c = C.navy, align = 'left', mw } = opts;
        this.d.setFont('helvetica', bold ? 'bold' : 'normal');
        this.d.setFontSize(sz);
        this.d.setTextColor(c[0], c[1], c[2]);
        const o: any = { align };
        if (mw) o.maxWidth = mw;
        this.d.text(s, x, y, o);
    }
    hline(x: number, y: number, w: number, c: RGB = C.slate2, lw = 0.25) {
        this.d.setDrawColor(c[0], c[1], c[2]);
        this.d.setLineWidth(lw);
        this.d.line(x, y, x + w, y);
    }
    circle(cx: number, cy: number, r: number, c: RGB, lw = 0.8) {
        this.d.setDrawColor(c[0], c[1], c[2]);
        this.d.setLineWidth(lw);
        this.d.circle(cx, cy, r, 'S');
    }
    page() { this.d.addPage(); }
    save(name: string) { this.d.save(name); }
}

// ─── Section renderers ────────────────────────────────────────────────────────

function drawPageHeader(p: PDF, vendor: string, period: string, score: number, rag: 'green' | 'amber' | 'red', status: string) {
    // Header background
    p.fill(0, 0, PW, HEADER_H, C.navy);
    p.fill(0, 0, 3, HEADER_H, C.gold); // gold accent bar

    // ── Left: label / vendor name / period ────────────────────────────────────
    // "VENDOR PERFORMANCE REPORT" label  (baseline y=9)
    p.txt('VENDOR PERFORMANCE REPORT', ML + 4, 9, { sz: 6.5, c: C.slate4 });
    // Vendor name  (baseline y=22, cap-height ~3mm → visual centre ≈ 19–20mm)
    p.txt(vendor, ML + 4, 22, { sz: 17, bold: true, c: C.white, mw: 128 });
    // Period  (baseline y=31)
    p.txt(fmtPeriod(period), ML + 4, 31, { sz: 8, c: C.slate4 });

    // ── Centre-right: Status pill ─────────────────────────────────────────────
    // Pill rect: x=136, y=11, w=28, h=8
    const statLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const statC: RGB = status === 'finalized' ? C.green : status === 'appealed' ? C.amber : C.slate6;
    // "Status" caption above pill (baseline y=9.5)
    p.txt('STATUS', 150, 9.5, { sz: 5.5, c: C.slate4, align: 'center' });
    // Pill background
    p.fill(136, 11.5, 28, 8.5, statC);
    // Pill text — baseline at 11.5 + 8.5/2 + cap_half ≈ 11.5 + 4.25 + 1.8 = 17.55 → y=17.5
    p.txt(statLabel.toUpperCase(), 150, 17.5, { sz: 6.5, bold: true, c: C.white, align: 'center' });

    // ── Right: Score circle ───────────────────────────────────────────────────
    // Circle: cx=192, cy=19, r=12  → top=7, bottom=31 (all within HEADER_H=38)
    const sc = ragFg(rag);
    const cx = 191;
    const cy = 19;
    const r = 12;
    p.circle(cx, cy, r, sc, 1.4);

    // Score number — we want the visual centre of the digit block at cy.
    // At sz=14 Helvetica bold: cap-height ≈ 14 × 0.72 × 0.264583 ≈ 2.67mm.
    // To centre: baseline = cy + cap_height/2 = 19 + 1.34 ≈ 20.3 → use 20.5
    p.txt(String(Math.round(score)), cx, 20.5, { sz: 14, bold: true, c: sc, align: 'center' });

    // "%" — sz=6.5, cap-height ≈ 0.72 × 6.5 × 0.264583 ≈ 1.24mm, visual centre ≈ 0.62mm above baseline.
    // Place it just below the number: baseline = 20.5 + 4 = 24.5
    p.txt('%', cx, 24.8, { sz: 6.5, c: C.slate4, align: 'center' });

    // RAG badge — drawn BELOW the circle, outside it
    // Circle bottom = cy + r = 31. Badge rect at y=32.5, h=5.
    const ragBadgeBg = ragBg(rag);
    p.fill(cx - 10, 32.5, 20, 5, ragBadgeBg);
    // Badge text baseline ≈ 32.5 + 5/2 + 1 = 36 → use 36
    p.txt(ragLabel(rag), cx, 36.2, { sz: 5.5, bold: true, c: sc, align: 'center' });
}

function drawFooter(p: PDF, generatedDate: string) {
    p.hline(ML, FOOTER_Y, CW, C.slate2, 0.3);
    p.txt('BPO Scorecard System  ·  Confidential', ML, FOOTER_Y + 4.5, { sz: 6.5, c: C.slate4 });
    p.txt(`Generated: ${generatedDate}`, ML + CW, FOOTER_Y + 4.5, { sz: 6.5, c: C.slate4, align: 'right' });
}

function drawSectionTitle(p: PDF, title: string, y: number): number {
    p.hline(ML, y, CW, C.slate2, 0.3);
    p.fill(ML, y, 2.5, 6, C.gold);
    p.txt(title.toUpperCase(), ML + 5, y + 5, { sz: 7, bold: true, c: C.slate6 });
    return y + 10;
}

function drawStatBar(p: PDF, data: VendorReportData, y: number): number {
    const boxW = CW / 3;
    const h = 17;
    const items = [
        { label: 'OVERALL SCORE', val: `${Math.round(data.score)}%`, vc: ragFg(data.rag) },
        { label: 'PERFORMANCE STATUS', val: ragLabel(data.rag), vc: ragFg(data.rag) },
        { label: 'AUDIT STATUS', val: data.status.charAt(0).toUpperCase() + data.status.slice(1), vc: C.slate6 },
    ];
    items.forEach((it, i) => {
        const bx = ML + i * boxW;
        p.fillStroke(bx, y, boxW - 1, h, C.slate05, C.slate2);
        p.txt(it.label, bx + (boxW - 1) / 2, y + 5, { sz: 6, c: C.slate4, align: 'center' });
        p.txt(it.val, bx + (boxW - 1) / 2, y + 12.5, { sz: 12, bold: true, c: it.vc, align: 'center' });
    });
    return y + h + 4;
}

function drawCategoryTable(p: PDF, data: VendorReportData, y: number): number {
    y = drawSectionTitle(p, 'Category Performance', y);
    const rowH = 10;
    const cols = { name: ML + 2, score: ML + 84, bar: ML + 100, status: ML + 150, wt: ML + 166 };

    // Header
    p.fill(ML, y, CW, 7, C.navy2);
    p.txt('CATEGORY', cols.name, y + 5, { sz: 6, bold: true, c: C.white });
    p.txt('SCORE', cols.score, y + 5, { sz: 6, bold: true, c: C.white });
    p.txt('PERFORMANCE', cols.bar, y + 5, { sz: 6, bold: true, c: C.white });
    p.txt('RATING', cols.status, y + 5, { sz: 6, bold: true, c: C.white });
    p.txt('WEIGHT', cols.wt, y + 5, { sz: 6, bold: true, c: C.white });
    y += 7;

    data.categories.forEach((cat, idx) => {
        const ry = y + idx * rowH;
        p.fill(ML, ry, CW, rowH, idx % 2 === 0 ? C.white : C.slate05);
        p.hline(ML, ry + rowH, CW, C.slate2, 0.15);

        p.txt(cat.label, cols.name, ry + 6.8, { sz: 8.5, c: C.navy2, mw: 80 });

        // Score
        p.txt(cat.rag === 'na' ? 'N/A' : `${Math.round(cat.score)}%`, cols.score, ry + 6.8, { sz: 9.5, bold: true, c: ragFg(cat.rag) });

        // Bar (46mm wide)
        const barW = 46;
        p.fill(cols.bar, ry + 3.5, barW, 3, C.slate1);
        if (cat.rag !== 'na') {
            p.fill(cols.bar, ry + 3.5, barW * Math.min(cat.score / 100, 1), 3, ragFg(cat.rag));
        }

        // Badge
        p.fill(cols.status, ry + 2.5, 14, 5.5, ragBg(cat.rag));
        p.txt(ragLabel(cat.rag), cols.status + 7, ry + 6.5, { sz: 6, bold: true, c: ragFg(cat.rag), align: 'center' });

        // Weight — show redistribution when effectiveWeight differs from original
        const isNA = cat.rag === 'na';
        const redistributed = !isNA && Math.round(cat.effectiveWeight) !== Math.round(cat.weight);
        if (isNA) {
            // N/A pillar: show original weight struck through style with "N/A" note
            p.txt(`${cat.weight}%`, cols.wt, ry + 5.2, { sz: 7, c: C.slate4 });
            p.txt('(N/A)', cols.wt, ry + 8.8, { sz: 5.5, c: C.slate4 });
        } else if (redistributed) {
            // Redistributed: show original → effective, effective in gold to signal change
            p.txt(`${cat.weight}%`, cols.wt, ry + 4.8, { sz: 6, c: C.slate4 });
            p.txt(`> ${Math.round(cat.effectiveWeight)}%`, cols.wt, ry + 8.8, { sz: 7, bold: true, c: C.gold });
        } else {
            p.txt(`${cat.weight}%`, cols.wt, ry + 6.8, { sz: 8, c: C.slate6 });
        }
    });

    return y + data.categories.length * rowH + 4;
}

function drawKpiSection(p: PDF, data: VendorReportData, startY: number): number {
    let y = drawSectionTitle(p, 'KPI Breakdown', startY);

    for (const cat of data.categories) {
        if (y > FOOTER_Y - 16) break;

        // Category sub-header
        p.fill(ML, y, CW, 6.5, C.slate1);
        p.txt(cat.label.toUpperCase(), ML + 3, y + 4.8, { sz: 6.5, bold: true, c: C.slate7 });
        y += 6.5;

        // KPI column header
        p.fill(ML, y, CW, 5.5, [210, 218, 230] as RGB);
        p.txt('KPI', ML + 2, y + 3.8, { sz: 5.5, bold: true, c: C.slate6 });
        p.txt('DONE', ML + 108, y + 3.8, { sz: 5.5, bold: true, c: C.slate6 });
        p.txt('MET', ML + 122, y + 3.8, { sz: 5.5, bold: true, c: C.slate6 });
        p.txt('COMPLIANCE', ML + 136, y + 3.8, { sz: 5.5, bold: true, c: C.slate6 });
        p.txt('SCORE', ML + 158, y + 3.8, { sz: 5.5, bold: true, c: C.slate6 });
        y += 5.5;

        cat.kpis.forEach((kpi, idx) => {
            if (y > FOOTER_Y - 10) return;
            const rh = 8;
            p.fill(ML, y, CW, rh, idx % 2 === 0 ? C.white : C.slate05);
            p.hline(ML, y + rh, CW, C.slate2, 0.12);
            p.txt(kpi.label, ML + 2, y + 5.5, { sz: 7.5, c: C.navy2, mw: 103 });
            p.txt(String(kpi.done), ML + 108, y + 5.5, { sz: 7.5, c: C.slate6 });
            p.txt(String(kpi.met), ML + 122, y + 5.5, { sz: 7.5, c: C.slate6 });
            p.txt(compliance(kpi.met, kpi.done), ML + 136, y + 5.5, { sz: 7.5, c: C.slate6 });
            p.txt(`${Math.round(kpi.score)}%`, ML + 158, y + 5.5, { sz: 7.5, bold: true, c: ragFg(kpi.rag) });
            y += rh;
        });
        y += 3;
    }
    return y;
}

function drawFocusAreas(p: PDF, data: VendorReportData, y: number): number {
    const focus = data.categories.filter(c => c.score < 100).sort((a, b) => a.score - b.score);
    y = drawSectionTitle(p, focus.length === 0 ? 'Performance Highlights' : 'Focus Areas', y);

    if (focus.length === 0) {
        p.fillStroke(ML, y, CW, 11, C.greenL, C.green, 0.3);
        p.txt('All categories achieved top performance this period — Excellent results!', ML + CW / 2, y + 7.5, { sz: 8.5, bold: true, c: C.green, align: 'center' });
        return y + 15;
    }

    focus.forEach(cat => {
        if (y > FOOTER_Y - 12) return;
        p.fillStroke(ML, y, CW - 20, 9.5, ragBg(cat.rag), ragFg(cat.rag), 0.2);
        p.txt(`${cat.label}`, ML + 3, y + 6.5, { sz: 8, c: C.navy2 });
        p.txt(`${Math.round(cat.score)}%`, ML + CW - 20, y + 6.5, { sz: 9.5, bold: true, c: ragFg(cat.rag), align: 'right' });
        y += 12;
    });

    return y;
}

// ─── Evidence Section ──────────────────────────────────────────────────────────

function drawEvidenceSection(p: PDF, data: VendorReportData, startY: number): number {
    // Include pillar KPIs that have a comment OR attachments (only for categories < 100%)
    const catsWithEvidence = data.categories.filter(c =>
        c.score < 100 && c.kpis.some(k =>
            (k.comment && k.comment.trim().length > 0) ||
            (k.attachments && k.attachments.length > 0)
        )
    );

    if (catsWithEvidence.length === 0) return startY;

    p.page();

    let y = 15;
    y = drawSectionTitle(p, 'Evidence & Comments (Pillars < 100%)', y);
    y += 5;

    for (const cat of catsWithEvidence) {
        if (y > FOOTER_Y - 30) {
            p.page();
            y = 15;
        }

        // Category header bar
        p.fill(ML, y, CW, 8, C.navy2);
        p.txt(cat.label.toUpperCase(), ML + 3, y + 5.5, { sz: 8, bold: true, c: C.white });
        p.txt(`${Math.round(cat.score)}%`, ML + CW - 3, y + 5.5, { sz: 8, bold: true, c: ragFg(cat.rag), align: 'right' });
        y += 11;

        for (const kpi of cat.kpis) {
            const hasComment = kpi.comment && kpi.comment.trim().length > 0;
            const hasAttachments = kpi.attachments && kpi.attachments.length > 0;
            if (!hasComment && !hasAttachments) continue;

            if (y > FOOTER_Y - 20) {
                p.page();
                y = 15;
                p.fill(ML, y, CW, 8, C.navy2);
                p.txt(cat.label.toUpperCase() + ' (cont.)', ML + 3, y + 5.5, { sz: 8, bold: true, c: C.white });
                y += 11;
            }

            // KPI label row
            p.fill(ML, y, CW, 7, C.slate1);
            p.txt(kpi.label, ML + 3, y + 5, { sz: 8, bold: true, c: C.navy2, mw: CW - 30 });
            p.txt(`${Math.round(kpi.score)}%`, ML + CW - 3, y + 5, { sz: 8, bold: true, c: ragFg(kpi.rag), align: 'right' });
            y += 9;

            // Comment block
            if (hasComment) {
                // Orange/amber left bar for comment
                p.fill(ML, y, 2, 0, C.amber);  // will be sized dynamically below
                const commentLines = p.d.splitTextToSize(`"${kpi.comment}"`, CW - 10);
                const commentBlockH = commentLines.length * 4.5 + 6;

                if (y + commentBlockH + 5 > FOOTER_Y) {
                    p.page();
                    y = 15;
                }

                p.fillStroke(ML, y, CW, commentBlockH, C.amberL, C.amber, 0.3);
                p.fill(ML, y, 2, commentBlockH, C.amber);
                p.txt('Comment', ML + 5, y + 4.5, { sz: 6, bold: true, c: C.amber });
                commentLines.forEach((line: string, i: number) => {
                    p.txt(line, ML + 5, y + 9 + i * 4.5, { sz: 7, c: C.slate7, mw: CW - 8 });
                });
                y += commentBlockH + 4;
            }

            // Photo attachments
            if (hasAttachments) {
                for (const att of kpi.attachments!) {
                    const maxW = CW;
                    const maxH = 180;

                    // Native pixel size → mm (96 px/inch → 1 px = 0.264583 mm)
                    let renderW = att.width * 0.264583;
                    let renderH = att.height * 0.264583;

                    // Scale down only if needed, never scale up
                    if (renderW > maxW) {
                        renderH = renderH * (maxW / renderW);
                        renderW = maxW;
                    }
                    if (renderH > maxH) {
                        renderW = renderW * (maxH / renderH);
                        renderH = maxH;
                    }

                    // Pagination check
                    if (y + renderH + 8 > FOOTER_Y) {
                        p.page();
                        y = 15;
                        p.fill(ML, y, CW, 8, C.navy2);
                        p.txt(cat.label.toUpperCase() + ' — ' + kpi.label + ' (cont.)', ML + 3, y + 5.5, { sz: 7, bold: true, c: C.white });
                        y += 11;
                    }

                    const xPos = ML + (maxW - renderW) / 2;

                    try {
                        const type = att.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                        p.d.addImage(att.dataUrl, type, xPos, y, renderW, renderH);
                    } catch (e) {
                        console.error('Failed to embed image in PDF', e);
                    }

                    // Thin border frame
                    p.stroke(xPos, y, renderW, renderH, C.slate4, 0.4);
                    y += renderH + 8;
                }
            }

            y += 4; // gap between KPIs
        }

        y += 6; // gap between categories
    }
    return y;
}

// ─── Render a complete vendor page ───────────────────────────────────────────

function renderVendorPage(p: PDF, data: VendorReportData, generatedDate: string) {
    drawPageHeader(p, data.vendorName, data.period, data.score, data.rag, data.status);
    let y = HEADER_H + 4;
    y = drawStatBar(p, data, y);
    y = drawCategoryTable(p, data, y);
    y = drawKpiSection(p, data, y + 2);
    if (y < FOOTER_Y - 30) drawFocusAreas(p, data, y + 2);
    drawFooter(p, generatedDate);
    drawEvidenceSection(p, data, FOOTER_Y);
}

// ─── Public APIs ─────────────────────────────────────────────────────────────

export function generateSingleVendorPDF(data: VendorReportData): void {
    const p = new PDF();
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    renderVendorPage(p, data, today);
    const date = new Date().toISOString().slice(0, 10);
    p.save(`Performance_Report_${data.vendorName.replace(/\s+/g, '_')}_${data.period}_${date}.pdf`);
}

export function generateConsolidatedPDF(vendors: VendorReportData[], period: string): void {
    const p = new PDF();
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const date = new Date().toISOString().slice(0, 10);

    // ── Cover page ────────────────────────────────────────────────────────────
    p.fill(0, 0, PW, PH, C.navy);
    p.fill(0, 0, PW, 5, C.gold);
    p.fill(0, PH - 5, PW, 5, C.gold);
    p.txt('BPO SCORECARD SYSTEM', PW / 2, 86, { sz: 8, c: C.slate4, align: 'center' });
    p.txt('MONTHLY PERFORMANCE', PW / 2, 106, { sz: 24, bold: true, c: C.white, align: 'center' });
    p.txt('REPORT', PW / 2, 119, { sz: 24, bold: true, c: C.gold, align: 'center' });

    // Divider line
    p.fill(ML + 30, 127, CW - 60, 0.5, C.slate6);
    p.txt(fmtPeriod(period).toUpperCase(), PW / 2, 137, { sz: 11, c: C.slate4, align: 'center' });
    p.txt(`${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} assessed`, PW / 2, 146, { sz: 9, c: C.slate6, align: 'center' });

    p.txt(`Generated: ${today}  ·  CONFIDENTIAL`, PW / 2, 278, { sz: 7, c: C.slate6, align: 'center' });

    // ── Executive summary page ────────────────────────────────────────────────
    p.page();
    p.fill(0, 0, PW, 24, C.navy);
    p.fill(0, 0, 3, 24, C.gold);
    p.txt('EXECUTIVE SUMMARY', ML + 4, 9, { sz: 6.5, c: C.slate4 });
    p.txt(`Performance Overview — ${fmtPeriod(period)}`, ML + 4, 19, { sz: 13, bold: true, c: C.white });

    let y = 30;

    // High-level stats row
    const sorted = [...vendors].sort((a, b) => b.score - a.score);
    const avgScore = vendors.reduce((s, v) => s + v.score, 0) / (vendors.length || 1);
    const greenCount = vendors.filter(v => v.rag === 'green').length;
    const amberCount = vendors.filter(v => v.rag === 'amber').length;
    const redCount = vendors.filter(v => v.rag === 'red').length;
    const avgRag: 'green' | 'amber' | 'red' = avgScore >= 90 ? 'green' : avgScore >= 80 ? 'amber' : 'red';

    const stats = [
        { lbl: 'VENDORS ASSESSED', val: String(vendors.length), vc: C.navy2 },
        { lbl: 'AVERAGE SCORE', val: `${Math.round(avgScore)}%`, vc: ragFg(avgRag) },
        { lbl: 'GREEN', val: String(greenCount), vc: C.green },
        { lbl: 'AMBER', val: String(amberCount), vc: C.amber },
        { lbl: 'RED', val: String(redCount), vc: C.red },
    ];
    const sbW = CW / stats.length;
    stats.forEach((s, i) => {
        const bx = ML + i * sbW;
        p.fillStroke(bx, y, sbW - 1, 17, C.slate05, C.slate2);
        p.txt(s.lbl, bx + (sbW - 1) / 2, y + 5, { sz: 5.5, c: C.slate4, align: 'center' });
        p.txt(s.val, bx + (sbW - 1) / 2, y + 13, { sz: 13, bold: true, c: s.vc, align: 'center' });
    });
    y += 22;

    // Rankings table
    y = drawSectionTitle(p, 'Vendor Rankings', y);

    // Table cols
    const rc = { rank: ML + 2, name: ML + 14, score: ML + 94, rag: ML + 114, cats: ML + 136 };
    p.fill(ML, y, CW, 7, C.navy2);
    p.txt('RANK', rc.rank, y + 5, { sz: 6, bold: true, c: C.white });
    p.txt('VENDOR', rc.name, y + 5, { sz: 6, bold: true, c: C.white });
    p.txt('OVERALL SCORE', rc.score, y + 5, { sz: 6, bold: true, c: C.white });
    p.txt('STATUS', rc.rag, y + 5, { sz: 6, bold: true, c: C.white });
    p.txt('CATEGORIES (G / A / R)', rc.cats, y + 5, { sz: 6, bold: true, c: C.white });
    y += 7;

    sorted.forEach((v, idx) => {
        if (y > FOOTER_Y - 12) return;
        const rh = 11;
        p.fill(ML, y, CW, rh, idx % 2 === 0 ? C.white : C.slate05);
        p.hline(ML, y + rh, CW, C.slate2, 0.15);

        p.txt(`#${idx + 1}`, rc.rank, y + 7.5, { sz: 8, bold: true, c: C.slate4 });
        p.txt(v.vendorName, rc.name, y + 7.5, { sz: 9, bold: true, c: C.navy });

        // Score with mini bar
        p.txt(`${Math.round(v.score)}%`, rc.score, y + 7.5, { sz: 10, bold: true, c: ragFg(v.rag) });
        p.fill(rc.score, y + 8.5, 16, 1.8, C.slate1);
        p.fill(rc.score, y + 8.5, 16 * Math.min(v.score / 100, 1), 1.8, ragFg(v.rag));

        // RAG badge
        p.fill(rc.rag, y + 2.5, 16, 6, ragBg(v.rag));
        p.txt(ragLabel(v.rag), rc.rag + 8, y + 7, { sz: 6.5, bold: true, c: ragFg(v.rag), align: 'center' });

        // Category G/A/R counts
        const g = v.categories.filter(c => c.rag === 'green').length;
        const a = v.categories.filter(c => c.rag === 'amber').length;
        const r = v.categories.filter(c => c.rag === 'red').length;
        p.txt(`${g} GREEN  /  ${a} AMBER  /  ${r} RED`, rc.cats, y + 7.5, { sz: 7.5, c: C.slate6 });

        y += rh;
    });

    drawFooter(p, today);

    // ── Individual vendor pages ───────────────────────────────────────────────
    sorted.forEach(v => {
        p.page();
        renderVendorPage(p, v, today);
    });

    p.save(`Monthly_Performance_Report_${period}_${date}.pdf`);
}
