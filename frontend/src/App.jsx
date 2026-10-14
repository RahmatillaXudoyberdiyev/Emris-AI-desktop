import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CenterWorkspace from './components/CenterWorkspace';

export default function App() {
    const [currentProject, setCurrentProject] = useState('No Project');

    useEffect(() => {
        try {
            console.log("Emris AI Dekstop App v1.1 Beta initialized with No Project.");
        } catch (error) {
            console.error("App init error:", error);
        }
    }, []);

    const handleSelectProject = (projectName) => {
        try {
            console.log("Selected active project:", projectName);
            setCurrentProject(projectName);
        } catch (error) {
            console.error("Failed to select project:", error);
        }
    };

    const handleNewConversation = () => {
        try {
            console.log("Starting new conversation: setting current project to No Project");
            setCurrentProject('No Project');
        } catch (error) {
            console.error("Error setting new conversation:", error);
        }
    };

    return (
        <div className="h-screen w-screen flex overflow-hidden bg-[#131314] text-slate-100 antialiased selection:bg-[#2563eb] selection:text-white">
            <Sidebar
                onSelectProject={handleSelectProject}
                onNewConversation={handleNewConversation}
                activeProjectName={currentProject}
            />
            <main className="flex-1 flex flex-col h-full bg-[#131314] relative overflow-hidden">
                <Header currentProject={currentProject} />
                <CenterWorkspace
                    currentProject={currentProject}
                    onSelectProject={handleSelectProject}
                />
            </main>
        </div>
    );
}
