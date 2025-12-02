import React, { useState, useEffect } from 'react';
import { Code, Play, AlertCircle, Check, Lightbulb } from 'lucide-react';
import clsx from 'clsx';
import { FormulaLogic, FORMULA_VARIABLES } from '../../types/config.types';
import { validateFormula, testFormula, EXAMPLE_FORMULAS } from '../../utils/formula-evaluator';

interface Props {
    formula?: FormulaLogic;
    onChange: (formula: FormulaLogic) => void;
    className?: string;
}

export const FormulaEditor: React.FC<Props> = ({ formula, onChange, className }) => {
    const [expression, setExpression] = useState(formula?.expression || 'percentage');
    const [description, setDescription] = useState(formula?.description || '');
    const [validationResult, setValidationResult] = useState<{ isValid: boolean; error?: string } | null>(null);
    const [showExamples, setShowExamples] = useState(false);

    // Validate on expression change (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (expression.trim()) {
                const result = validateFormula(expression);
                setValidationResult(result);

                if (result.isValid) {
                    onChange({
                        expression,
                        description,
                        variables: FORMULA_VARIABLES
                    });
                }
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [expression]);

    function loadExample(exampleFormula: string) {
        setExpression(exampleFormula);
        setShowExamples(false);
    }

    const isValid = validationResult?.isValid ?? false;

    return (
        <div className={clsx("space-y-4", className)}>
            {/* Header */}
            <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Formula Editor</h4>
                <p className="text-xs text-slate-500">
                    Write a custom mathematical formula using available variables
                </p>
            </div>

            {/* Available Variables */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs font-bold text-slate-700 mb-2">Available Variables:</div>
                <div className="grid grid-cols-2 gap-2">
                    {FORMULA_VARIABLES.map((variable) => (
                        <div key={variable.name} className="flex items-start gap-2">
                            <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono text-keeta-primary">
                                {variable.name}
                            </code>
                            <div>
                                <div className="text-xs text-slate-600">{variable.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Formula Input */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Formula Expression
                </label>
                <div className="relative">
                    <textarea
                        value={expression}
                        onChange={(e) => setExpression(e.target.value)}
                        placeholder="e.g., (percentage - 50) * 2"
                        className={clsx(
                            "w-full px-4 py-3 font-mono text-sm rounded-xl border-2 resize-none",
                            "focus:ring-2 focus:ring-keeta-primary/20 transition-all",
                            isValid ? "border-green-300 bg-green-50/30" :
                                validationResult && !isValid ? "border-red-300 bg-red-50/30" :
                                    "border-slate-200 bg-white"
                        )}
                        rows={3}
                    />
                    <div className="absolute top-3 right-3">
                        {validationResult && (
                            isValid ? (
                                <Check size={18} className="text-green-500" />
                            ) : (
                                <AlertCircle size={18} className="text-red-500" />
                            )
                        )}
                    </div>
                </div>

                {/* Validation Feedback */}
                {validationResult && !isValid && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-red-700">{validationResult.error}</div>
                        </div>
                    </div>
                )}

                {validationResult && isValid && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                            <Check size={14} className="text-green-500" />
                            <div className="text-xs font-bold text-green-700">✓ Formula is valid</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Description */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Description (Optional)
                </label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this formula does..."
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-keeta-primary/20 focus:border-keeta-primary"
                />
            </div>

            {/* Example Formulas */}
            <div>
                <button
                    onClick={() => setShowExamples(!showExamples)}
                    className="flex items-center gap-2 text-xs font-bold text-keeta-primary hover:text-amber-500 transition-colors"
                >
                    <Lightbulb size={14} />
                    {showExamples ? 'Hide' : 'Show'} Example Formulas
                </button>

                {showExamples && (
                    <div className="mt-3 space-y-2">
                        {EXAMPLE_FORMULAS.map((example, idx) => (
                            <div
                                key={idx}
                                className="bg-white border border-slate-200 rounded-lg p-3 hover:border-keeta-primary hover:shadow-sm transition-all cursor-pointer group"
                                onClick={() => loadExample(example.formula)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-900 mb-1">
                                            {example.name}
                                        </div>
                                        <code className="text-xs font-mono text-keeta-primary bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
                                            {example.formula}
                                        </code>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {example.description}
                                        </div>
                                    </div>
                                    <Play size={14} className="text-slate-400 group-hover:text-keeta-primary shrink-0 mt-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Math Functions Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="text-xs text-blue-700">
                    <strong>Supported Math Functions:</strong> abs, ceil, floor, round, max, min, pow, sqrt, log, exp
                    <br />
                    <strong>Operators:</strong> +, -, *, /, %, ()
                    <br />
                    <strong>Conditional:</strong> condition ? valueIfTrue : valueIfFalse
                </div>
            </div>
        </div>
    );
};
