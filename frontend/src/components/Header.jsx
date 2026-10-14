import React from 'react';

export default function Header({ currentProject }) {
    const handleHeaderAction = (action) => {
        try {
            console.log("Header action triggered:", action);
        } catch (error) {
            console.error("Header action error:", error);
        }
    };

    return (
        <header className="h-14 border-b border-[#222226] bg-[#141416]/95 backdrop-blur px-5 flex items-center justify-between flex-shrink-0 z-20 select-none">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <img
                        src="/favicon-32x32.png"
                        alt="Emris AI"
                        className="w-6 h-6 rounded-md object-contain"
                    />
                    <span className="font-bold text-sm tracking-tight text-white">
                        Emris AI Dekstop App
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        v1.1 Beta
                    </span>
                </div>

                <span className="text-slate-600">/</span>

                <button
                    type="button"
                    onClick={() => handleHeaderAction('select_workspace')}
                    className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1c1c1f] hover:bg-[#25252a] border border-[#2a2a2e] transition cursor-pointer"
                >
                    <i className="fa-solid fa-folder text-amber-400"></i>
                    <span className="font-medium">{currentProject || 'sandbox_test'}</span>
                </button>
            </div>

            <div className="flex items-center gap-2.5">
                <button
                    type="button"
                    onClick={() => handleHeaderAction('language')}
                    className="flex items-center gap-1.5 bg-[#1c1c1f] hover:bg-[#25252a] border border-[#2a2a2e] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 transition cursor-pointer"
                >
                    <svg className="w-4 h-3 rounded-xs flex-shrink-0" viewBox="0 0 1000 500">
                        <defs>
                            <g id="uz_flag_hdr">
                                <polygon
                                    points="0,-12 3.5,-3.7 11.4,-3.7 5,1 7.4,8.5 0,3.7 -7.4,8.5 -5,1 -11.4,-3.7 -3.5,-3.7"
                                    fill="#ffffff"
                                />
                            </g>
                        </defs>
                        <rect width="1000" height="500" fill="#1eb53a" />
                        <rect width="1000" height="340" fill="#ce1126" />
                        <rect width="1000" height="330" fill="#ffffff" />
                        <rect width="1000" height="170" fill="#ce1126" />
                        <rect width="1000" height="160" fill="#0099b5" />
                        <circle cx="140" cy="80" r="60" fill="#ffffff" />
                        <circle cx="160" cy="80" r="60" fill="#0099b5" />
                        <use href="#uz_flag_hdr" x="272" y="32" />
                        <use href="#uz_flag_hdr" x="320" y="32" />
                        <use href="#uz_flag_hdr" x="368" y="32" />
                        <use href="#uz_flag_hdr" x="224" y="80" />
                        <use href="#uz_flag_hdr" x="272" y="80" />
                        <use href="#uz_flag_hdr" x="320" y="80" />
                        <use href="#uz_flag_hdr" x="368" y="80" />
                        <use href="#uz_flag_hdr" x="176" y="128" />
                        <use href="#uz_flag_hdr" x="224" y="128" />
                        <use href="#uz_flag_hdr" x="272" y="128" />
                        <use href="#uz_flag_hdr" x="320" y="128" />
                        <use href="#uz_flag_hdr" x="368" y="128" />
                    </svg>
                    <i className="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>
                </button>

                <button
                    type="button"
                    onClick={() => handleHeaderAction('api_keys')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1c1c1f] hover:bg-[#25252a] border border-[#2a2a2e] text-slate-300 hover:text-white text-xs transition cursor-pointer"
                >
                    <i className="fa-solid fa-key text-amber-400 text-xs"></i>
                    <span>API Kalitlar</span>
                </button>
            </div>
        </header>
    );
}
