import React, { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Check } from 'lucide-react';
import clsx from 'clsx';
import { ScoringBand, CustomBandsConfig } from '../../types/config.types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    config?: CustomBandsConfig;
    onChange: (config: CustomBandsConfig) => void;
    className?: string;
}

interface ValidationError {
    bandId: string;
    message: string;
}

export const CustomBandBuilder: React.FC<Props> = ({ config, onChange, className }) => {
    const [bands, setBands] = useState<ScoringBand[]>(config?.bands || getDefaultBands());
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

    // Default bands based on standard logic
    function getDefaultBands(): ScoringBand[] {
        return [
            { id: uuidv4(), minPercentage: 0, maxPercentage: 49, score: 30 },
            { id: uuidv4(), minPercentage: 50, maxPercentage: 69, score: 40 },
            { id: uuidv4(), minPercentage: 70, maxPercentage: 84, score: 60 },
            { id: uuidv4(), minPercentage: 85, maxPercentage: 94, score: 80 },
            { id: uuidv4(), minPercentage: 95, maxPercentage: 100, score: 100 }
        ];
    }

    // Validate bands
    function validateBands(bandsToValidate: ScoringBand[]): ValidationError[] {
        const errors: ValidationError[] = [];
        const sortedBands = [...bandsToValidate].sort((a, b) => a.minPercentage - b.minPercentage);

        // Check each band
        sortedBands.forEach((band, index) => {
            // Min >= Max check
            if (band.minPercentage > band.maxPercentage) {
                errors.push({
                    bandId: band.id,
                    message: 'Min % must be ≤ Max %'
                });
            }

            // Range check (0-100)
            if (band.minPercentage < 0 || band.minPercentage > 100) {
                errors.push({
                    bandId: band.id,
                    message: 'Min % must be between 0-100'
                });
            }
            if (band.maxPercentage < 0 || band.maxPercentage > 100) {
                errors.push({
                    bandId: band.id,
                    message: 'Max % must be between 0-100'
                });
            }

            // Score range check
            if (band.score < 0 || band.score > 100) {
                errors.push({
                    bandId: band.id,
                    message: 'Score must be between 0-100'
                });
            }

            // Check overlap with next band
            if (index < sortedBands.length - 1) {
                const nextBand = sortedBands[index + 1];
                if (band.maxPercentage >= nextBand.minPercentage) {
                    errors.push({
                        bandId: band.id,
                        message: 'Overlaps with next band'
                    });
                }
            }
        });

        // Check for full coverage (0-100%)
        if (sortedBands.length > 0) {
            const firstBand = sortedBands[0];
            const lastBand = sortedBands[sortedBands.length - 1];

            if (firstBand.minPercentage > 0) {
                errors.push({
                    bandId: firstBand.id,
                    message: 'Gaps detected: Must cover from 0%'
                });
            }

            if (lastBand.maxPercentage < 100) {
                errors.push({
                    bandId: lastBand.id,
                    message: 'Gaps detected: Must cover up to 100%'
                });
            }
        }

        return errors;
    }

    // Update bands and trigger onChange
    function updateBands(newBands: ScoringBand[]) {
        const sorted = [...newBands].sort((a, b) => a.minPercentage - b.minPercentage);
        setBands(sorted);

        const errors = validateBands(sorted);
        setValidationErrors(errors);

        onChange({
            bands: sorted,
            description: config?.description
        });
    }

    function addBand() {
        const newBand: ScoringBand = {
            id: uuidv4(),
            minPercentage: 0,
            maxPercentage: 100,
            score: 50
        };
        updateBands([...bands, newBand]);
    }

    function deleteBand(id: string) {
        updateBands(bands.filter(b => b.id !== id));
    }

    function updateBand(id: string, field: keyof ScoringBand, value: number) {
        updateBands(bands.map(b =>
            b.id === id ? { ...b, [field]: value } : b
        ));
    }

    const hasErrors = validationErrors.length > 0;

    return (
        <div className={clsx("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Custom Scoring Bands</h4>
                    <p className="text-xs text-slate-500">Define percentage ranges and their scores</p>
                </div>
                <button
                    onClick={addBand}
                    className="flex items-center gap-1 px-3 py-1.5 bg-keeta-primary hover:bg-yellow-300 text-slate-900 rounded-lg text-xs font-bold transition-colors"
                >
                    <Plus size={14} />
                    Add Band
                </button>
            </div>

            {/* Table */}
            <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Min %
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Max %
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Score
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-20">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {bands.map((band) => {
                            const bandErrors = validationErrors.filter(e => e.bandId === band.id);
                            const hasError = bandErrors.length > 0;

                            return (
                                <tr key={band.id} className={clsx(
                                    "hover:bg-slate-50 transition-colors",
                                    hasError && "bg-red-50"
                                )}>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={band.minPercentage}
                                            onChange={(e) => updateBand(band.id, 'minPercentage', Number(e.target.value))}
                                            className={clsx(
                                                "w-20 px-2 py-1 border rounded-lg text-sm font-bold text-center",
                                                "focus:ring-2 focus:ring-keeta-primary focus:border-transparent",
                                                hasError ? "border-red-300 bg-red-50" : "border-slate-200"
                                            )}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={band.maxPercentage}
                                            onChange={(e) => updateBand(band.id, 'maxPercentage', Number(e.target.value))}
                                            className={clsx(
                                                "w-20 px-2 py-1 border rounded-lg text-sm font-bold text-center",
                                                "focus:ring-2 focus:ring-keeta-primary focus:border-transparent",
                                                hasError ? "border-red-300 bg-red-50" : "border-slate-200"
                                            )}
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={band.score}
                                            onChange={(e) => updateBand(band.id, 'score', Number(e.target.value))}
                                            className={clsx(
                                                "w-20 px-2 py-1 border rounded-lg text-sm font-bold text-center",
                                                "focus:ring-2 focus:ring-keeta-primary focus:border-transparent",
                                                hasError ? "border-red-300 bg-red-50" : "border-slate-200"
                                            )}
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            onClick={() => deleteBand(band.id)}
                                            className="p-1.5 hover:bg-red-100 hover:text-red-500 rounded-lg transition-colors text-slate-400"
                                            title="Delete band"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Validation Messages */}
            {hasErrors ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <div className="text-xs font-bold text-red-900 mb-1">Validation Errors</div>
                            <ul className="text-xs text-red-700 space-y-0.5 list-disc list-inside">
                                {validationErrors.map((error, idx) => (
                                    <li key={idx}>{error.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-500" />
                        <div className="text-xs font-bold text-green-900">
                            ✓ Bands are valid and cover 0-100%
                        </div>
                    </div>
                </div>
            )}

            {/* Helper Text */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="text-xs text-blue-700">
                    <strong>Tips:</strong> Bands must cover the full 0-100% range without gaps or overlaps.
                    They will be automatically sorted by minPercentage.
                </div>
            </div>
        </div>
    );
};
