import React from 'react';
import clsx from 'clsx';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    label?: string;
}

// Beautiful color presets for vendor branding
const COLOR_PRESETS = [
    { name: 'Gold', value: '#FFD700' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Emerald', value: '#00E599' },
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Lime', value: '#84CC16' },
    { name: 'Rose', value: '#F43F5E' },
    { name: 'Violet', value: '#A855F7' },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
    const [showCustom, setShowCustom] = React.useState(false);
    const [customColor, setCustomColor] = React.useState(value);

    const handlePresetClick = (color: string) => {
        onChange(color);
        setShowCustom(false);
    };

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value;
        setCustomColor(color);
        onChange(color);
    };

    return (
        <div className="space-y-3">
            {label && (
                <label className="text-sm font-bold text-slate-700">{label}</label>
            )}

            {/* Color Presets Grid */}
            <div className="grid grid-cols-8 gap-2">
                {COLOR_PRESETS.map((preset) => (
                    <button
                        key={preset.value}
                        type="button"
                        onClick={() => handlePresetClick(preset.value)}
                        className={clsx(
                            "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 hover:shadow-lg",
                            value === preset.value
                                ? "border-slate-900 ring-2 ring-slate-200"
                                : "border-white hover:border-slate-300"
                        )}
                        style={{ backgroundColor: preset.value }}
                        title={preset.name}
                    />
                ))}
            </div>

            {/* Custom Color Option */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <button
                    type="button"
                    onClick={() => setShowCustom(!showCustom)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                >
                    {showCustom ? 'Hide' : 'Custom Color'}
                </button>

                {showCustom && (
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={customColor}
                            onChange={handleCustomColorChange}
                            className="w-10 h-10 rounded-lg border-2 border-slate-300 cursor-pointer"
                        />
                        <input
                            type="text"
                            value={customColor}
                            onChange={handleCustomColorChange}
                            placeholder="#FFD700"
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono w-28"
                        />
                    </div>
                )}

                {/* Current Color Preview */}
                {!showCustom && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-slate-500 font-medium">Selected:</span>
                        <div
                            className="w-8 h-8 rounded-lg border-2 border-slate-300"
                            style={{ backgroundColor: value }}
                        />
                        <span className="text-xs font-mono text-slate-600">{value}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
