import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import EmptyState from './components/EmptyState';
import ChatInputBar from './components/ChatInputBar';
import { INITIAL_SESSIONS } from './constants/uiData';

export default function App() {
    const [sessions] = useState(INITIAL_SESSIONS);
    const [activeSessionId, setActiveSessionId] = useState('sess_4');

    useEffect(() => {
        try {
            console.log("Emris AI Desktop UI initialized successfully.");
        } catch (error) {
            console.error("App initialization error:", error);
        }
    }, []);

    const handleSelectSession = (sessionId) => {
        try {
            console.log("Switching active session to:", sessionId);
            setActiveSessionId(sessionId);
        } catch (error) {
            console.error("Failed to switch session:", error);
        }
    };

    const handlePresetSelect = (preset) => {
        try {
            console.log("Preset selected:", preset.title);
        } catch (error) {
            console.error("Failed to handle preset selection:", error);
        }
    };

    return (
        <div className="h-screen w-screen flex overflow-hidden bg-[#131314] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
            <Sidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={handleSelectSession}
            />
            <main className="flex-1 flex flex-col h-full bg-[#131314] relative overflow-hidden">
                <Header />
                <div
                    id="chat-container"
                    className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 custom-scrollbar"
                >
                    <EmptyState onPresetSelect={handlePresetSelect} />
                </div>
                <ChatInputBar />
            </main>
        </div>
    );
}
