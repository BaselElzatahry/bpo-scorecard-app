import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, Check, X, Building2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { ColorPicker } from './shared/ColorPicker';
import { LogoUpload } from './shared/LogoUpload';
import { vendorService } from '../services/vendor.service';

export const VendorManagementPanel: React.FC = () => {
    const { vendors, addVendor, updateVendor, removeVendor } = useApp();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editColor, setEditColor] = useState('');
    const [editRegion, setEditRegion] = useState('');
    const [editLogo, setEditLogo] = useState<string | undefined>(undefined);

    const [isAdding, setIsAdding] = useState(false);
    const [newVendorName, setNewVendorName] = useState('');
    const [newVendorColor, setNewVendorColor] = useState('#FFD700');
    const [newVendorRegion, setNewVendorRegion] = useState('');
    const [newVendorLogo, setNewVendorLogo] = useState<string | undefined>(undefined);

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        vendorId: string;
        vendorName: string;
        auditCount: number;
    } | null>(null);

    // Show success message temporarily
    const showSuccess = useCallback((message: string) => {
        setSuccess(message);
        setTimeout(() => setSuccess(null), 3000);
    }, []);

    // Show error message temporarily
    const showError = useCallback((message: string) => {
        setError(message);
        setTimeout(() => setError(null), 5000);
    }, []);

    // Handle add new vendor
    const handleAddVendor = useCallback(() => {
        if (!newVendorName.trim()) {
            showError('Vendor name cannot be empty');
            return;
        }

        try {
            addVendor(newVendorName.trim(), {
                color: newVendorColor,
                region: newVendorRegion.trim() || undefined,
                logo: newVendorLogo
            });

            showSuccess(`Vendor "${newVendorName}" added successfully!`);

            // Reset form
            setNewVendorName('');
            setNewVendorColor('#FFD700');
            setNewVendorRegion('');
            setNewVendorLogo(undefined);
            setIsAdding(false);
        } catch (err: any) {
            showError(err.message || 'Failed to add vendor');
        }
    }, [newVendorName, newVendorColor, newVendorRegion, newVendorLogo, addVendor, showSuccess, showError]);

    // Start editing vendor
    const startEdit = useCallback((vendorId: string, currentName: string, currentColor?: string, currentRegion?: string, currentLogo?: string) => {
        setEditingId(vendorId);
        setEditValue(currentName);
        setEditColor(currentColor || '#FFD700');
        setEditRegion(currentRegion || '');
        setEditLogo(currentLogo);
    }, []);

    // Save vendor edit
    const saveEdit = useCallback(() => {
        if (!editValue.trim()) {
            showError('Vendor name cannot be empty');
            return;
        }

        try {
            updateVendor(editingId!, {
                name: editValue.trim(),
                color: editColor,
                region: editRegion.trim() || undefined,
                logo: editLogo
            });

            showSuccess('Vendor updated successfully!');
            setEditingId(null);
        } catch (err: any) {
            showError(err.message || 'Failed to update vendor');
        }
    }, [editingId, editValue, editColor, editRegion, editLogo, updateVendor, showSuccess, showError]);

    // Cancel editing
    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setEditValue('');
        setEditColor('');
        setEditRegion('');
        setEditLogo(undefined);
    }, []);

    // Initiate delete vendor
    const initiateDelete = useCallback((vendorId: string, vendorName: string) => {
        const auditCount = vendorService.getVendorAuditCount(vendorId);
        setDeleteConfirm({
            isOpen: true,
            vendorId,
            vendorName,
            auditCount
        });
    }, []);

    // Confirm delete vendor
    const confirmDelete = useCallback(() => {
        if (!deleteConfirm) return;

        try {
            removeVendor(deleteConfirm.vendorId);
            showSuccess(`Vendor "${deleteConfirm.vendorName}" removed successfully!`);
            setDeleteConfirm(null);
        } catch (err: any) {
            showError(err.message || 'Failed to remove vendor');
            setDeleteConfirm(null);
        }
    }, [deleteConfirm, removeVendor, showSuccess, showError]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Vendors ({vendors.length})</h3>
                    <p className="text-sm text-slate-500">Manage your vendor list with unique identifiers</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={clsx(
                        'px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all',
                        isAdding
                            ? 'bg-slate-100 text-slate-600 border-2 border-slate-200'
                            : 'bg-keeta-primary text-slate-900 hover:bg-amber-400 shadow-lg'
                    )}
                >
                    {isAdding ? <X size={18} /> : <Plus size={18} />}
                    {isAdding ? 'Cancel' : 'Add Vendor'}
                </button>
            </div>

            {/* Success Message */}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <Check size={18} />
                    {success}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Add New Vendor Form */}
            {isAdding && (
                <div className="bg-white rounded-2xl shadow-card border-2 border-keeta-primary p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <Building2 size={18} />
                        New Vendor
                    </h4>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                                Vendor Name *
                            </label>
                            <input
                                type="text"
                                className="input-field w-full"
                                placeholder="e.g., Acme Corporation"
                                value={newVendorName}
                                onChange={(e) => setNewVendorName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddVendor()}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                                Region (Optional)
                            </label>
                            <input
                                type="text"
                                className="input-field w-full"
                                placeholder="e.g., North America"
                                value={newVendorRegion}
                                onChange={(e) => setNewVendorRegion(e.target.value)}
                            />
                        </div>

                        <ColorPicker
                            value={newVendorColor}
                            onChange={setNewVendorColor}
                            label="Vendor Color"
                        />

                        <LogoUpload
                            currentLogo={newVendorLogo}
                            onLogoChange={setNewVendorLogo}
                            vendorName={newVendorName || 'New Vendor'}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddVendor}
                            className="px-4 py-2 bg-keeta-primary text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-lg flex items-center gap-2"
                        >
                            <Check size={18} />
                            Add Vendor
                        </button>
                    </div>
                </div>
            )}

            {/* Vendor List */}
            {vendors.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                    <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
                    <h4 className="text-lg font-bold text-slate-400 mb-2">No Vendors Yet</h4>
                    <p className="text-slate-400 mb-4">Get started by adding your first vendor</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-keeta-primary text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-lg"
                    >
                        Add Your First Vendor
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendors.map((vendor) => {
                        const isEditing = editingId === vendor.id;
                        const auditCount = vendorService.getVendorAuditCount(vendor.id);

                        return (
                            <div
                                key={vendor.id}
                                className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow group"
                            >
                                {/* Color Bar */}
                                <div
                                    className="h-2"
                                    style={{ backgroundColor: vendor.color || '#FFD700' }}
                                />

                                {/* Content */}
                                <div className="p-4">
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                className="input-field w-full text-sm font-bold"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                                autoFocus
                                            />
                                            <input
                                                type="text"
                                                className="input-field w-full text-xs"
                                                placeholder="Region (optional)"
                                                value={editRegion}
                                                onChange={(e) => setEditRegion(e.target.value)}
                                            />

                                            <ColorPicker
                                                value={editColor}
                                                onChange={setEditColor}
                                            />

                                            <LogoUpload
                                                currentLogo={editLogo}
                                                onLogoChange={setEditLogo}
                                                vendorName={editValue}
                                            />

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={saveEdit}
                                                    className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Check size={14} />
                                                    Save
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <X size={14} />
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3 flex-1">
                                                    {/* Vendor Logo */}
                                                    {vendor.logo ? (
                                                        <img
                                                            src={vendor.logo}
                                                            alt={vendor.name}
                                                            className="w-10 h-10 rounded-lg object-cover border-2 border-slate-200"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                                            <Building2 size={20} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-slate-900 mb-1 line-clamp-1">
                                                            {vendor.name}
                                                        </h4>
                                                        {vendor.region && (
                                                            <p className="text-xs text-slate-500">{vendor.region}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEdit(vendor.id, vendor.name, vendor.color, vendor.region, vendor.logo)}
                                                        className="p-1.5 text-slate-400 hover:text-keeta-primary hover:bg-slate-50 rounded transition-colors"
                                                        title="Edit vendor"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => initiateDelete(vendor.id, vendor.name)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete vendor"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-400 font-mono">{vendor.id}</span>
                                                {auditCount > 0 && (
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold">
                                                        {auditCount} audit{auditCount !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <ConfirmDialog
                    isOpen={deleteConfirm.isOpen}
                    title="Delete Vendor"
                    message={`Are you sure you want to delete "${deleteConfirm.vendorName}"?`}
                    confirmText="Delete Vendor"
                    cancelText="Cancel"
                    variant="danger"
                    additionalInfo={
                        deleteConfirm.auditCount > 0
                            ? `⚠️ This vendor has ${deleteConfirm.auditCount} audit${deleteConfirm.auditCount !== 1 ? 's' : ''}. The vendor will be hidden but historical data will be preserved.`
                            : undefined
                    }
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
        </div>
    );
};
