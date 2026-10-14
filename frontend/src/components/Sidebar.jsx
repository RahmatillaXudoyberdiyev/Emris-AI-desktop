import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PROJECTS_WITH_CHATS } from '../constants/uiData';

export default function Sidebar({ onSelectProject, onNewConversation, activeProjectName }) {
    const [projectData, setProjectData] = useState(PROJECTS_WITH_CHATS);
    const [visibleBudget, setVisibleBudget] = useState(10);
    const [selectedChatId, setSelectedChatId] = useState('c1');
    const sentinelRef = useRef(null);

    const totalAvailableChats = projectData.reduce((sum, p) => sum + p.chats.length, 0);

    const handleNewChat = () => {
        try {
            console.log("New conversation triggered: resetting project to No Project");
            const newChat = {
                id: "chat_" + Date.now(),
                title: "New Session",
                isPinned: false,
                time: "just now",
                active: true
            };

            setProjectData((prev) => {
                const updated = [...prev];
                const noProjIndex = updated.findIndex((p) => p.name === "No Project");
                if (noProjIndex !== -1) {
                    updated[noProjIndex] = {
                        ...updated[noProjIndex],
                        chats: [newChat, ...updated[noProjIndex].chats]
                    };
                } else {
                    updated.unshift({
                        id: "proj_no_project",
                        name: "No Project",
                        chats: [newChat]
                    });
                }
                return updated;
            });

            setSelectedChatId(newChat.id);
            if (onNewConversation) {
                onNewConversation();
            }
        } catch (error) {
            console.error("Error creating new conversation:", error);
        }
    };

    const handleChatClick = (chat, projectName) => {
        try {
            console.log("Selected chat:", chat.title, "in project:", projectName);
            setSelectedChatId(chat.id);
            if (onSelectProject) {
                onSelectProject(projectName || 'No Project');
            }
        } catch (error) {
            console.error("Error clicking chat item:", error);
        }
    };

    const handleLoadMore = useCallback(() => {
        try {
            console.log("Auto-loading next 10 chats across projects...");
            setVisibleBudget((prev) => Math.min(prev + 10, totalAvailableChats));
        } catch (error) {
            console.error("Error loading more chats:", error);
        }
    }, [totalAvailableChats]);

    const handleScroll = (e) => {
        try {
            const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
            if (scrollTop + clientHeight >= scrollHeight - 60) {
                if (visibleBudget < totalAvailableChats) {
                    handleLoadMore();
                }
            }
        } catch (error) {
            console.error("Error handling scroll event:", error);
        }
    };

    const handleWheel = (e) => {
        try {
            if (e.deltaY > 0) {
                const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
                const isNearBottom = scrollTop + clientHeight >= scrollHeight - 60;
                const hasNoOverflow = scrollHeight <= clientHeight;
                if ((isNearBottom || hasNoOverflow) && visibleBudget < totalAvailableChats) {
                    handleLoadMore();
                }
            }
        } catch (error) {
            console.error("Error handling wheel event:", error);
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleBudget < totalAvailableChats) {
                    handleLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [visibleBudget, totalAvailableChats, handleLoadMore]);

    let remainingQuota = visibleBudget;
    const computedProjects = [];
    let loadedChatsCount = 0;

    for (const project of projectData) {
        const totalInProj = project.chats.length;
        if (remainingQuota > 0) {
            const takeCount = Math.min(totalInProj, remainingQuota);
            remainingQuota -= takeCount;
            loadedChatsCount += takeCount;
            computedProjects.push({
                ...project,
                visibleChats: project.chats.slice(0, takeCount),
                ratioLabel: `${takeCount}/${totalInProj}`
            });
        } else {
            break;
        }
    }

    const hasMore = loadedChatsCount < totalAvailableChats;

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
            </div>

            <div className="p-3 pb-2">
                <button
                    type="button"
                    onClick={handleNewChat}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] text-[#f1f5f9] hover:text-[#ffffff] border border-[#2e2e32] transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer shadow-sm"
                >
                    <i className="fa-solid fa-plus text-[#60a5fa] text-xs"></i>
                    <span>New Conversation</span>
                </button>
            </div>

            <div className="px-4 pt-3 pb-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#94a3b8] uppercase">
                <span>Projects</span>
                <span className="text-[10px] text-[#64748b]">
                    {loadedChatsCount} / {totalAvailableChats}
                </span>
            </div>

            <div
                id="sessions-list"
                onScroll={handleScroll}
                onWheel={handleWheel}
                className="flex-1 min-h-0 overflow-y-auto px-2 space-y-2 py-1 custom-scrollbar text-xs"
            >
                {computedProjects.map((project) => {
                    const isCurrentProject = activeProjectName === project.name;
                    return (
                        <div key={project.id} className="space-y-0.5">
                            <div
                                onClick={() => onSelectProject && onSelectProject(project.name)}
                                className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition-colors ${
                                    isCurrentProject
                                        ? 'text-[#ffffff] font-medium'
                                        : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <i className="fa-regular fa-folder text-[#94a3b8] text-xs"></i>
                                    <span className="truncate">{project.name}</span>
                                </div>
                                <span className="text-[10px] text-[#64748b] font-mono px-1.5 py-0.5 rounded bg-[#1e1e22] border border-[#2e2e32]">
                                    {project.ratioLabel}
                                </span>
                            </div>

                            <div className="pl-3 space-y-0.5">
                                {project.visibleChats.map((chat) => {
                                    const isSelected = selectedChatId === chat.id;
                                    return (
                                        <div
                                            key={chat.id}
                                            onClick={() => handleChatClick(chat, project.name)}
                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors text-xs ${
                                                isSelected
                                                    ? 'bg-[#28282c] text-[#ffffff] font-medium'
                                                    : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#222226]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                                <i
                                                    className={`fa-regular fa-message text-[10px] flex-shrink-0 ${
                                                        isSelected ? 'text-[#60a5fa]' : 'text-[#64748b]'
                                                    }`}
                                                ></i>
                                                <span className="truncate">{chat.title}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] text-[#64748b] ml-1.5">
                                                {chat.isPinned && (
                                                    <i className="fa-solid fa-thumbtack text-[#f59e0b] text-[9px]"></i>
                                                )}
                                                {chat.dot && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>
                                                )}
                                                {chat.time && <span>{chat.time}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {hasMore && (
                    <div ref={sentinelRef} className="py-2 text-center text-[#64748b] text-[10px]">
                        <i className="fa-solid fa-angles-down text-[#60a5fa] mr-1"></i>
                        <span>Scroll for more (+10)</span>
                    </div>
                )}
            </div>
        </aside>
    );
}
