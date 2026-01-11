import React from 'react';
import { motion } from 'framer-motion';

const MessageBubble = ({ message, accentColor }) => {
    const isUser = message.sender === 'user';

    // Format timestamp
    const formatTime = (timestamp) => {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <motion.div
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
        >
            <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${isUser
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-none'
                        : `bg-gradient-to-r ${accentColor} rounded-bl-none text-gray-800`
                    }`}
            >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                    {formatTime(message.timestamp)}
                </div>
            </div>
        </motion.div>
    );
};

export default MessageBubble;