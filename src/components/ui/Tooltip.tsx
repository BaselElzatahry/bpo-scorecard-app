import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-64 p-3 text-xs text-white bg-slate-900 rounded-lg shadow-xl -left-1/2 translate-x-1/2 bottom-full mb-2 pointer-events-none"
                    >
                        {content}
                        <div className="absolute left-4 bottom-0 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
