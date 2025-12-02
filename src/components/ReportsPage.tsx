import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Calendar, Trash2, Download, Search, Edit, CheckSquare, Square, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateScores } from '../utils/scoring';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ConfirmationModal } from './ConfirmationModal';
import { VendorSelector } from './VendorSelector';

export const ReportsPage: React.FC = () => {
    const { vendors, config, audits, startedAudits, auditStatus, deleteAudit, setVendor, setPeriod, setAuditStatus, markAsEditing } = useApp();
    const { showToast } = useToast();
    const navigate = useNavigate();

    // --- State ---
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
    const [startMonth, setStartMonth] = useState('2024-01'); // Default to show history from 2024
    const [endMonth, setEndMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedAuditKeys, setSelectedAuditKeys] = useState<Set<string>>(new Set());
    const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'vendor-asc' | 'vendor-desc'>('date-desc');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [minScore, setMinScore] = useState<number | ''>('');
    const [maxScore, setMaxScore] = useState<number | ''>('');

    // --- Derived Data (The List) ---
    const filteredAudits = useMemo(() => {
        // 1. Get all started audit keys
        const keys = Object.keys(startedAudits).filter(k => startedAudits[k]);

        // 2. Map to objects
        const list = keys.map(key => {
            // Fix: Handle UUIDs containing hyphens. Period is always YYYY-MM (7 chars) at the end.
            const period = key.slice(-7);
            const vendorId = key.slice(0, -8);
            const vendor = vendors.find(v => v.id === vendorId);
            const status = auditStatus[key] || 'draft';

            // Calculate score
            const vendorAudits = audits[key] || [];
            const results = calculateScores(vendorAudits, config.categories, config.kpis, vendorId, period);

            return {
                key,
                vendorId,
                vendorName: vendor?.name || 'Unknown Vendor',
                period,
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
            // Fix: Period is always last 7 chars (YYYY-MM), vendorId is everything before the last hyphen
            const period = key.slice(-7);
            const vendorId = key.slice(0, -8); // Remove '-YYYY-MM' (8 chars total)
            deleteAudit(vendorId, period);
        });

        setSelectedAuditKeys(new Set());
        setShowDeleteModal(false);

        // Show success notification
        const message = count === 1 ? 'Audit deleted successfully' : `${count} audits deleted successfully`;
        showToast(message, 'success');
    };

    const handleDeleteSingle = (audit: typeof filteredAudits[0]) => {
        deleteAudit(audit.vendorId, audit.period);
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
            const { vendorId, period, vendorName } = audit;

            const vendorAudits = audits[audit.key] || [];
            const scores = calculateScores(vendorAudits, config.categories, config.kpis, vendorId, period);

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
            config.categories.forEach(cat => {
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
                const catKpis = config.kpis.filter(k => k.categoryId === cat.id);
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

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Reports & Management</h2>
                        <p className="text-sm text-slate-500">Manage, edit, and export vendor scorecards.</p>
                    </div>

                    {/* Search + Score Range + Sort */}
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Search */}
                        <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                            <input
                                type="text"
                                placeholder="Search vendor..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent text-sm text-slate-700 focus:outline-none w-48"
                            />
                        </div>

                        {/* Score Range */}
                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <span>Score:</span>
                            <input
                                type="number"
                                placeholder="Min"
                                min="0"
                                max="100"
                                value={minScore}
                                onChange={(e) => setMinScore(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-16 bg-transparent text-sm text-slate-700 focus:outline-none"
                            />
                            <span>-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                min="0"
                                max="100"
                                value={maxScore}
                                onChange={(e) => setMaxScore(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-16 bg-transparent text-sm text-slate-700 focus:outline-none"
                            />
                        </div>

                        {/* Sort */}
                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <span>Sort by:</span>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as any)}
                                className="bg-transparent focus:outline-none text-slate-700"
                            >
                                <option value="date-desc">Date (Newest First)</option>
                                <option value="date-asc">Date (Oldest First)</option>
                                <option value="vendor-asc">Vendor (A-Z)</option>
                                <option value="vendor-desc">Vendor (Z-A)</option>
                                <option value="score-desc">Score (High to Low)</option>
                                <option value="score-asc">Score (Low to High)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Date Range */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <span>From:</span>
                        <input
                            type="month"
                            value={startMonth}
                            onChange={(e) => setStartMonth(e.target.value)}
                            className="bg-transparent focus:outline-none text-slate-700"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <span>To:</span>
                        <input
                            type="month"
                            value={endMonth}
                            onChange={(e) => setEndMonth(e.target.value)}
                            className="bg-transparent focus:outline-none text-slate-700"
                        />
                    </div>
                </div>

                {/* Vendor Pills */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedVendorIds([])}
                        className={clsx(
                            "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                            selectedVendorIds.length === 0
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                    >
                        All Vendors
                    </button>
                    {vendors.map(v => (
                        <button
                            key={v.id}
                            onClick={() => toggleVendor(v.id)}
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                                selectedVendorIds.includes(v.id)
                                    ? "bg-keeta-primary text-slate-900"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            )}
                        >
                            {v.name}
                        </button>
                    ))}
                </div>
            </div>


            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left w-12">
                                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-keeta-primary transition-colors">
                                    {selectedAuditKeys.size > 0 && selectedAuditKeys.size === filteredAudits.length ? (
                                        <CheckSquare size={20} className="text-keeta-primary" />
                                    ) : (
                                        <Square size={20} />
                                    )}
                                </button>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Period</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredAudits.length > 0 ? (
                            filteredAudits.map(audit => (
                                <tr key={audit.key} className={clsx(
                                    "hover:bg-slate-50 transition-colors group",
                                    selectedAuditKeys.has(audit.key) && "bg-slate-50"
                                )}>
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleSelectAudit(audit.key)} className="text-slate-400 hover:text-keeta-primary transition-colors">
                                            {selectedAuditKeys.has(audit.key) ? (
                                                <CheckSquare size={20} className="text-keeta-primary" />
                                            ) : (
                                                <Square size={20} />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-slate-900">{audit.vendorName}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-slate-600">{audit.period}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx(
                                                "text-lg font-black",
                                                audit.rag === 'green' ? "text-green-500" :
                                                    audit.rag === 'amber' ? "text-amber-500" : "text-red-500"
                                            )}>
                                                {Math.round(audit.score)}
                                            </span>
                                            <span className="text-xs text-slate-400">/ 100</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider",
                                            audit.status === 'finalized' ? "bg-green-100 text-green-700" :
                                                audit.status === 'appealed' ? "bg-amber-100 text-amber-700" :
                                                    "bg-slate-100 text-slate-600"
                                        )}>
                                            {audit.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditClick(audit)}
                                                className="text-slate-400 hover:text-keeta-primary font-medium text-sm flex items-center gap-1"
                                                title="Edit audit"
                                            >
                                                <Edit size={14} /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSingle(audit)}
                                                className="text-slate-400 hover:text-red-500 font-medium text-sm flex items-center gap-1"
                                                title="Delete audit"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search size={32} className="text-slate-300" />
                                        <p>No scorecards found matching your filters.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

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
