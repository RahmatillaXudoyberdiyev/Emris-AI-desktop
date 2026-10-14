import React, { useState } from 'react';
import { PROJECTS_TREE } from '../constants/uiData';

export default function Sidebar({ onSelectProject, activeProjectName }) {
    const [selectedItemId, setSelectedItemId] = useState('item_2');

    const handleItemClick = (item, projectName) => {
        try {
            console.log("Selected conversation item:", item.title, "in project:", projectName);
            setSelectedItemId(item.id);
            if (onSelectProject) {
                onSelectProject(projectName);
            }
        } catch (error) {
            console.error("Error clicking conversation item:", error);
        }
    };

    const handleActionClick = (actionName) => {
        try {
            console.log("Sidebar action clicked:", actionName);
        } catch (error) {
            console.error("Error executing action:", error);
        }
    };

    return (
        <aside
            id="sidebar"
            className="w-64 h-full max-h-screen bg-[#151515] border-r border-[#26262a] flex flex-col flex-shrink-0 overflow-hidden z-30 select-none text-[#cbd5e1]"
        >
            <div className="p-3 border-b border-[#26262a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center font-bold text-[#ffffff] tracking-wider text-base">
                        <svg className="w-5 h-5 fill-current text-[#ffffff]" viewBox="0 0 24 24">
                            <path d="M12 2L2 22h4.5l2.5-5.5h6l2.5 5.5H22L12 2zm0 6l2.2 4.8h-4.4L12 8z" />
                        </svg>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[#94a3b8] text-xs">
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
                    onClick={() => handleActionClick('new_conversation')}
                    className="w-full py-2 px-3 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] text-[#f1f5f9] hover:text-[#ffffff] border border-[#2e2e32] transition flex items-center gap-2 text-xs font-medium cursor-pointer"
                >
                    <i className="fa-solid fa-plus text-[#94a3b8] text-xs"></i>
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

            <div className="px-3 pt-3 pb-1 flex items-center justify-between text-xs font-semibold text-[#94a3b8]">
                <span>Projects</span>
                <div className="flex items-center gap-2 text-[#64748b]">
                    <button
                        type="button"
                        onClick={() => handleActionClick('filter_projects')}
                        className="hover:text-[#cbd5e1] cursor-pointer p-0.5"
                        title="Filter"
                    >
                        <i className="fa-solid fa-bars-staggered text-[11px]"></i>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleActionClick('add_folder')}
                        className="hover:text-[#cbd5e1] cursor-pointer p-0.5"
                        title="New Folder"
                    >
                        <i className="fa-regular fa-folder text-[11px]"></i>
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-2 space-y-2.5 py-1 custom-scrollbar text-xs">
                {PROJECTS_TREE.map((project) => {
                    const isCurrentProject = activeProjectName === project.name;
                    return (
                        <div key={project.id} className="space-y-0.5">
                            <div className="flex items-center gap-2 px-2 py-1 text-[#94a3b8] hover:text-[#f1f5f9] cursor-pointer rounded-md">
                                <i className="fa-regular fa-folder text-[#94a3b8] text-xs"></i>
                                <span className="truncate font-medium">{project.name}</span>
                            </div>

                            <div className="pl-3 space-y-0.5">
                                {project.items.map((item) => {
                                    const isSelected = selectedItemId === item.id;
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleItemClick(item, project.name)}
                                            className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition text-xs ${
                                                isSelected
                                                    ? 'bg-[#28282c] text-[#ffffff] font-medium'
                                                    : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#222226]'
                                            }`}
                                        >
                                            <span className="truncate max-w-[140px]">
                                                {item.title}
                                            </span>

                                            <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] text-[#64748b]">
                                                {item.dot && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>
                                                )}
                                                {item.time && <span>{item.time}</span>}
                                                {isSelected && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleActionClick(`more_${item.id}`);
                                                        }}
                                                        className="text-[#94a3b8] hover:text-[#ffffff] px-1"
                                                    >
                                                        <i className="fa-solid fa-ellipsis"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
