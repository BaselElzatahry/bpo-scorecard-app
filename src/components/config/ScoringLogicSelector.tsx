import React from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { ScoringLogicType, SCORING_LOGIC_METADATA } from '../../types/config.types';

interface Props {
    value: ScoringLogicType;
    onChange: (logic: ScoringLogicType) => void;
    className?: string;
}

export const ScoringLogicSelector: React.FC<Props> = ({ value, onChange, className }) => {
    const currentLogic = SCORING_LOGIC_METADATA[value];

    return (
        <div className={className}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Scoring Logic
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as ScoringLogicType)}
                    className={clsx(
                        "w-full appearance-none px-4 py-2.5 pr-10",
                        "bg-white border-2 border-slate-200 rounded-xl",
                        "text-sm font-bold text-slate-900",
                        "hover:border-keeta-primary focus:border-keeta-primary focus:ring-2 focus:ring-keeta-primary/20",
                        "transition-all cursor-pointer"
                    )}
                >
                    {(Object.keys(SCORING_LOGIC_METADATA) as ScoringLogicType[]).map((logicType) => {
                        const metadata = SCORING_LOGIC_METADATA[logicType];
                        return (
                            <option key={logicType} value={logicType}>
                                {metadata.label}
                            </option>
                        );
                    })}
                </select>
                <ChevronDown
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
            </div>

            {/* Description */}
            <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5">
                {currentLogic.description}
            </div>

            {/* Configuration Required Badge */}
            {currentLogic.requiresConfig && (
                <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs font-bold text-amber-700">
                        ⚙️ Additional configuration required
                    </div>
                </div>
            )}
        </div>
    );
};
