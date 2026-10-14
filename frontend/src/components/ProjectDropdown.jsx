import React, { useState, useRef, useEffect } from 'react';
import { PROJECTS_LIST } from '../constants/uiData';

export default function ProjectDropdown({ selectedProject, onSelectProject }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            try {
                if (containerRef.current && !containerRef.current.contains(e.target)) {
                    setIsOpen(false);
                }
            } catch (err) {
                console.error("Click outside error:", err);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredProjects = PROJECTS_LIST.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (project) => {
        try {
            console.log("Selected project from dropdown:", project.name);
            onSelectProject(project.name);
            setIsOpen(false);
        } catch (error) {
            console.error("Error selecting project:", error);
        }
    };

    const handleQuickAction = (actionName) => {
        try {
            console.log("Project quick action:", actionName);
            if (actionName === 'no_project') {
                onSelectProject('No Project');
            }
            setIsOpen(false);
        } catch (error) {
            console.error("Error executing quick action:", error);
        }
    };

    const isNoProject = selectedProject === 'No Project';

    return (
        <div ref={containerRef} className="relative inline-block text-left mb-2 select-none z-30">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-transparent hover:bg-[#1e1e22] text-[#cbd5e1] hover:text-[#ffffff] text-xs font-medium transition cursor-pointer"
            >
                {isNoProject ? (
                    <i className="fa-regular fa-circle-xmark text-[#94a3b8]"></i>
                ) : (
                    <i className="fa-regular fa-folder text-[#94a3b8]"></i>
                )}
                <span>{selectedProject}</span>
                <i className="fa-solid fa-chevron-down text-[9px] text-[#64748b]"></i>
            </button>

            {isOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#1c1c1f] border border-[#2e2e32] rounded-2xl shadow-2xl p-2 z-50 text-xs text-[#cbd5e1] space-y-1">
                    <div className="relative mb-1">
                        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-[#64748b] text-[11px]"></i>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Projects"
                            className="w-full bg-[#141416] border border-[#2e2e32] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#ffffff] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb]"
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar py-1">
                        {filteredProjects.map((project) => {
                            const isSelected = selectedProject === project.name;
                            return (
                                <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => handleSelect(project)}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                                        isSelected
                                            ? 'bg-[#28282c] text-[#ffffff] font-medium'
                                            : 'hover:bg-[#222226] text-[#94a3b8] hover:text-[#f1f5f9]'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <i className="fa-regular fa-folder text-[#94a3b8] text-xs"></i>
                                        <span className="truncate">{project.name}</span>
                                    </div>
                                    {isSelected && (
                                        <i className="fa-solid fa-check text-[#60a5fa] text-xs"></i>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="border-t border-[#26262a] pt-1 space-y-0.5">
                        <button
                            type="button"
                            onClick={() => handleQuickAction('new_project')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#ffffff] hover:bg-[#222226] transition text-left cursor-pointer"
                        >
                            <i className="fa-solid fa-folder-plus text-[#64748b] text-xs"></i>
                            <span>New Project</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickAction('quick_start')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#ffffff] hover:bg-[#222226] transition text-left cursor-pointer"
                        >
                            <i className="fa-solid fa-bolt text-[#64748b] text-xs"></i>
                            <span>Quick Start</span>
                        </button>
                    </div>

                    <div className="border-t border-[#26262a] pt-1">
                        <button
                            type="button"
                            onClick={() => handleQuickAction('no_project')}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                                isNoProject
                                    ? 'bg-[#28282c] text-[#ffffff] font-medium'
                                    : 'text-[#94a3b8] hover:text-[#ffffff] hover:bg-[#222226]'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <i className="fa-regular fa-circle-xmark text-[#64748b] text-xs"></i>
                                <span>No Project</span>
                            </div>
                            {isNoProject && (
                                <i className="fa-solid fa-check text-[#60a5fa] text-xs"></i>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
