import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlayCircle, Calendar, Building2, Layers } from 'lucide-react';
import { scorecardConfigService } from '../services/scorecard-config.service';
import { DuplicateAuditModal } from './DuplicateAuditModal';
import { useToast } from '../context/ToastContext';
import { Button } from './shared';

export const NewAuditPage: React.FC = () => {
    const { vendors, setVendorId, setPeriod, setConfigId, startAudit, audits, startedAudits, auditStatus, markAsEditing } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    // Get pre-filled values from navigation state OR URL params
    const searchParams = new URLSearchParams(location.search);
    const urlVendorId = searchParams.get('vendorId');
    const urlPeriod = searchParams.get('period');

    const preFilledVendor = (location.state as any)?.preFilledVendor || urlVendorId;
    const preFilledPeriod = (location.state as any)?.preFilledPeriod || urlPeriod;

    // Local state for selection before committing
    const [selectedVendor, setSelectedVendor] = useState(preFilledVendor || vendors[0]?.id || '');
    const [selectedPeriod, setSelectedPeriod] = useState(preFilledPeriod || new Date().toISOString().slice(0, 7));
    // Enforce active context
    const { activeScorecardId } = useApp();
    const [selectedConfigId] = useState<string>(activeScorecardId || '');

    // We can fetch data just for display
    const activeConfigName = React.useMemo(() => {
        const cfg = scorecardConfigService.getConfig(activeScorecardId);
        return cfg ? cfg.name : 'Default Configuration';
    }, [activeScorecardId]);
    const [isChecking, setIsChecking] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateDetails, setDuplicateDetails] = useState<any>(null);

    const checkAuditExists = () => {
        // Strict Check: Check for audit with EXACTLY this config ID
        if (selectedConfigId) {
            const compositeKey = `${selectedVendor}-${selectedPeriod}-${selectedConfigId}`;
            if ((audits[compositeKey] && audits[compositeKey].length > 0) || startedAudits[compositeKey]) {
                const vendor = vendors.find(v => v.id === selectedVendor);
                return {
                    exists: true,
                    vendorName: vendor?.name || 'Unknown',
                    period: selectedPeriod,
                    status: auditStatus[compositeKey] || 'draft',
                    entryCount: audits[compositeKey] ? audits[compositeKey].length : 0,
                    lastModified: new Date().toISOString()
                };
            }
        }

        // Fallback/Legacy Check: Only if using default config (no ID) or checking globally?
        // If user selects a specific config, we shouldn't care about OTHER configs for this period
        // UNLESS business rule says "Only 1 audit per period regardless of model"? 
        // User asked: "only a maximum of one unique report for each scorecard model per vendor per month"
        // So multiple models for same month IS allowed.

        // However, if we are using the "Default" (legacy) model (empty configId), we should check the legacy key.
        if (!selectedConfigId) {
            const legacyKey = `${selectedVendor}-${selectedPeriod}`;
            // We also need to skip this check if the legacy key actually maps to a specific config ID in auditConfigs
            // But auditConfigs is for "active" config preference.
            // Let's just check if data exists at this key.
            if ((audits[legacyKey] && audits[legacyKey].length > 0) || startedAudits[legacyKey]) {
                const vendor = vendors.find(v => v.id === selectedVendor);
                return {
                    exists: true,
                    vendorName: vendor?.name || 'Unknown',
                    period: selectedPeriod,
                    status: auditStatus[legacyKey] || 'draft',
                    entryCount: audits[legacyKey] ? audits[legacyKey].length : 0,
                    lastModified: new Date().toISOString()
                };
            }
        }

        return { exists: false };
    };

    const handleStart = async () => {
        if (!selectedVendor || !selectedPeriod) {
            showToast('Please select both vendor and period', 'error');
            return;
        }

        setIsChecking(true);

        try {
            // Check for existing audit
            const result = checkAuditExists();

            if (result.exists) {
                setDuplicateDetails(result);
                setShowDuplicateModal(true);
                setIsChecking(false);
                return;
            }

            // No duplicate - proceed with new audit
            setVendorId(selectedVendor);
            setPeriod(selectedPeriod);

            // Ensure config is passed
            if (!selectedConfigId) {
                showToast('Please select a scorecard configuration', 'error');
                setIsChecking(false);
                return;
            }

            startAudit(selectedVendor, selectedPeriod, selectedConfigId);

            // Dynamic navigation based on selected config
            const config = scorecardConfigService.getConfig(selectedConfigId);
            const firstCategoryId = config?.categories[0]?.id || 'trainingDelivery';

            showToast('Starting new audit...', 'success');
            // Pass configId in navigation state so AuditPage can read it immediately
            // on first render, before the async context state update settles.
            navigate(`/audit/${firstCategoryId}`, {
                state: { configId: selectedConfigId }
            });
        } catch (error) {
            console.error('Error checking audit:', error);
            showToast('Error checking audit existence', 'error');
        } finally {
            setIsChecking(false);
        }
    };

    const handleEditExisting = () => {
        setVendorId(selectedVendor);
        setPeriod(selectedPeriod);
        if (selectedConfigId) {
            setConfigId(selectedConfigId);
        }
        markAsEditing(selectedVendor, selectedPeriod);
        setShowDuplicateModal(false);
        showToast('Opening existing audit for editing', 'info');

        // Find correct config for existing audit to navigate correctly
        const key = selectedConfigId
            ? `${selectedVendor}-${selectedPeriod}-${selectedConfigId}`
            : `${selectedVendor}-${selectedPeriod}`;

        const existingAudits = audits[key];
        let startCategory = 'trainingDelivery';

        // If specific config selected, use that
        if (selectedConfigId) {
            const config = scorecardConfigService.getConfig(selectedConfigId);
            if (config && config.categories.length > 0) {
                startCategory = config.categories[0].id;
            }
        } else if (existingAudits && existingAudits.length > 0) {
            // Fallback to inferring from audit data
            const savedConfigId = existingAudits[0].scorecardConfigId;
            if (savedConfigId) {
                const savedConfig = scorecardConfigService.getConfig(savedConfigId);
                if (savedConfig) startCategory = savedConfig.categories[0].id;
            }
        }
        navigate(`/audit/${startCategory}`);
    };

    return (
        <>
            <div className="max-w-2xl mx-auto animate-in fade-in pt-10">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-keeta-primary/20 text-keeta-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <PlayCircle size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900">Start New Audit</h2>
                    <p className="text-slate-500 mt-2">Select a vendor and time period to begin or continue an evaluation.</p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-card border border-slate-100 space-y-8">
                    <div className="space-y-4">
                        <label className="block text-sm font-bold uppercase text-slate-500 tracking-wider">Select Vendor</label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <select
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-900 focus:border-keeta-primary focus:ring-0 transition-all outline-none appearance-none"
                                value={selectedVendor}
                                onChange={e => setSelectedVendor(e.target.value)}
                                disabled={isChecking}
                            >
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-bold uppercase text-slate-500 tracking-wider">Select Period</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <select
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-900 focus:border-keeta-primary focus:ring-0 transition-all outline-none appearance-none"
                                value={selectedPeriod}
                                onChange={e => setSelectedPeriod(e.target.value)}
                                disabled={isChecking}
                            >
                                {Array.from({ length: 24 }).map((_, i) => {
                                    const d = new Date();
                                    d.setMonth(d.getMonth() - i + 1); // Include next month
                                    const val = d.toISOString().slice(0, 7);
                                    return (
                                        <option key={val} value={val}>
                                            {d.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-bold uppercase text-slate-500 tracking-wider">Select Scorecard Model</label>
                        <div className="relative">
                            <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <div className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-slate-100 rounded-xl font-bold text-slate-500 cursor-not-allowed">
                                {activeConfigName}
                                <span className="ml-2 text-xs font-normal text-slate-400">(Determined by active context)</span>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleStart}
                        disabled={!selectedVendor || !selectedPeriod || !selectedConfigId}
                        variant="primary"
                        size="lg"
                        loading={isChecking}
                        rightIcon={!isChecking ? <PlayCircle size={24} /> : undefined}
                        fullWidth
                        className="shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        {isChecking ? 'Checking...' : 'Open Scorecard'}
                    </Button>
                </div>
            </div>

            {/* Duplicate Audit Modal */}
            <DuplicateAuditModal
                isOpen={showDuplicateModal}
                onClose={() => setShowDuplicateModal(false)}
                onEdit={handleEditExisting}
                details={duplicateDetails || {
                    vendorName: '',
                    period: '',
                    status: 'draft'
                }}
            />
        </>
    );
};
