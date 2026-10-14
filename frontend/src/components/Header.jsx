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
        <header className="h-14 border-b border-[#26262a] bg-[#151515] px-5 flex items-center justify-between flex-shrink-0 z-20 select-none">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => handleHeaderAction('select_workspace')}
                    className="text-xs text-[#f1f5f9] hover:text-[#ffffff] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] transition-colors cursor-pointer"
                >
                    <i className="fa-solid fa-folder text-[#f59e0b]"></i>
                    <span className="font-medium">{currentProject || 'No Project'}</span>
                </button>

                <span className="text-[#64748b]">/</span>

                <span className="text-xs font-medium text-[#cbd5e1]">
                    New Session
                </span>

                <button
                    type="button"
                    onClick={() => handleHeaderAction('rename_session')}
                    className="text-[#64748b] hover:text-[#cbd5e1] text-xs p-1 cursor-pointer transition-colors"
                    title="Rename Session"
                >
                    <i className="fa-solid fa-pen text-[10px]"></i>
                </button>
            </div>

            <div className="flex items-center gap-2.5">
                <button
                    type="button"
                    onClick={() => handleHeaderAction('language')}
                    className="flex items-center gap-1.5 bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] rounded-lg px-2.5 py-1.5 text-xs text-[#f1f5f9] transition-colors cursor-pointer"
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
                    <i className="fa-solid fa-chevron-down text-[8px] text-[#94a3b8]"></i>
                </button>

                <button
                    type="button"
                    onClick={() => handleHeaderAction('api_keys')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] text-[#cbd5e1] hover:text-[#ffffff] text-xs transition-colors cursor-pointer"
                >
                    <i className="fa-solid fa-key text-[#f59e0b] text-xs"></i>
                    <span>API Kalitlar</span>
                </button>
            </div>
        </header>
    );
}
