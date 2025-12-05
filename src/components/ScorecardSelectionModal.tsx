import React, { useState, useEffect } from 'react';
import { ScorecardConfig } from '../types';
import { scorecardConfigService } from '../services/scorecard-config.service';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (configId: string) => void;
    vendorId?: string;
    period?: string;
}

export const ScorecardSelectionModal: React.FC<Props> = ({ isOpen, onClose, onSelect, vendorId, period }) => {
    const { hasAuditForModel, getModelsForVendorPeriod } = useApp();
    const [configs, setConfigs] = useState<ScorecardConfig[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadConfigs();
        }
    }, [isOpen]);

    const loadConfigs = () => {
        try {
            const activeConfigs = scorecardConfigService.getActiveConfigs();
            setConfigs(activeConfigs);
            if (activeConfigs.length > 0) {
                setSelectedId(activeConfigs[0].id);
            }
        } catch (error) {
            console.error('Failed to load scorecard configs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get models already audited for this vendor + period
    const existingModels = vendorId && period ? getModelsForVendorPeriod(vendorId, period) : [];

    const getModelStatus = (configId: string): { exists: boolean; status?: 'draft' | 'finalized' | 'appealed' } => {
        if (!vendorId || !period) return { exists: false };

        const existing = existingModels.find(m => m.config.id === configId);
        return {
            exists: !!existing,
            status: existing?.status
        };
    };

    const handleConfirm = () => {
        if (selectedId) {
            onSelect(selectedId);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 600 }}>
                    Select Scorecard Configuration
                </h2>
                <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '14px' }}>
                    Choose which scorecard you want to use for this audit
                </p>

                {loading ? (
                    <p>Loading configurations...</p>
                ) : configs.length === 0 ? (
                    <div style={{
                        padding: '32px',
                        textAlign: 'center',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px dashed #e5e7eb'
                    }}>
                        <p style={{ margin: 0, color: '#6b7280' }}>
                            No scorecard configurations available. Please create one first.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        {configs.map(config => {
                            const modelStatus = getModelStatus(config.id);

                            return (
                                <div
                                    key={config.id}
                                    onClick={() => setSelectedId(config.id)}
                                    style={{
                                        padding: '16px',
                                        border: selectedId === config.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        backgroundColor: selectedId === config.id ? '#eff6ff' : 'white',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                        <input
                                            type="radio"
                                            checked={selectedId === config.id}
                                            onChange={() => setSelectedId(config.id)}
                                            style={{ marginRight: '12px' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 600, fontSize: '16px' }}>
                                                    {config.name}
                                                </span>
                                                {modelStatus.exists && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                                                        {modelStatus.status === 'finalized' && (
                                                            <>
                                                                <CheckCircle size={14} color="#10b981" />
                                                                <span style={{ color: '#10b981' }}>Finalized</span>
                                                            </>
                                                        )}
                                                        {modelStatus.status === 'draft' && (
                                                            <>
                                                                <Clock size={14} color="#f59e0b" />
                                                                <span style={{ color: '#f59e0b' }}>In Progress</span>
                                                            </>
                                                        )}
                                                        {modelStatus.status === 'appealed' && (
                                                            <>
                                                                <AlertCircle size={14} color="#ef4444" />
                                                                <span style={{ color: '#ef4444' }}>Appealed</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {config.description && (
                                                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                    {config.description}
                                                </div>
                                            )}
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#9ca3af',
                                                marginTop: '8px',
                                                display: 'flex',
                                                gap: '16px'
                                            }}>
                                                {config.department && (
                                                    <span>📁 {config.department}</span>
                                                )}
                                                <span>📊 {config.categories.length} Categories</span>
                                                <span>📈 {config.kpis.length} KPIs</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedId || configs.length === 0}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: selectedId ? '#3b82f6' : '#e5e7eb',
                            color: 'white',
                            cursor: selectedId ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        {existingModels.find(m => m.config.id === selectedId) ? 'Resume Audit' : 'Start Audit'}
                    </button>
                </div>
            </div>
        </div>
    );
};
