import React, { useState } from 'react';
import { SKILL_ITEMS } from '../constants/uiData';

export default function ChatInputBar() {
    const [promptText, setPromptText] = useState('');
    const [activeSkills, setActiveSkills] = useState([]);

    const handleSkillToggle = (skillId) => {
        try {
            console.log("Toggled skill chip:", skillId);
            setActiveSkills((prev) =>
                prev.includes(skillId)
                    ? prev.filter((id) => id !== skillId)
                    : [...prev, skillId]
            );
        } catch (error) {
            console.error("Error toggling skill chip:", error);
        }
    };

    const handleInputChange = (e) => {
        try {
            setPromptText(e.target.value);
        } catch (error) {
            console.error("Error updating prompt input:", error);
        }
    };

    const handleFormSubmit = (e) => {
        try {
            e.preventDefault();
            console.log("Chat form submitted (UI preview mode):", promptText);
        } catch (error) {
            console.error("Error submitting chat form:", error);
        }
    };

    return (
        <div className="p-4 bg-gradient-to-t from-[#131314] via-[#131314]/90 to-transparent flex-shrink-0 z-20">
            <div className="max-w-3xl mx-auto">
                <div
                    id="skills-bar"
                    className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-xs select-none custom-scrollbar"
                >
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">
                        Ko'nikmalar:
                    </span>
                    {SKILL_ITEMS.map((skill) => {
                        const isActive = activeSkills.includes(skill.id);
                        return (
                            <button
                                key={skill.id}
                                type="button"
                                data-skill={skill.id}
                                onClick={() => handleSkillToggle(skill.id)}
                                className={`skill-chip px-2.5 py-1 rounded-lg bg-[#1e1e22] border border-[#2e2e32] ${
                                    skill.hoverClass
                                } text-slate-400 text-[11px] flex items-center gap-1.5 transition cursor-pointer ${
                                    isActive ? 'active' : ''
                                }`}
                            >
                                <i className={`${skill.icon} text-[10px]`}></i>
                                <span>{skill.label}</span>
                            </button>
                        );
                    })}
                </div>

                <form
                    id="chat-form"
                    onSubmit={handleFormSubmit}
                    className="relative flex items-center bg-[#1c1c1f] border border-[#28282c] focus-within:border-blue-500/80 rounded-2xl p-2 shadow-2xl transition"
                >
                    <button
                        type="button"
                        id="attach-image-btn"
                        title="Attach screenshot (or Ctrl+V)"
                        onClick={() => console.log("Attach image clicked (UI preview mode)")}
                        className="p-2 text-slate-400 hover:text-blue-400 rounded-xl hover:bg-[#26262a] transition flex-shrink-0 cursor-pointer mr-1"
                    >
                        <i className="fa-solid fa-image text-sm"></i>
                    </button>

                    <textarea
                        id="prompt-input"
                        rows="1"
                        value={promptText}
                        onChange={handleInputChange}
                        placeholder="Xabar yuboring (Skrinshot tashlash uchun Ctrl+V)..."
                        className="flex-1 bg-transparent border-0 text-sm text-slate-100 placeholder-slate-400 px-3 py-2.5 focus:outline-none resize-none max-h-40 custom-scrollbar leading-relaxed"
                    />

                    <div className="relative flex-shrink-0 mr-1" id="model-popover-container">
                        <button
                            type="button"
                            id="model-popover-btn"
                            onClick={() => console.log("Model selector clicked (UI preview mode)")}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#222226] hover:bg-[#28282c] border border-[#2e2e32] text-slate-200 text-xs font-medium transition cursor-pointer select-none"
                            title="Model"
                        >
                            <span id="model-popover-current" className="truncate max-w-[150px]">
                                Gemini 3.5 Flash Lite
                            </span>
                            <i className="fa-solid fa-chevron-down text-[9px] text-slate-400"></i>
                        </button>
                    </div>
                </form>

                <div
                    className="text-[10px] text-center text-slate-400 mt-2 select-none"
                    id="footer-disclaimer"
                >
                    Sayt asoschisi:{' '}
                    <a
                        href="https://rahmatilla.uz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                    >
                        Rahmatilla.uz
                    </a>{' '}
                    (
                    <a
                        href="https://t.me/rahmatilla_uz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                    >
                        @rahmatilla_uz
                    </a>
                    ). Modellar xato qilishi mumkin. • © 2026
                </div>
            </div>
        </div>
    );
}
