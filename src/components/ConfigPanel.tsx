import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Sliders } from 'lucide-react';
import clsx from 'clsx';
import { VendorManagementPanel } from './VendorManagementPanel';
import { ScorecardManagementPanel } from './ScorecardManagementPanel';
import { ScorecardEditorPanel } from './ScorecardEditorPanel';

export const ConfigPanel: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'vendors' | 'models'>('vendors');
    const [editingScorecardId, setEditingScorecardId] = useState<string | null>(null);

    // Update active tab based on URL query parameter
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'models' || tab === 'templates' || tab === 'pillars') {
            setActiveTab('models');
        } else {
            setActiveTab('vendors');
        }
    }, [searchParams]);

    const handleEditScorecard = (id: string) => {
        setEditingScorecardId(id);
    };

    const handleCancelEdit = () => {
        setEditingScorecardId(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-3xl shadow-card border border-slate-100 p-8">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Configuration</h1>
                    <p className="text-slate-500">Manage vendors and scorecard models</p>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
                    {/* Tab Navigation */}
                    <div className="flex gap-2 border-b-2 border-slate-100 px-8">
                        <button
                            onClick={() => {
                                setActiveTab('vendors');
                                setEditingScorecardId(null);
                            }}
                            className={clsx(
                                'px-6 py-3 font-bold flex items-center gap-2 transition-all relative',
                                activeTab === 'vendors'
                                    ? 'text-keeta-primary'
                                    : 'text-slate-400 hover:text-slate-600'
                            )}
                        >
                            <Building2 size={18} />
                            Vendors
                            {activeTab === 'vendors' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-keeta-primary" />
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('models');
                                setEditingScorecardId(null);
                            }}
                            className={clsx(
                                'px-6 py-3 font-bold flex items-center gap-2 transition-all relative',
                                activeTab === 'models'
                                    ? 'text-keeta-primary'
                                    : 'text-slate-400 hover:text-slate-600'
                            )}
                        >
                            <Sliders size={18} />
                            Scorecard Models
                            {activeTab === 'models' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-keeta-primary" />
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-8">
                        {/* Vendors Tab */}
                        {activeTab === 'vendors' && <VendorManagementPanel />}

                        {/* Scorecard Models Tab - List View */}
                        {activeTab === 'models' && !editingScorecardId && (
                            <ScorecardManagementPanel onEdit={handleEditScorecard} />
                        )}

                        {/* Scorecard Models Tab - Editor View */}
                        {activeTab === 'models' && editingScorecardId && (
                            <ScorecardEditorPanel
                                scorecardId={editingScorecardId}
                                onCancel={handleCancelEdit}
                                onSaved={handleCancelEdit}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
