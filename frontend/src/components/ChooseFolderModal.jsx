import React, { useState } from 'react';

export default function ChooseFolderModal({ isOpen, onClose, onSelectFolder }) {
    const [projectName, setProjectName] = useState('');
    const [folderPath, setFolderPath] = useState('d:\\Programming\\Projects\\MyNewProject');

    if (!isOpen) return null;

    const handleConfirm = () => {
        try {
            console.log("Folder modal confirmed:", projectName || 'New Project', "Path:", folderPath);
            if (onSelectFolder) {
                onSelectFolder(projectName || 'New Project', folderPath);
            }
            onClose();
        } catch (error) {
            console.error("Error confirming folder selection:", error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
            <div className="bg-[#1c1c1f] border border-[#2e2e32] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-[#F9F9FA]">
                <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center text-[#60a5fa]">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 4h18v4H3z" />
                                <path d="M4 8v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" />
                                <path d="M10 12h4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#F9F9FA]">Choose Project Folder</h3>
                            <p className="text-[11px] text-[#94a3b8]">Select a local folder on your computer</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#94a3b8] hover:text-[#F9F9FA] p-1.5 rounded-lg hover:bg-[#222226] transition-colors cursor-pointer"
                    >
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <div className="space-y-3 text-xs">
                    <div>
                        <label className="block text-[11px] font-semibold text-[#D1D1D6] mb-1">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="e.g. My Next Project"
                            className="w-full bg-[#141416] border border-[#2e2e32] rounded-xl px-3 py-2 text-[#F9F9FA] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb]"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-[#D1D1D6] mb-1">
                            Folder Location
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={folderPath}
                                onChange={(e) => setFolderPath(e.target.value)}
                                className="flex-1 bg-[#141416] border border-[#2e2e32] rounded-xl px-3 py-2 text-[#F9F9FA] text-xs focus:outline-none focus:border-[#2563eb]"
                            />
                            <button
                                type="button"
                                onClick={() => console.log("Browse local directory triggered")}
                                className="px-3 py-2 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] text-[#F9F9FA] text-xs font-medium transition-colors cursor-pointer flex-shrink-0"
                            >
                                Browse
                            </button>
                        </div>
                    </div>

                    <div className="p-3 bg-[#141416] border border-[#26262a] rounded-xl space-y-1 text-[11px] text-[#94a3b8]">
                        <div className="flex items-center gap-1.5 text-[#10b981] font-semibold">
                            <i className="fa-solid fa-shield-halved"></i>
                            <span>100% Local Privacy Protection</span>
                        </div>
                        <p>All conversation history and files will be stored directly in this folder.</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26262a]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] text-[#D1D1D6] hover:text-[#F9F9FA] text-xs font-medium transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-[#ffffff] text-xs font-semibold shadow-md transition-colors cursor-pointer"
                    >
                        Select Folder
                    </button>
                </div>
            </div>
        </div>
    );
}
