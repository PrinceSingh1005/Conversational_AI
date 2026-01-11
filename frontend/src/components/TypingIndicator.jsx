import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator = () => {
    return (
        <div className="flex items-center space-x-1">
            <motion.span
                className="w-2 h-2 bg-gray-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'loop', delay: 0 }}
            />
            <motion.span
                className="w-2 h-2 bg-gray-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'loop', delay: 0.2 }}
            />
            <motion.span
                className="w-2 h-2 bg-gray-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'loop', delay: 0.4 }}
            />
        </div>
    );
};

export default TypingIndicator;