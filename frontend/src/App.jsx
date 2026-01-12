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
        const lastUsed = localStorage.getItem('astra_last_session_id');
        if (lastUsed) return lastUsed;

        const newId = `sess_${userId}_${Date.now()}`;
        localStorage.setItem('astra_last_session_id', newId);
        return newId;
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
                localStorage.setItem('astra_session_id', response.sessionId);
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

    // Add this useEffect to load messages when sessionId changes / on mount
    useEffect(() => {
        async function loadConversation() {
            if (!sessionId) return;

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/conversation/${sessionId}`
                );
                const data = await response.json();

                if (data.success && data.messages?.length > 0) {
                    // Convert backend format to frontend format
                    const loadedMessages = data.messages.map(msg => ({
                        id: crypto.randomUUID(),
                        text: msg.text,
                        sender: msg.role === 'user' ? 'user' : 'bot',
                        timestamp: new Date(msg.timestamp || Date.now()),
                        emotion: msg.emotion || 'neutral'
                    }));

                    // Add welcome message only if conversation is empty
                    if (loadedMessages.length === 0) {
                        setMessages([
                            {
                                id: crypto.randomUUID(),
                                text: "Hello! I'm Astra, your thoughtful companion. How can I help you today?",
                                sender: 'bot',
                                timestamp: new Date(),
                                emotion: 'neutral'
                            }
                        ]);
                    } else {
                        setMessages(loadedMessages);
                    }
                }
            } catch (err) {
                console.error("Couldn't load previous messages", err);
            }
        }

        loadConversation();
    }, [sessionId]);

    const renderPage = () => {
        if (currentPage === 'history') return <HistoryPage userId={userId} />;
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/60 text-slate-800">
            <nav className="sticky top-0 z-30 backdrop-blur-md bg-white/70 border-b border-slate-200/60 shadow-sm">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex h-16 items-center justify-between">
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                            Astra <span className="text-indigo-600">•</span>
                        </h1>

                        <div className="flex space-x-2">
                            {['chat', 'history', 'persona'].map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
  ${currentPage === page
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}

                                >
                                    {page.charAt(0).toUpperCase() + page.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 py-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-indigo-100/50 border border-slate-200/60"
                    >

                        {renderPage()}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

export default App;
