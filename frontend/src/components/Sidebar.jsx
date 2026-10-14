import React, { useState } from 'react';
import { INITIAL_ALL_CHATS } from '../constants/uiData';

export default function Sidebar({ onSelectProject, onNewConversation, activeProjectName }) {
    const [allChats, setAllChats] = useState(INITIAL_ALL_CHATS);
    const [visibleCount, setVisibleCount] = useState(10);
    const [selectedChatId, setSelectedChatId] = useState('c3');

    const handleNewChat = () => {
        try {
            console.log("New conversation triggered: resetting project to No Project");
            const newChat = {
                id: "chat_" + Date.now(),
                title: "New Session",
                isPinned: false,
                project: "No Project",
                time: "just now",
                active: true
            };
            setAllChats((prev) => [newChat, ...prev]);
            setSelectedChatId(newChat.id);
            if (onNewConversation) {
                onNewConversation();
            }
        } catch (error) {
            console.error("Error creating new chat:", error);
        }
    };

    const handleChatClick = (chat) => {
        try {
            console.log("Selected chat:", chat.title, "in project:", chat.project);
            setSelectedChatId(chat.id);
            if (onSelectProject) {
                onSelectProject(chat.project || 'No Project');
            }
        } catch (error) {
            console.error("Error selecting chat:", error);
        }
    };

    const handleLoadMore = () => {
        try {
            console.log("Loading 10 more chats...");
            setVisibleCount((prev) => Math.min(prev + 10, allChats.length));
        } catch (error) {
            console.error("Error loading more chats:", error);
        }
    };

    const handleScroll = (e) => {
        try {
            const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
            if (scrollTop + clientHeight >= scrollHeight - 30) {
                if (visibleCount < allChats.length) {
                    handleLoadMore();
                }
            }
        } catch (error) {
            console.error("Error handling scroll pagination:", error);
        }
    };

    const handleActionClick = (actionName) => {
        try {
            console.log("Sidebar control action clicked:", actionName);
        } catch (error) {
            console.error("Error executing action:", error);
        }
    };

    const displayedChats = allChats.slice(0, visibleCount);
    const hasMore = visibleCount < allChats.length;

    return (
        <aside
            id="sidebar"
            className="w-64 h-full max-h-screen bg-[#151515] border-r border-[#26262a] flex flex-col flex-shrink-0 overflow-hidden z-30 select-none text-[#cbd5e1]"
        >
            <div className="p-3 border-b border-[#26262a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img
                        src="/favicon-32x32.png"
                        alt="Emris AI"
                        className="w-7 h-7 rounded-lg object-contain shadow-sm"
                    />
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm tracking-tight text-[#ffffff]">
                            Emris AI
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#2563eb]/20 text-[#60a5fa] border border-[#2563eb]/30">
                            v1.1 Beta
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 text-[#94a3b8] text-xs">
                    <button
                        type="button"
                        onClick={() => handleActionClick('toggle_sidebar')}
                        className="p-1 hover:text-[#ffffff] transition rounded hover:bg-[#222226] cursor-pointer"
                        title="Toggle Sidebar"
                    >
                        <i className="fa-solid fa-table-columns text-xs"></i>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleActionClick('history_back')}
                        className="p-1 hover:text-[#ffffff] transition rounded hover:bg-[#222226] cursor-pointer"
                        title="Back"
                    >
                        <i className="fa-solid fa-arrow-left text-xs"></i>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleActionClick('history_forward')}
                        className="p-1 hover:text-[#ffffff] transition rounded hover:bg-[#222226] cursor-pointer"
                        title="Forward"
                    >
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleActionClick('search')}
                        className="p-1 hover:text-[#ffffff] transition rounded hover:bg-[#222226] cursor-pointer"
                        title="Search"
                    >
                        <i className="fa-solid fa-magnifying-glass text-xs"></i>
                    </button>
                </div>
            </div>

            <div className="p-3 pb-2">
                <button
                    type="button"
                    onClick={handleNewChat}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] text-[#f1f5f9] hover:text-[#ffffff] border border-[#2e2e32] transition flex items-center gap-2 text-xs font-medium cursor-pointer shadow-sm"
                >
                    <i className="fa-solid fa-plus text-[#60a5fa] text-xs"></i>
                    <span>New Conversation</span>
                </button>
            </div>

            <div className="px-2 py-1 space-y-0.5 text-xs">
                <button
                    type="button"
                    onClick={() => handleActionClick('conversation_history')}
                    className="w-full px-2.5 py-1.5 rounded-lg text-[#cbd5e1] hover:text-[#ffffff] hover:bg-[#222226] transition flex items-center gap-2.5 text-left cursor-pointer"
                >
                    <i className="fa-regular fa-clock text-[#94a3b8] text-xs w-4 text-center"></i>
                    <span>Conversation History</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleActionClick('automations')}
                    className="w-full px-2.5 py-1.5 rounded-lg text-[#cbd5e1] hover:text-[#ffffff] hover:bg-[#222226] transition flex items-center gap-2.5 text-left cursor-pointer"
                >
                    <i className="fa-regular fa-hourglass-half text-[#94a3b8] text-xs w-4 text-center"></i>
                    <span>Automations</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleActionClick('customizations')}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#222226] text-[#ffffff] transition flex items-center gap-2.5 text-left cursor-pointer"
                >
                    <i className="fa-solid fa-sliders text-[#cbd5e1] text-xs w-4 text-center"></i>
                    <span>Customizations</span>
                </button>
            </div>

            <div className="px-4 pt-3 pb-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#94a3b8] uppercase">
                <span>Suhbatlar tarixi</span>
                <span className="text-[10px] text-[#64748b]">{allChats.length}</span>
            </div>

            <div
                id="sessions-list"
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto px-2 space-y-1 py-1 custom-scrollbar text-xs"
            >
                {displayedChats.map((chat) => {
                    const isSelected = selectedChatId === chat.id;
                    return (
                        <div
                            key={chat.id}
                            onClick={() => handleChatClick(chat)}
                            className={`session-item group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs ${
                                isSelected
                                    ? 'bg-[#1e1e22] border border-[#2563eb]/60 text-[#ffffff] shadow-md'
                                    : 'hover:bg-[#222226] text-[#cbd5e1] hover:text-[#ffffff] border border-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 overflow-hidden flex-1 pointer-events-none">
                                <i
                                    className={`fa-regular fa-message text-[11px] ${
                                        isSelected ? 'text-[#60a5fa]' : 'text-[#94a3b8]'
                                    } flex-shrink-0`}
                                ></i>
                                <span className="truncate max-w-[145px] font-medium">
                                    {chat.title}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px]">
                                {chat.isPinned && (
                                    <i className="fa-solid fa-thumbtack text-[#f59e0b] text-[10px]"></i>
                                )}
                                {chat.dot && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>
                                )}
                                <div className="hidden group-hover:flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleActionClick(`delete_${chat.id}`);
                                        }}
                                        className="text-[#64748b] hover:text-[#ef4444] p-0.5 rounded"
                                    >
                                        <i className="fa-regular fa-trash-can text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {hasMore && (
                    <button
                        type="button"
                        onClick={handleLoadMore}
                        className="w-full py-2 px-3 my-1.5 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2e2e32] transition flex items-center justify-center gap-2 text-[11px] font-medium cursor-pointer"
                    >
                        <i className="fa-solid fa-angles-down text-[#60a5fa] text-[10px]"></i>
                        <span>Ko'proq yuklash (+10)</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
