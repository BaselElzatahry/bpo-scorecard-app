/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            colors: {
                keeta: {
                    primary: '#FFD700', // Vibrant Yellow
                    secondary: '#1F2937', // Dark Slate
                    accent: '#F59E0B', // Amber
                    bg: '#F9FAFB', // Light Gray
                },
                rag: {
                    green: '#10B981', // Emerald 500
                    amber: '#F59E0B', // Amber 500
                    red: '#EF4444', // Red 500
                }
            },
            boxShadow: {
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
                'glow': '0 0 15px rgba(255, 215, 0, 0.3)',
            }
        },
    },
    plugins: [],
}
