import React, { useState } from 'react';
import ProjectDropdown from './ProjectDropdown';
import { MODEL_OPTIONS } from '../constants/uiData';

export default function CenterWorkspace({ currentProject, onSelectProject }) {
    const [promptText, setPromptText] = useState('');
    const [selectedTab, setSelectedTab] = useState('work');
    const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash-lite');
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

    const handleChatTabClick = () => {
        try {
            console.log("Chat tab clicked: opening suniyintellekt.uz in default browser");
            const targetUrl = 'https://suniyintellekt.uz';
            if (window.pywebview && window.pywebview.api && window.pywebview.api.open_external) {
                window.pywebview.api.open_external(targetUrl);
            } else {
                window.open(targetUrl, '_blank');
            }
        } catch (error) {
            console.error("Failed to open external browser:", error);
            window.open('https://suniyintellekt.uz', '_blank');
        }
    };

    const handleWorkTabClick = () => {
        try {
            console.log("Work tab active");
            setSelectedTab('work');
        } catch (error) {
            console.error("Error setting work tab:", error);
        }
    };

    const handleFormSubmit = (e) => {
        try {
            e.preventDefault();
            console.log("Prompt submitted in project", currentProject, ":", promptText);
        } catch (error) {
            console.error("Error submitting prompt:", error);
        }
    };

    const currentModelLabel = MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label || 'Gemini 3.5 Flash Lite';

    return (
        <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 py-8 overflow-y-auto select-none custom-scrollbar bg-[#131314]">
            <div className="w-full max-w-3xl flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#1c1c1f] border border-[#2e2e32] flex items-center justify-center shadow-lg mb-4 p-2">
                    <img
                        src="/favicon-32x32.png"
                        alt="Emris AI"
                        className="w-7 h-7 object-contain"
                    />
                </div>

                <h2 className="text-xl font-bold text-[#ffffff] mb-2">
                    Nima yaratmoqchisiz yoki qanday vazifani hal qilmoqchisiz?
                </h2>
                <p className="text-xs text-[#94a3b8] max-w-lg mb-8 leading-relaxed">
                    Savollar bering, dasturiy loyihalar yarating, tahliliy maqolalar yozing yoki avtonom agentlardan foydalaning.
                </p>

                <div className="w-full text-left">
                    <ProjectDropdown
                        selectedProject={currentProject}
                        onSelectProject={onSelectProject}
                    />

                    <form
                        onSubmit={handleFormSubmit}
                        className="relative flex items-center bg-[#1c1c1f] border border-[#2e2e32] focus-within:border-[#2563eb] rounded-2xl p-2 shadow-2xl transition"
                    >
                        <button
                            type="button"
                            onClick={() => console.log("Context add button clicked")}
                            className="p-2 text-[#94a3b8] hover:text-[#ffffff] rounded-xl hover:bg-[#222226] transition flex-shrink-0 cursor-pointer mr-1.5"
                            title="Add files or context"
                        >
                            <i className="fa-solid fa-plus text-xs"></i>
                        </button>

                        <div className="flex items-center bg-[#1e1e22] rounded-xl p-0.5 border border-[#2e2e32] flex-shrink-0 mr-2 text-xs">
                            <button
                                type="button"
                                onClick={handleChatTabClick}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    selectedTab === 'chat'
                                        ? 'bg-[#2563eb] text-[#ffffff] font-medium shadow-sm'
                                        : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                                }`}
                                title="Opens suniyintellekt.uz in default browser"
                            >
                                <i className="fa-regular fa-comment-dots text-[#60a5fa] text-xs"></i>
                                <span>Chat</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleWorkTabClick}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                    selectedTab === 'work'
                                        ? 'bg-[#28282c] text-[#ffffff] font-medium shadow-sm border border-[#2e2e32]'
                                        : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                                }`}
                            >
                                <i className="fa-solid fa-briefcase text-[#f59e0b] text-xs"></i>
                                <span>Work</span>
                            </button>
                        </div>

                        <input
                            type="text"
                            value={promptText}
                            onChange={(e) => setPromptText(e.target.value)}
                            placeholder="Bugun sizga qanday yordam bera olaman?"
                            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[#f1f5f9] placeholder-[#64748b] px-2 py-2 focus:outline-none"
                        />

                        <div className="relative flex-shrink-0 ml-2">
                            <button
                                type="button"
                                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] text-[#f1f5f9] text-xs font-medium transition cursor-pointer"
                            >
                                <span className="truncate max-w-[140px]">{currentModelLabel}</span>
                                <i className="fa-solid fa-chevron-down text-[8px] text-[#94a3b8]"></i>
                            </button>

                            {isModelMenuOpen && (
                                <div className="absolute right-0 bottom-full mb-2 w-52 bg-[#1c1c1f] border border-[#2e2e32] rounded-xl shadow-2xl py-1 z-50 text-xs">
                                    {MODEL_OPTIONS.map((m) => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() => {
                                                setSelectedModel(m.value);
                                                setIsModelMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 hover:bg-[#222226] transition ${
                                                selectedModel === m.value ? 'text-[#60a5fa] font-medium' : 'text-[#cbd5e1]'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>

                    <div className="text-[10px] text-center text-[#64748b] mt-3 leading-relaxed">
                        Saytdan foydalanish orqali siz{' '}
                        <a href="https://suniyintellekt.uz" target="_blank" rel="noreferrer" className="text-[#94a3b8] hover:underline">
                            Foydalanish shartlari
                        </a>{' '}
                        va{' '}
                        <a href="https://suniyintellekt.uz" target="_blank" rel="noreferrer" className="text-[#94a3b8] hover:underline">
                            Maxfiylik siyosatiga
                        </a>{' '}
                        rozilik bildirasiz. • Sayt asoschisi:{' '}
                        <a
                            href="https://rahmatilla.uz"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#60a5fa] hover:underline"
                        >
                            Rahmatilla.uz
                        </a>{' '}
                        (
                        <a
                            href="https://t.me/rahmatilla_uz"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#60a5fa] hover:underline"
                        >
                            @rahmatilla_uz
                        </a>
                        ). Modellar xato qilishi mumkin. • © 2026
                    </div>
                </div>
            </div>
        </div>
    );
}
