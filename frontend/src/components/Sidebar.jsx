import React from 'react';

export default function Sidebar({ sessions, activeSessionId, onSelectSession }) {
    const handleSessionClick = (sessionId) => {
        try {
            console.log("Selected session in UI:", sessionId);
            if (onSelectSession) {
                onSelectSession(sessionId);
            }
        } catch (error) {
            console.error("Error selecting session:", error);
        }
    };

    const handleNewSessionClick = () => {
        try {
            console.log("New session button clicked (UI preview mode)");
        } catch (error) {
            console.error("Error handling new session click:", error);
        }
    };

    const handleFooterAction = (actionName) => {
        try {
            console.log("Sidebar footer action clicked:", actionName);
        } catch (error) {
            console.error("Error handling footer action:", error);
        }
    };

    return (
        <aside
            id="sidebar"
            className="w-64 h-full max-h-screen bg-[#151515] border-r border-[#26262a] flex flex-col flex-shrink-0 overflow-hidden z-30 select-none"
        >
            <div className="p-4 border-b border-[#26262a] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                        <img
                            src="/favicon-32x32.png"
                            alt="Emris AI"
                            className="w-8 h-8 rounded-lg object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                            <span>Emris AI</span>
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                v1.9 Beta
                            </span>
                        </h1>
                    </div>
                </div>
            </div>

            <div className="p-3">
                <button
                    id="new-chat-btn"
                    type="button"
                    onClick={handleNewSessionClick}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] text-slate-200 hover:text-white border border-[#2e2e32] transition flex items-center gap-2 text-xs font-medium shadow-sm cursor-pointer"
                >
                    <i className="fa-solid fa-plus text-blue-400"></i>
                    <span>Yangi suhbat</span>
                </button>
            </div>

            <div className="px-4 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-between">
                <span>Suhbatlar tarixi</span>
                <span id="session-count" className="text-[10px] text-slate-400">
                    123
                </span>
            </div>

            <div
                id="sessions-list"
                className="flex-1 min-h-0 overflow-y-auto px-2 space-y-1 custom-scrollbar"
            >
                {sessions.map((sess) => {
                    const isActive = sess.id === activeSessionId;
                    return (
                        <div
                            key={sess.id}
                            onClick={() => handleSessionClick(sess.id)}
                            className={`session-item group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs select-none ${
                                isActive
                                    ? 'bg-[#222226] border border-blue-500/50 text-white shadow-md'
                                    : 'hover:bg-[#1c1c1e] text-slate-400 hover:text-slate-200 border border-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 overflow-hidden flex-1 pointer-events-none">
                                <i
                                    className={`fa-regular fa-message text-[11px] ${
                                        isActive ? 'text-blue-400' : 'text-slate-500'
                                    } flex-shrink-0`}
                                ></i>
                                <div className="truncate max-w-[155px] font-medium">
                                    {sess.title}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0 relative z-10">
                                <button
                                    type="button"
                                    className="p-1 text-slate-500 hover:text-amber-400 rounded cursor-pointer transition"
                                    title="Pin session"
                                >
                                    <i className="fa-solid fa-thumbtack text-[10px]"></i>
                                </button>
                                <button
                                    type="button"
                                    className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer transition"
                                    title="Delete session"
                                >
                                    <i className="fa-regular fa-trash-can text-[10px]"></i>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-3 border-t border-[#26262a] bg-[#151515] flex flex-col gap-1 flex-shrink-0 text-xs">
                <button
                    id="sidebar-settings-btn"
                    type="button"
                    onClick={() => handleFooterAction('settings')}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-[#222226] hover:text-white text-slate-300 flex items-center gap-2.5 transition text-left cursor-pointer"
                >
                    <i className="fa-solid fa-gear text-slate-400 text-xs w-4 text-center"></i>
                    <span>Sozlamalar</span>
                </button>
                <button
                    id="sidebar-privacy-btn"
                    type="button"
                    onClick={() => handleFooterAction('privacy')}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-[#222226] hover:text-white text-slate-300 flex items-center gap-2.5 transition text-left cursor-pointer"
                >
                    <i className="fa-solid fa-shield-halved text-slate-400 text-xs w-4 text-center"></i>
                    <span>Maxfiylik siyosati</span>
                </button>
                <button
                    id="sidebar-terms-btn"
                    type="button"
                    onClick={() => handleFooterAction('terms')}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-[#222226] hover:text-white text-slate-300 flex items-center gap-2.5 transition text-left cursor-pointer"
                >
                    <i className="fa-solid fa-file-contract text-slate-400 text-xs w-4 text-center"></i>
                    <span>Foydalanish shartlari</span>
                </button>
            </div>
        </aside>
    );
}
