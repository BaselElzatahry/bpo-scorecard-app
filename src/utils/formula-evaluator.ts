/**
 * Safe Formula Evaluator
 * 
 * Safely evaluates mathematical expressions for custom scoring formulas.
 * Uses a whitelist approach to prevent code injection.
 */

export interface FormulaContext {
    percentage: number;
    met: number;
    done: number;
    missed: number;
}

export interface EvaluationResult {
    success: boolean;
    value?: number;
    error?: string;
}

/**
 * Allowed mathematical operations and functions
 */
const ALLOWED_MATH_FUNCTIONS = [
    'abs', 'ceil', 'floor', 'round', 'max', 'min',
    'pow', 'sqrt', 'log', 'exp'
];

/**
 * Validate formula expression before evaluation
 */
export function validateFormula(expression: string): { isValid: boolean; error?: string } {
    if (!expression || expression.trim().length === 0) {
        return { isValid: false, error: 'Formula cannot be empty' };
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
        /eval\s*\(/i,
        /function\s*\(/i,
        /=\s*>/,  // Arrow functions
        /import\s+/i,
        /require\s*\(/i,
        /window\./i,
        /document\./i,
        /\.constructor/i,
        /__proto__/i,
        /prototype/i
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(expression)) {
            return { isValid: false, error: 'Formula contains forbidden keywords or patterns' };
        }
    }

    // Check for only allowed characters
    const allowedPattern = /^[0-9+\-*/%().,\s<>=!&|?:a-zA-Z]+$/;
    if (!allowedPattern.test(expression)) {
        return { isValid: false, error: 'Formula contains invalid characters' };
    }

    // Try to parse it
    try {
        // Test with dummy values
        const testResult = evaluateFormulaSafe(expression, {
            percentage: 75,
            met: 15,
            done: 20,
            missed: 5
        });

        if (!testResult.success) {
            return { isValid: false, error: testResult.error };
        }

        // Check if result is a valid number
        if (testResult.value === undefined || isNaN(testResult.value) || !isFinite(testResult.value)) {
            return { isValid: false, error: 'Formula must produce a valid number' };
        }

        return { isValid: true };
    } catch (error) {
        return { isValid: false, error: `Invalid formula: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

/**
 * Safely evaluate a formula expression
 */
export function evaluateFormulaSafe(
    expression: string,
    context: FormulaContext
): EvaluationResult {
    try {
        // First, validate the formula
        const validation = validateFormula(expression);
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }

        // Create a safe evaluation context
        const safeContext = {
            percentage: Number(context.percentage) || 0,
            met: Number(context.met) || 0,
            done: Number(context.done) || 0,
            missed: Number(context.missed) || 0,
            // Add safe Math functions
            Math: {
                abs: Math.abs,
                ceil: Math.ceil,
                floor: Math.floor,
                round: Math.round,
                max: Math.max,
                min: Math.min,
                pow: Math.pow,
                sqrt: Math.sqrt,
                log: Math.log,
                exp: Math.exp,
                PI: Math.PI,
                E: Math.E
            }
        };

        // Use Function constructor with strict mode for safer evaluation
        // This is safer than eval() because it doesn't have access to local scope
        const func = new Function(
            ...Object.keys(safeContext),
            `'use strict'; return (${expression});`
        );

        // Execute with our safe context
        const result = func(...Object.values(safeContext));

        // Validate result
        if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
            return { success: false, error: 'Formula did not produce a valid number' };
        }

        // Clamp result between 0 and 100
        const clampedResult = Math.max(0, Math.min(100, result));

        return { success: true, value: clampedResult };
    } catch (error) {
        return {
            success: false,
            error: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Evaluate formula and return the score directly (or 0 on error)
 */
export function evaluateFormula(
    expression: string,
    context: FormulaContext
): number {
    const result = evaluateFormulaSafe(expression, context);
    return result.success ? (result.value ?? 0) : 0;
}

/**
 * Test formula with multiple test cases
 */
export interface FormulaTestCase {
    percentage: number;
    met: number;
    done: number;
    missed: number;
    expectedScore?: number;
}

export interface FormulaTestResult {
    testCase: FormulaTestCase;
    actualScore: number;
    passed: boolean;
    error?: string;
}

export function testFormula(
    expression: string,
    testCases: FormulaTestCase[]
): FormulaTestResult[] {
    return testCases.map(testCase => {
        const result = evaluateFormulaSafe(expression, testCase);

        if (!result.success) {
            return {
                testCase,
                actualScore: 0,
                passed: false,
                error: result.error
            };
        }

        const actualScore = result.value ?? 0;
        const passed = testCase.expectedScore === undefined ||
            Math.abs(actualScore - testCase.expectedScore) < 0.01; // Allow tiny floating point differences

        return {
            testCase,
            actualScore,
            passed,
            error: result.error
        };
    });
}

/**
 * Get example formulas for inspiration
 */
export const EXAMPLE_FORMULAS = [
    {
        name: 'Linear (Direct Percentage)',
        formula: 'percentage',
        description: 'Score equals the percentage directly'
    },
    {
        name: 'Amplify Differences',
        formula: '(percentage - 50) * 2',
        description: 'Doubles the difference from 50%'
    },
    {
        name: 'Strict Threshold',
        formula: 'percentage >= 95 ? 100 : 30',
        description: '100 if >= 95%, otherwise 30'
    },
    {
        name: 'Bonus Points',
        formula: 'Math.min(100, percentage * 1.2)',
        description: 'Adds 20% bonus but caps at 100'
    },
    {
        name: 'Penalty for Low Scores',
        formula: 'percentage < 50 ? percentage * 0.5 : percentage',
        description: 'Halves scores below 50%'
    },
    {
        name: 'Exponential Growth',
        formula: 'Math.pow(percentage / 100, 2) * 100',
        description: 'Rewards higher percentages exponentially'
    },
    {
        name: 'Stepped Progression',
        formula: 'percentage >= 90 ? 100 : percentage >= 70 ? 80 : percentage >= 50 ? 60 : 30',
        description: 'Fixed tiers with thresholds'
    },
    {
        name: 'Weighted Average',
        formula: '(percentage * 0.7) + (done > 10 ? 30 : 0)',
        description: '70% from percentage + bonus for volume'
    }
];
