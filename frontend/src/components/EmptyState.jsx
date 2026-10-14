import React from 'react';
import { PRESET_CARDS } from '../constants/uiData';

export default function EmptyState({ onPresetSelect }) {
    const handlePresetClick = (preset) => {
        try {
            console.log("Preset card clicked:", preset.id);
            if (onPresetSelect) {
                onPresetSelect(preset);
            }
        } catch (error) {
            console.error("Error selecting preset:", error);
        }
    };

    return (
        <div id="empty-state" className="max-w-2xl mx-auto text-center pt-16 pb-10 select-none">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1c1c1f] border border-[#2e2e32] flex items-center justify-center shadow-lg mb-4 select-none overflow-hidden p-2.5">
                <img
                    src="/favicon-32x32.png"
                    alt="Emris AI"
                    className="w-8 h-8 object-contain"
                />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
                Nima yaratmoqchisiz yoki qanday vazifani hal qilmoqchisiz?
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                Savollar bering, loyihalar yarating, insholar yozing yoki avtonom ikki bosqichli tahlildan foydalaning.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
                {PRESET_CARDS.map((card) => (
                    <button
                        key={card.id}
                        type="button"
                        onClick={() => handlePresetClick(card)}
                        className="preset-card p-3.5 rounded-xl bg-[#1c1c1f] hover:bg-[#242428] border border-[#26262a] hover:border-blue-500/40 text-left transition group cursor-pointer"
                    >
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 flex items-center gap-2 mb-1">
                            <i className={card.icon}></i>
                            <span>{card.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">
                            {card.description}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
