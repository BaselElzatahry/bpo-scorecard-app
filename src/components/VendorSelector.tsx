import React from 'react';
import { useApp } from '../context/AppContext';
import clsx from 'clsx';
import { Building2, Users, Check } from 'lucide-react';

interface VendorSelectorProps {
    selectedVendorId?: string | null;
    selectedVendorIds?: string[];
    onSelect?: (vendorId: string | null) => void;
    onToggle?: (vendorId: string) => void;
    allowAll?: boolean;
    className?: string;
}

export const VendorSelector: React.FC<VendorSelectorProps> = ({
    selectedVendorId,
    selectedVendorIds,
    onSelect,
    onToggle,
    allowAll = true,
    className
}) => {
    const { vendors } = useApp();
    const isMulti = !!selectedVendorIds;

    const isSelected = (id: string) => {
        if (isMulti) {
            return selectedVendorIds?.includes(id);
        }
        return selectedVendorId === id;
    };

    const handleAllClick = () => {
        if (isMulti) {
            // In multi-mode, "All" usually means clearing selection or selecting all.
            // Here we'll treat it as clearing specific selections (showing all)
            if (onSelect) onSelect(null); // Fallback if provided
            // Or we might need a specific handler for "clear all"
        } else {
            onSelect?.(null);
        }
    };

    return (
        <div className={clsx("flex flex-wrap items-center gap-2", className)}>
            {allowAll && !isMulti && (
                <button
                    onClick={handleAllClick}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border",
                        !selectedVendorId
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                >
                    <Users size={16} />
                    All Vendors
                </button>
            )}

            {isMulti && allowAll && (
                <button
                    onClick={() => onSelect?.(null)} // Special case for ReportsPage to clear all
                    className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border",
                        selectedVendorIds?.length === 0
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-105"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                >
                    <Users size={16} />
                    All Vendors
                </button>
            )}

            {vendors.map(vendor => {
                const active = isSelected(vendor.id);
                return (
                    <button
                        key={vendor.id}
                        onClick={() => isMulti ? onToggle?.(vendor.id) : onSelect?.(vendor.id)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border",
                            active
                                ? "bg-keeta-primary text-slate-900 border-keeta-primary shadow-lg scale-105"
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                    >
                        {vendor.logo ? (
                            <img src={vendor.logo} alt={vendor.name} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                            <Building2 size={16} />
                        )}
                        {vendor.name}
                        {active && isMulti && <Check size={14} />}
                    </button>
                );
            })}
        </div>
    );
};
