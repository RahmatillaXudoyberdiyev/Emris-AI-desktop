import React from 'react';

export default function Header() {
    const handleHeaderAction = (action) => {
        try {
            console.log("Header action triggered:", action);
        } catch (error) {
            console.error("Header action error:", error);
        }
    };

    return (
        <header className="h-14 border-b border-[#26262a] bg-[#151515]/90 backdrop-blur px-5 flex items-center justify-between flex-shrink-0 z-20 select-none">
            <div className="flex items-center gap-3">
                <button
                    id="choose-workspace-btn"
                    type="button"
                    onClick={() => handleHeaderAction('choose_workspace')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] transition cursor-pointer"
                    title="Choose workspace folder"
                >
                    <i className="fa-solid fa-folder text-amber-400 pointer-events-none"></i>
                    <span
                        id="workspace-folder-label"
                        className="font-medium text-slate-300 pointer-events-none"
                    >
                        sandbox_test
                    </span>
                </button>
                <span className="text-slate-600">/</span>
                <span
                    id="header-session-title"
                    className="text-xs font-medium text-slate-200 truncate max-w-sm"
                >
                    Yangi suhbat
                </span>
                <button
                    id="edit-session-title-btn"
                    type="button"
                    onClick={() => handleHeaderAction('rename_session')}
                    className="text-slate-500 hover:text-slate-300 text-xs p-1 cursor-pointer"
                    title="Rename Session"
                >
                    <i className="fa-solid fa-pen text-[10px]"></i>
                </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="relative" id="custom-lang-dropdown">
                    <button
                        id="lang-menu-btn"
                        type="button"
                        onClick={() => handleHeaderAction('language_menu')}
                        className="flex items-center gap-1.5 bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 transition cursor-pointer"
                        title="Til / Language"
                    >
                        <span id="current-lang-flag" className="flex items-center">
                            <svg
                                className="w-4 h-3 rounded-xs flex-shrink-0"
                                viewBox="0 0 1000 500"
                            >
                                <defs>
                                    <g id="uz_flag_header">
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
                                <use href="#uz_flag_header" x="272" y="32" />
                                <use href="#uz_flag_header" x="320" y="32" />
                                <use href="#uz_flag_header" x="368" y="32" />
                                <use href="#uz_flag_header" x="224" y="80" />
                                <use href="#uz_flag_header" x="272" y="80" />
                                <use href="#uz_flag_header" x="320" y="80" />
                                <use href="#uz_flag_header" x="368" y="80" />
                                <use href="#uz_flag_header" x="176" y="128" />
                                <use href="#uz_flag_header" x="224" y="128" />
                                <use href="#uz_flag_header" x="272" y="128" />
                                <use href="#uz_flag_header" x="320" y="128" />
                                <use href="#uz_flag_header" x="368" y="128" />
                            </svg>
                        </span>
                        <i className="fa-solid fa-chevron-down text-[8px] text-slate-400"></i>
                    </button>
                </div>

                <button
                    id="api-keys-btn"
                    type="button"
                    onClick={() => handleHeaderAction('api_keys')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] text-slate-300 hover:text-white text-xs transition cursor-pointer"
                    title="Custom API Keys"
                >
                    <i className="fa-solid fa-key text-amber-400 text-xs"></i>
                    <span>API Kalitlar</span>
                </button>
            </div>
        </header>
    );
}
