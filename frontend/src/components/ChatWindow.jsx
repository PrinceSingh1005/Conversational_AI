import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

const ChatWindow = ({
    messages,
    inputText,
    setInputText,
    isTyping,
    onSendMessage,
    messagesEndRef
}) => {
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
    };

    // Determine emotion-based accent color
    const getAccentColor = (emotion) => {
        switch (emotion) {
            case 'empathetic':
                return 'from-pink-100 to-purple-100 border-pink-200';
            case 'playful':
                return 'from-blue-100 to-cyan-100 border-blue-200';
            case 'neutral':
            default:
                return 'from-gray-100 to-indigo-100 border-gray-200';
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-150px)]">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <MessageBubble
                                message={message}
                                accentColor={getAccentColor(message.emotion)}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="flex justify-start mb-4">
                            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg rounded-bl-none bg-gradient-to-r from-gray-100 to-indigo-100 border border-gray-200">
                                <TypingIndicator />
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex space-x-3">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1 resize-none border-0 focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 min-h-[60px] max-h-32"
                        rows={1}
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onSendMessage}
                        disabled={!inputText.trim() || isTyping}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${inputText.trim() && !isTyping
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Send
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;