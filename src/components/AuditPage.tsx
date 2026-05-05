import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';
import { ValidationSummaryModal } from './ValidationSummaryModal';
import { ScorecardSelectionModal } from './ScorecardSelectionModal';
import { calculateComplianceScore, getRagColor } from '../utils/scoring';
import { validateScore, validateImageUpload, validateAuditCompletion, ValidationError } from '../utils/validation';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';
import { Lock, ChevronRight, ChevronLeft, CheckCircle2, ShieldAlert, Paperclip, X, FileText, RotateCcw, Loader2, Save, Check, Undo, Redo, LogOut, Ban } from 'lucide-react';
import { indexedDBService } from '../services/indexedDB.service';
import { scorecardConfigService } from '../services/scorecard-config.service';

export const AuditPage: React.FC = () => {
    const { categoryId } = useParams<{ categoryId: string }>();
    const { config, audits, updateAudit, currentVendorId, currentPeriod, currentConfigId, clearAudit, setAuditsForKey, startedAudits, startAudit, setAuditStatus, auditStatus, auditConfigs, calculateScore, vendors } = useApp();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [validationError, setValidationError] = React.useState<string | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = React.useState(false);
    const [uploadingKpiId, setUploadingKpiId] = React.useState<string | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
    const [showValidationModal, setShowValidationModal] = React.useState(false);
    const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
    const [validationWarnings, setValidationWarnings] = React.useState<ValidationError[]>([]);
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, Record<string, string>>>({});
    const [showScorecardModal, setShowScorecardModal] = React.useState(false);

    // Undo/Redo State
    const [history, setHistory] = React.useState<any[][]>([]);
    const [historyIndex, setHistoryIndex] = React.useState(-1);

    const addToHistory = (currentEntries: any[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(currentEntries)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevEntries = history[historyIndex - 1];
            setAuditsForKey(currentVendorId, currentPeriod, prevEntries);
            setHistoryIndex(historyIndex - 1);
            showToast('Undo successful', 'info');
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const nextEntries = history[historyIndex + 1];
            setAuditsForKey(currentVendorId, currentPeriod, nextEntries);
            setHistoryIndex(historyIndex + 1);
            showToast('Redo successful', 'info');
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                showToast('All changes saved', 'success');
            }
            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showToast, historyIndex, history]);

    const saveAudit = (newData: any) => {
        // Capture current state before update
        const key = `${currentVendorId}-${currentPeriod}`;
        const currentEntries = audits[key] || [];

        // Only add to history if it's a new change (simple check)
        // For simplicity, we just add every save to history if it's not empty
        // Ideally we check if it's different from last history entry
        if (historyIndex === -1 || JSON.stringify(history[historyIndex]) !== JSON.stringify(currentEntries)) {
            addToHistory(currentEntries);
        }

        setIsSaving(true);
        updateAudit(newData);

        // Also add the NEW state to history so we can redo to it?
        // Actually, standard undo/redo:
        // 1. State A.
        // 2. User makes change -> State B.
        // 3. Push State A to history? No, history contains [State A, State B].
        // Let's refine:
        // When saving, we are transitioning from Current -> New.
        // We should ensure 'Current' is in history at 'Index', and then push 'New' at 'Index + 1'.

        // Simplified approach:
        // History stores snapshots.
        // When component mounts, push initial state?
        // When saveAudit happens:
        // 1. If history is empty, push current state.
        // 2. Calculate new state (locally).
        // 3. Push new state.
        // But updateAudit updates global state async.

        // Better approach for this app:
        // Just capture the state *before* the update as the "undo" point.
        // But we need to be able to "redo" to the *after* state.
        // So we need to construct the new list locally.

        // Let's stick to the simple implementation first:
        // addToHistory(currentEntries) saves the state *before* the change.
        // But this only allows Undo. To allow Redo, we need the *next* state too.

        // Revised addToHistory logic inside saveAudit:
        // We need to construct the new list locally to push it to history.
        const updatedList = [...currentEntries];
        const existingIdx = updatedList.findIndex(a => a.kpiId === newData.kpiId);
        if (existingIdx >= 0) {
            updatedList[existingIdx] = newData;
        } else {
            updatedList.push(newData);
        }

        // If history is empty, initialize with current (pre-update) state
        let newHistory = history.slice(0, historyIndex + 1);
        if (newHistory.length === 0) {
            newHistory.push(currentEntries);
        }

        newHistory.push(updatedList);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        updateAudit(newData);
        setTimeout(() => {
            setIsSaving(false);
            setLastSaved(new Date());
        }, 800);
    };

    // Load scorecard configuration for this audit (dynamic)
    const scorecardConfig = React.useMemo(() => {
        // Priority 0: Current Config ID from Context (explicit selection)
        if (currentConfigId) {
            const specificConfig = scorecardConfigService.getConfig(currentConfigId);
            if (specificConfig) return specificConfig;
        }

        const key = `${currentVendorId}-${currentPeriod}`;

        // Priority 1: Check auditConfigs (Legacy/Fallback)
        if (auditConfigs && auditConfigs[key]) {
            const specificConfig = scorecardConfigService.getConfig(auditConfigs[key]);
            if (specificConfig) return specificConfig;
        }

        // Priority 2: Check existing audits (Legacy fallback)
        const currentAudits = audits[key];
        if (currentAudits && currentAudits.length > 0) {
            const configId = currentAudits[0].scorecardConfigId;
            if (configId) {
                const specificConfig = scorecardConfigService.getConfig(configId);
                if (specificConfig) return specificConfig;
            }
        }
        return config;
    }, [config, audits, auditConfigs, currentVendorId, currentPeriod, currentConfigId]);

    const category = scorecardConfig.categories.find(c => c.id === categoryId);
    const categoryKpis = scorecardConfig.kpis.filter(k => k.categoryId === categoryId);

    // Check if this category is currently marked N/A
    const isCategoryMarkedNA = React.useMemo(() => {
        if (!category) return false;
        const key = currentConfigId
            ? `${currentVendorId}-${currentPeriod}-${currentConfigId}`
            : `${currentVendorId}-${currentPeriod}`;
        const currentAudits = audits[key] || [];
        return currentAudits.some(a => a.categoryId === category.id && a.isNA === true);
    }, [audits, category, currentVendorId, currentPeriod, currentConfigId]);

    // Check if this category has a section tag (only section-tagged categories support N/A)
    const hasSectionTag = React.useMemo(() => {
        if (!category?.description) return false;
        return /section:\w+/.test(category.description);
    }, [category]);

    // Validate category and redirect if invalid (e.g. when switching models)
    useEffect(() => {
        if (!category && scorecardConfig.categories.length > 0) {
            // If current category doesn't exist in this config, redirect to the first one
            navigate(`/audit/${scorecardConfig.categories[0].id}`, { replace: true });
        }
    }, [category, scorecardConfig, navigate]);

    const isAuditStarted = currentConfigId
        ? startedAudits[`${currentVendorId}-${currentPeriod}-${currentConfigId}`]
        : startedAudits[`${currentVendorId}-${currentPeriod}`];

    // Calculate scores for the header
    const scores = calculateScore(currentVendorId, currentPeriod);
    const categoryScore = scores?.categoryScores[categoryId || ''] || { score: 0, rag: 'red' };

    if (!category) return <div>Category not found</div>;

    if (!isAuditStarted) {
        return (
            <>
                <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in">
                    <div className="bg-slate-100 p-8 rounded-full mb-6">
                        <Lock size={48} className="text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Audit Not Started</h2>
                    <p className="text-slate-500 mb-8 text-center max-w-md">
                        You haven't started an audit for this vendor and period yet.
                        Please start the audit to begin scoring.
                    </p>
                    <button
                        onClick={() => setShowScorecardModal(true)}
                        className="btn-primary py-3 px-8 flex items-center gap-2"
                    >
                        Start Audit
                    </button>
                </div>

                <ScorecardSelectionModal
                    isOpen={showScorecardModal}
                    onClose={() => setShowScorecardModal(false)}
                    onSelect={(configId) => {
                        startAudit(currentVendorId, currentPeriod, configId);
                        setShowScorecardModal(false);
                    }}
                />
            </>
        );
    }

    const getAuditEntry = (kpiId: string) => {
        const key = currentConfigId
            ? `${currentVendorId}-${currentPeriod}-${currentConfigId}`
            : `${currentVendorId}-${currentPeriod}`;

        const currentAudits = audits[key] || [];
        const existing = currentAudits.find(a => a.kpiId === kpiId);

        return existing || {
            vendorId: currentVendorId,
            period: currentPeriod,
            categoryId: category.id,
            kpiId,
            scorecardConfigId: currentConfigId || (auditConfigs?.[key] || ''), // CRITICAL: Propagate config ID to new entries
            auditsDone: 0,
            auditsMet: 0,
            auditsMissed: 0,
            commentsForMissed: '',
            id: 'temp-' + kpiId
        };
    };

    const handleInputChange = (kpiId: string, field: 'auditsDone' | 'auditsMet' | 'auditsMissed' | 'commentsForMissed', value: number | string) => {
        const key = `${currentVendorId}-${currentPeriod}`;
        const currentAudits = audits[key] || [];
        const entry = getAuditEntry(kpiId);
        const newData = {
            ...entry, // Preserve ALL fields including attachments
            vendorId: currentVendorId,
            period: currentPeriod,
            categoryId: category.id,
            kpiId,
            id: entry.id.startsWith('temp-') ? uuidv4() : entry.id
        };

        if (field === 'auditsDone') {
            const val = Math.max(0, value as number);
            newData.auditsDone = val;
            // Recalculate met/missed but keep within bounds
            if (newData.auditsMet > val) {
                newData.auditsMet = val;
                newData.auditsMissed = 0;
            } else {
                newData.auditsMissed = val - newData.auditsMet;
            }
        } else if (field === 'auditsMet') {
            const val = Math.max(0, value as number);
            if (val > newData.auditsDone) {
                showToast('Met count cannot exceed total audits', 'warning');
                return;
            }
            newData.auditsMet = val;
            newData.auditsMissed = newData.auditsDone - val;
        } else if (field === 'auditsMissed') {
            const val = Math.max(0, value as number);
            if (val > newData.auditsDone) {
                showToast('Missed count cannot exceed total audits', 'warning');
                return;
            }
            newData.auditsMissed = val;
            newData.auditsMet = newData.auditsDone - val;
        } else if (field === 'commentsForMissed') {
            newData.commentsForMissed = value as string;
        }

        saveAudit(newData);

        // CRITICAL FIX: Clear validation error when scores change
        // This allows dynamic recalculation - if user fixes score to 100%, error should clear
        if (field !== 'commentsForMissed') {
            setValidationError(null);
        }
    };

    // ── N/A Toggle: marks the entire category as Not Applicable ──────────────
    // This creates a sentinel audit entry with isNA=true for the first KPI in the
    // category, which the scoring engine uses to trigger weight redistribution.
    const handleToggleCategoryNA = () => {
        const isCurrentlyNA = categoryKpis.some(kpi => {
            const entry = getAuditEntry(kpi.id);
            return entry.isNA === true;
        });

        categoryKpis.forEach(kpi => {
            const entry = getAuditEntry(kpi.id);
            const newData = {
                ...entry,
                vendorId: currentVendorId,
                period: currentPeriod,
                categoryId: category.id,
                kpiId: kpi.id,
                id: entry.id.startsWith('temp-') ? uuidv4() : entry.id,
                isNA: !isCurrentlyNA,
                // Reset numeric fields when marking as N/A
                ...(!isCurrentlyNA ? { auditsDone: 0, auditsMet: 0, auditsMissed: 0 } : {}),
            };
            updateAudit(newData);
        });

        showToast(
            !isCurrentlyNA
                ? `"${category.label}" marked as N/A — weight will be redistributed`
                : `"${category.label}" N/A status removed`,
            !isCurrentlyNA ? 'info' : 'success'
        );
    };

    const handleBinaryUpdate = (kpiId: string, isPass: boolean) => {
        const entry = getAuditEntry(kpiId);
        const newData = {
            ...entry, // Preserve ALL fields including attachments and comments
            vendorId: currentVendorId,
            period: currentPeriod,
            categoryId: category.id,
            kpiId,
            auditsDone: 1,
            auditsMet: isPass ? 1 : 0,
            auditsMissed: isPass ? 0 : 1,
            id: entry.id.startsWith('temp-') ? uuidv4() : entry.id
        };
        saveAudit(newData);

        // CRITICAL FIX: Clear validation error when pass/fail changes
        setValidationError(null);
    };

    const handleFileSelect = async (kpiId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const entry = getAuditEntry(kpiId);
        const currentAttachments = entry.attachments || [];

        setUploadingKpiId(kpiId);

        try {
            const newAttachments = [...currentAttachments];

            // Process all selected files
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Validate using existing validation utility
                const validationError = validateImageUpload(file, newAttachments);
                if (validationError) {
                    showToast(validationError, 'error');
                    continue; // Skip this file, continue with others
                }

                // Generate unique ID for attachment
                const auditKey = `${currentVendorId}-${currentPeriod}`;
                const attachmentId = indexedDBService.generateAttachmentId(auditKey, kpiId);

                // Store file in IndexedDB
                await indexedDBService.addAttachment(file, {
                    id: attachmentId,
                    name: file.name,
                    auditKey,
                    kpiId
                });

                // Add metadata to attachments array (NOT base64 data)
                newAttachments.push({
                    id: attachmentId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                });
            }

            // Update audit entry with new attachments metadata
            const newData = {
                ...entry,
                attachments: newAttachments
            };
            saveAudit(newData);

            showToast(`${files.length} file(s) uploaded successfully`, 'success');
        } catch (error) {
            console.error('File upload error:', error);
            showToast('Failed to upload file(s). Please try again.', 'error');
        } finally {
            setUploadingKpiId(null);
            e.target.value = ''; // Reset file input
        }
    };

    const handleRemoveAttachment = async (kpiId: string, index: number) => {
        const entry = getAuditEntry(kpiId);
        const attachments = entry.attachments || [];
        const attachmentToRemove = attachments[index];

        // If attachment has an ID, delete from IndexedDB
        if (attachmentToRemove?.id) {
            try {
                await indexedDBService.deleteAttachment(attachmentToRemove.id);
            } catch (error) {
                console.error('Failed to delete attachment from IndexedDB:', error);
                showToast('Failed to remove file', 'error');
                return;
            }
        }

        // Remove from attachments array
        const newAttachments = attachments.filter((_, i) => i !== index);
        const newData = {
            ...entry,
            attachments: newAttachments
        };
        saveAudit(newData);
        showToast('File removed', 'success');
    };

    const handleResetAudit = () => {
        setIsResetModalOpen(true);
    };

    const confirmReset = () => {
        clearAudit(currentVendorId, currentPeriod);
        setIsResetModalOpen(false);
        navigate('/'); // Go back to dashboard or home
        showToast('Audit reset successfully', 'success');
    };

    const validateCategory = () => {
        // Calculate category score first to determine if comments are required
        let totalWeight = 0;
        let weightedScore = 0;

        categoryKpis.forEach(kpi => {
            const entry = getAuditEntry(kpi.id);
            let score: number;


            if (entry.auditsDone === 0) {
                score = 100;
            } else {
                const percentage = (entry.auditsMet / entry.auditsDone) * 100;
                score = calculateComplianceScore(percentage, kpi); // Pass full KPI object
            }


            totalWeight += kpi.weight;
            weightedScore += score * kpi.weight;
        });


        // Check each KPI for missing comments regardless of category score
        const missingComments: { kpi: string; score: number }[] = [];

        // Check each KPI for missing comments and track their scores
        categoryKpis.forEach(kpi => {
            const entry = getAuditEntry(kpi.id);

            // Calculate individual KPI score
            let kpiScore: number;


            if (entry.auditsDone === 0) {
                kpiScore = 100;
            } else {
                const percentage = (entry.auditsMet / entry.auditsDone) * 100;
                kpiScore = calculateComplianceScore(percentage, kpi); // Pass full KPI object
            }

            // If this KPI scored < 100% and has no comment, flag it
            if (kpiScore < 100 && !entry.commentsForMissed?.trim()) {
                missingComments.push({ kpi: kpi.label, score: Math.round(kpiScore) });
            }
        });

        if (missingComments.length > 0) {
            const categoryName = config.categories.find(c => c.id === category.id)?.label || 'this category';
            const commentsList = missingComments.map(item => `${item.kpi} (${item.score}%)`).join(', ');
            setValidationError(
                `One or more KPIs are below 100%. Please provide comments for: ${commentsList}`
            );
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            return false;
        }

        setValidationError(null);
        return true;
    };

    const handleNext = () => {
        if (!validateCategory()) return;

        // Use scorecardConfig instead of global config to support multi-model navigation
        const currentIndex = scorecardConfig.categories.findIndex(c => c.id === categoryId);
        if (currentIndex < scorecardConfig.categories.length - 1) {
            const nextCategory = scorecardConfig.categories[currentIndex + 1];
            navigate(`/audit/${nextCategory.id}`);
            window.scrollTo(0, 0);
        } else {
            // Only finish if we're at the end of THIS scorecard's flow
            handleFinish();
        }
    };

    const handlePrev = () => {
        const currentIndex = scorecardConfig.categories.findIndex(c => c.id === categoryId);
        if (currentIndex > 0) {
            const prevCategory = scorecardConfig.categories[currentIndex - 1];
            navigate(`/audit/${prevCategory.id}`);
            window.scrollTo(0, 0);
        }
    };

    const configId = 'id' in scorecardConfig ? (scorecardConfig as any).id : undefined;
    const isAppealed = (configId && auditStatus[`${currentVendorId}-${currentPeriod}-${configId}`] === 'appealed')
        || (!configId && auditStatus[`${currentVendorId}-${currentPeriod}`] === 'appealed');

    const handleSaveDraft = () => {
        // Save without validation
        // Use composite key if config is active
        const configId = 'id' in scorecardConfig ? (scorecardConfig as any).id : undefined;
        const key = configId
            ? `${currentVendorId}-${currentPeriod}-${configId}`
            : `${currentVendorId}-${currentPeriod}`;

        // We need to call setAuditStatus but it expects (vendorId, period, status)
        // and internally decides key. In AppContext, setAuditStatus uses currentConfigId.
        // So this is actually fine as-is:
        setAuditStatus(currentVendorId, currentPeriod, 'draft');
        showToast('Draft saved successfully', 'success');
        navigate('/');
    };

    const handleFinish = () => {
        // Comprehensive validation before finalization
        // Use the ID from the currently loaded scorecard config to ensure we validate the correct data
        const configId = 'id' in scorecardConfig ? (scorecardConfig as any).id : undefined;
        const key = configId
            ? `${currentVendorId}-${currentPeriod}-${configId}`
            : `${currentVendorId}-${currentPeriod}`;

        const currentAudits = audits[key] || [];

        const validationResult = validateAuditCompletion(currentAudits, scorecardConfig.kpis);

        if (!validationResult.isValid) {
            setValidationErrors(validationResult.errors);
            setValidationWarnings(validationResult.warnings);
            setShowValidationModal(true);
            return;
        }

        // All valid - finalize
        setAuditStatus(currentVendorId, currentPeriod, 'finalized');
        showToast('Audit finalized successfully!', 'success');
        navigate('/');
    };

    const currentIndex = scorecardConfig.categories.findIndex(c => c.id === categoryId);
    const isLastCategory = currentIndex === scorecardConfig.categories.length - 1;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-4 z-30">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-2xl font-black text-slate-900">{category.label}</h2>
                                        <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Weight: {category.weight}%
                                        </span>
                                        {isCategoryMarkedNA && (
                                            <span className="px-2 py-1 bg-slate-400/10 border border-slate-300 rounded-md text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                <Ban size={12} /> N/A — Weight Redistributed
                                            </span>
                                        )}
                                        {isAppealed && (
                            <span className="px-2 py-1 bg-amber-100 rounded-md text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                                <ShieldAlert size={12} /> Appeal Mode
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm">
                        Audit for <span className="font-bold text-keeta-primary">{vendors.find(v => v.id === currentVendorId)?.name}</span> • {currentPeriod}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {hasSectionTag && (
                        <button
                            onClick={handleToggleCategoryNA}
                            className={clsx(
                                "flex items-center gap-2 text-sm py-2 px-4 rounded-xl font-bold border transition-all duration-200",
                                isCategoryMarkedNA
                                    ? "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300"
                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                            )}
                            title="Mark this pillar as Not Applicable for this period. Its weight will be redistributed to other pillars in the same section."
                        >
                            <Ban size={16} />
                            {isCategoryMarkedNA ? 'Remove N/A' : 'Mark as N/A'}
                        </button>
                    )}
                    <button
                        onClick={handleSaveDraft}
                        className="btn-secondary flex items-center gap-2 text-sm py-2 px-4 shadow-sm hover:shadow"
                        title="Save Draft & Exit"
                    >
                        <Save size={16} />
                        <span>Save Draft & Exit</span>
                    </button>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <button
                        onClick={handleResetAudit}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Reset Audit"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-100 p-1">
                        <button
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo size={16} />
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={historyIndex >= history.length - 1}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo size={16} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        {isSaving ? (
                            <>
                                <Loader2 size={14} className="text-slate-400 animate-spin" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saving...</span>
                            </>
                        ) : lastSaved ? (
                            <>
                                <Check size={14} className="text-green-500" />
                                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Saved</span>
                            </>
                        ) : (
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ready</span>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Category Score</div>
                        <div className={clsx(
                            "text-2xl font-black",
                            categoryScore.rag === 'na' ? "text-slate-400" :
                            categoryScore.rag === 'green' ? "text-green-500" :
                                categoryScore.rag === 'amber' ? "text-amber-500" : "text-red-500"
                        )}>
                            {categoryScore.rag === 'na' ? 'N/A' : `${categoryScore.score.toFixed(1)}%`}
                        </div>
                    </div>
                </div>
            </div>

            {/* N/A Banner */}
            {isCategoryMarkedNA && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-4 animate-in fade-in">
                    <div className="p-2 bg-slate-200 rounded-xl">
                        <Ban size={20} className="text-slate-500" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-700 mb-1">This pillar is marked as Not Applicable</p>
                        <p className="text-sm text-slate-500">
                            No data entry is required. The weight of this pillar ({category.weight}%) will be redistributed
                            evenly across the other applicable pillars in the same section.
                            Click <strong>Remove N/A</strong> in the header to re-enable data entry.
                        </p>
                    </div>
                </div>
            )}

            {/* KPIs */}
            <div className={clsx("space-y-4", isCategoryMarkedNA && "opacity-40 pointer-events-none select-none")}>
                {categoryKpis.map((kpi, index) => {
                    const entry = getAuditEntry(kpi.id);

                    // Calculate score with special handling for attrition rate
                    let score: number;
                    let percentage: number;

                    if (entry.isNA) {
                        percentage = 0;
                        score = -1; // N/A sentinel
                    } else if (entry.auditsDone === 0) {
                        percentage = 0;
                        score = 100;
                    } else {
                        percentage = (entry.auditsMet / entry.auditsDone) * 100;
                        score = calculateComplianceScore(percentage, kpi); // Pass full KPI object
                    }
                    const rag = score < 0 ? '#94a3b8' : getRagColor(score);

                    let isFailure = false;
                    if (kpi.scoringLogic === 'binary') {
                        isFailure = entry.auditsDone === 1 && entry.auditsMet === 0;
                    } else if (kpi.scoringLogic === 'inverse') {
                        if (entry.auditsDone > 0) {
                            const rate = (entry.auditsMet / entry.auditsDone) * 100;
                            isFailure = rate > 15;
                        }
                    } else {
                        isFailure = entry.auditsDone > 0 && entry.auditsMet < entry.auditsDone;
                    }

                    return (
                        <div key={kpi.id} className={clsx(
                            "bg-white rounded-2xl shadow-card border overflow-hidden transition-all hover:shadow-lg group",
                            isAppealed ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-100"
                        )}>
                            <div className="p-6">
                                <div className="flex items-start justify-between gap-6 mb-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                                                {kpi.id}
                                            </span>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {kpi.label}
                                                <span className="ml-2 text-sm font-normal text-slate-400">({kpi.weight}%)</span>
                                            </h3>
                                        </div>
                                        <p className="text-slate-500 text-sm leading-relaxed pl-11">{kpi.description}</p>
                                    </div>
                                    <div className="text-right min-w-[100px]">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score</div>
                                        <div className="text-3xl font-black transition-colors" style={{ color: rag }}>
                                            {score < 0 ? 'N/A' : score.toFixed(0)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4 pl-11">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Input Section */}
                                        <div className="space-y-4">
                                            {kpi.scoringLogic === 'binary' ? (
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleBinaryUpdate(kpi.id, true)}
                                                        className={clsx(
                                                            "flex-1 py-2 px-4 rounded-xl text-sm font-bold border transition-all duration-200",
                                                            entry.auditsMet === 1
                                                                ? "bg-green-500 text-white border-green-600 shadow-md shadow-green-500/20"
                                                                : "bg-white text-slate-600 border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                                                        )}
                                                    >
                                                        Pass
                                                    </button>
                                                    <button
                                                        onClick={() => handleBinaryUpdate(kpi.id, false)}
                                                        className={clsx(
                                                            "flex-1 py-2 px-4 rounded-xl text-sm font-bold border transition-all duration-200",
                                                            entry.auditsMet === 0 && entry.auditsDone === 1
                                                                ? "bg-red-500 text-white border-red-600 shadow-md shadow-red-500/20"
                                                                : "bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                        )}
                                                    >
                                                        Fail
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={entry.auditsDone || ''}
                                                            onChange={(e) => handleInputChange(kpi.id, 'auditsDone', parseInt(e.target.value) || 0)}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-keeta-primary/20 transition-all"
                                                            placeholder={kpi.labels?.done || 'Total'}
                                                        />
                                                    </div>
                                                    <div>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={entry.auditsMet || ''}
                                                            onChange={(e) => handleInputChange(kpi.id, 'auditsMet', parseInt(e.target.value) || 0)}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-keeta-primary/20 transition-all"
                                                            placeholder={kpi.labels?.met || 'Met'}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Result Preview */}
                                        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-200 pt-4 md:pt-0">
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                    {kpi.scoringLogic === 'inverse' ? 'Rate' : 'Compliance'}
                                                </div>
                                                <div className="font-bold text-slate-700">
                                                    {kpi.scoringLogic === 'binary' ? (
                                                        entry.auditsMet === 1 ? 'Pass' : 'Fail'
                                                    ) : (
                                                        entry.auditsDone > 0
                                                            ? `${((entry.auditsMet / entry.auditsDone) * 100).toFixed(1)}%`
                                                            : '-'
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comments */}
                                    <div className="mt-4 pt-4 border-t border-slate-200/50">
                                        <textarea
                                            value={entry.commentsForMissed || ''}
                                            onChange={(e) => {
                                                handleInputChange(kpi.id, 'commentsForMissed', e.target.value);
                                                // Auto-resize
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            placeholder={isFailure ? "Comments recommended for failures/misses..." : "Add comments or observations (optional)..."}
                                            className={clsx(
                                                "w-full px-3 py-2 bg-transparent border-none text-sm placeholder:text-slate-400 focus:ring-0 resize-none transition-colors overflow-hidden",
                                                isFailure && !entry.commentsForMissed?.trim() ? "bg-amber-50 rounded-lg placeholder:text-amber-500" : "text-slate-600"
                                            )}
                                            rows={1}
                                            style={{ minHeight: '38px' }}
                                        />
                                        {entry.commentsForMissed && entry.commentsForMissed.length > 0 && (
                                            <p className="text-[10px] text-slate-400 mt-1 px-3">{entry.commentsForMissed.length} characters</p>
                                        )}
                                    </div>

                                    {/* Attachments - NOW AVAILABLE FOR ALL ENTRIES */}
                                    <div className="mt-3 flex flex-col gap-2 px-3 pb-2">
                                        <div className="flex items-center gap-2">
                                            <label className={clsx(
                                                "cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors",
                                                uploadingKpiId === kpi.id && "opacity-50 cursor-not-allowed"
                                            )}>
                                                {uploadingKpiId === kpi.id ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                                                {uploadingKpiId === kpi.id ? 'Uploading...' : 'Attach File'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                                    multiple
                                                    onChange={(e) => handleFileSelect(kpi.id, e)}
                                                />
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-medium">Max 500KB</span>
                                        </div>

                                        {entry.attachments && entry.attachments.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {entry.attachments.map((file, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-2 pr-1 py-1 rounded-md">
                                                        <FileText size={12} className="text-slate-400" />
                                                        <span className="text-xs font-medium text-slate-600 max-w-[150px] truncate" title={file.name}>
                                                            {file.name}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemoveAttachment(kpi.id, idx)}
                                                            className="p-0.5 hover:bg-red-100 hover:text-red-500 rounded text-slate-400 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Validation Error Banner */}
            {validationError && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-bold flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-1 bg-red-100 rounded-full">
                        <CheckCircle2 size={16} className="text-red-600 rotate-45" />
                    </div>
                    <div>
                        <p className="uppercase tracking-wider text-xs mb-1 opacity-70">Validation Error</p>
                        {validationError}
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-8">
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={20} /> Previous Category
                </button>

                {isLastCategory ? (
                    <button
                        onClick={handleFinish}
                        className="btn-primary flex items-center gap-2 px-8"
                    >
                        {isAppealed ? (
                            <>Submit Appeal <ShieldAlert size={20} /></>
                        ) : (
                            <>Finish & Complete Audit <CheckCircle2 size={20} /></>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="btn-primary flex items-center gap-2 px-8"
                    >
                        Next Category <ChevronRight size={20} />
                    </button>
                )}
            </div>


            <ConfirmationModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={confirmReset}
                title="Reset Audit"
                message="Are you sure you want to reset this audit? All data for this vendor and period will be lost. This action cannot be undone."
                confirmText="Reset Audit"
                variant="danger"
            />

            <ValidationSummaryModal
                isOpen={showValidationModal}
                onClose={() => setShowValidationModal(false)}
                onSaveDraft={handleSaveDraft}
                onFix={() => setShowValidationModal(false)}
                errors={validationErrors}
                warnings={validationWarnings}
            />
        </div >
    );
};
