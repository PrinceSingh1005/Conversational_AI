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
        <div className="flex flex-col h-[calc(100vh-180px)] rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-lg shadow-indigo-100/40">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-300/60 scrollbar-track-transparent">
                <AnimatePresence>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}

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
                            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl rounded-bl-sm bg-slate-100 border border-slate-200 shadow-sm">
                                <TypingIndicator />
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 bg-white/80 backdrop-blur px-5 py-4 rounded-b-2xl">
                <div className="flex space-x-3">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1 resize-none bg-transparent border-0 focus:ring-0 focus:outline-none text-slate-800 placeholder-slate-400 min-h-[56px] max-h-32 leading-relaxed"
                        rows={1}
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onSendMessage}
                        disabled={!inputText.trim() || isTyping}
                        className={`px-5 py-2.5 rounded-full font-medium transition-all duration-200
  ${inputText.trim() && !isTyping
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                : 'bg-indigo-300 text-white-400 cursor-not-allowed'
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