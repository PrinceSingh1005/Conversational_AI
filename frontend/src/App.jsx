import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatWindow from './components/ChatWindow';
import HistoryPage from './pages/HistoryPage';
import PersonaPage from './pages/PersonaPage';
import apiService from './services/api';

const App = () => {
    const [currentPage, setCurrentPage] = useState('chat');
    const [messages, setMessages] = useState([
        {
            id: crypto.randomUUID(),
            text: "Hello! I'm Astra, your thoughtful companion. How can I help you today?",
            sender: 'bot',
            timestamp: new Date(),
            emotion: 'neutral'
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const [userId] = useState(() => {
        const stored = localStorage.getItem('astra_user_id');
        if (stored) return stored;

        const id = `user_${crypto.randomUUID()}`;
        localStorage.setItem('astra_user_id', id);
        return id;
    });

    const [sessionId, setSessionId] = useState(() => {
        const stored = sessionStorage.getItem('astra_session_id');
        if (stored) return stored;

        const id = `session_${crypto.randomUUID()}`;
        sessionStorage.setItem('astra_session_id', id);
        return id;
    });

    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSendMessage = useCallback(async () => {
        if (!inputText.trim() || isTyping) return;

        const userMessage = {
            id: crypto.randomUUID(),
            text: inputText,
            sender: 'user',
            timestamp: new Date(),
            emotion: 'neutral'
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsTyping(true);

        try {
            const response = await apiService.sendMessage(
                userId,
                userMessage.text,
                sessionId
            );

            if (response?.sessionId && response.sessionId !== sessionId) {
                setSessionId(response.sessionId);
                sessionStorage.setItem('astra_session_id', response.sessionId);
            }

            if (!response?.success) {
                throw new Error(response?.error || 'Unknown API error');
            }

            const botMessage = {
                id: crypto.randomUUID(),
                text: response.response.text,
                sender: 'bot',
                timestamp: new Date(),
                emotion: response.response.emotionalContext ?? 'neutral',
                memory: response.memory ?? null
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    text: `Connection issue: ${err.message}`,
                    sender: 'bot',
                    timestamp: new Date(),
                    emotion: 'neutral'
                }
            ]);
        } finally {
            setIsTyping(false);
        }
    }, [inputText, isTyping, userId, sessionId]);

    const renderPage = () => {
        if (currentPage === 'history') return <HistoryPage />;
        if (currentPage === 'persona') return <PersonaPage />;

        return (
            <ChatWindow
                messages={messages}
                inputText={inputText}
                setInputText={setInputText}
                isTyping={isTyping}
                onSendMessage={handleSendMessage}
                messagesEndRef={messagesEndRef}
            />
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
            <nav className="bg-white border-b shadow-sm">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex h-16 items-center justify-between">
                        <h1 className="text-xl font-bold text-gray-900">Astra</h1>

                        <div className="flex space-x-2">
                            {['chat', 'history', 'persona'].map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition
                                        ${currentPage === page
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {page.charAt(0).toUpperCase() + page.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.18 }}
                    >
                        {renderPage()}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

export default App;
