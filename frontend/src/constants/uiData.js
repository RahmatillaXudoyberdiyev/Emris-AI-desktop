export const MODEL_OPTIONS = [
    { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
    { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" }
];

export const PROJECTS_WITH_CHATS = [
    {
        id: "proj_demo_app",
        name: "Demo Project Alpha",
        chats: [
            { id: "c1", title: "Getting Started Session", isPinned: false, time: "just now", active: true },
            { id: "c2", title: "Architecture Overview", isPinned: true, time: "1h" },
            { id: "c3", title: "API Integration Guide", isPinned: false, time: "2h" },
            { id: "c4", title: "Component Structure Plan", isPinned: false, time: "3h" },
            { id: "c5", title: "State Management Review", isPinned: false, time: "4h" }
        ]
    },
    {
        id: "proj_sample_web",
        name: "Sample Web App",
        chats: [
            { id: "c6", title: "Responsive Layout Debugging", isPinned: true, time: "4h" },
            { id: "c7", title: "CSS Grid Exploration", isPinned: false, time: "1d" }
        ]
    },
    {
        id: "proj_ai_sandbox",
        name: "AI Research Sandbox",
        chats: [
            { id: "c8", title: "Model Benchmark Comparison", isPinned: false, time: "3d" },
            { id: "c9", title: "Prompt Engineering Notes", isPinned: false, time: "4d" },
            { id: "c10", title: "Token Optimization Strategy", isPinned: false, time: "5d" },
            { id: "c11", title: "Context Window Analysis", isPinned: false, time: "6d", dot: true },
            { id: "c12", title: "Streaming Response Test", isPinned: false, time: "7d" },
            { id: "c13", title: "Evaluation Metric Setup", isPinned: false, time: "8d" }
        ]
    },
    {
        id: "proj_utility_toolkit",
        name: "Utility Toolkit",
        chats: [
            { id: "c14", title: "Unit Test Generator", isPinned: false, time: "6h" },
            { id: "c15", title: "File Parser Script", isPinned: false, time: "1d" }
        ]
    },
    {
        id: "proj_cloud_demo",
        name: "Cloud Services Demo",
        chats: [
            { id: "c16", title: "Serverless Deployment Draft", isPinned: false, time: "8d" },
            { id: "c17", title: "Webhook Handler Template", isPinned: false, time: "10d" }
        ]
    },
    {
        id: "proj_core_engine",
        name: "Core Engine Library",
        chats: [
            { id: "c18", title: "Memory Allocation Benchmark", isPinned: false, time: "9d" },
            { id: "c19", title: "Thread Pool Investigation", isPinned: false, time: "15d", dot: true },
            { id: "c20", title: "Cross-Platform Build Setup", isPinned: false, time: "19d" }
        ]
    },
    {
        id: "proj_no_project",
        name: "No Project",
        chats: [
            { id: "c21", title: "General Brainstorming", isPinned: false, time: "5d" },
            { id: "c22", title: "Quick Query Session", isPinned: false, time: "7d" }
        ]
    }
];

export const PROJECTS_LIST = [
    { id: "p1", name: "Demo Project Alpha" },
    { id: "p2", name: "Sample Web App" },
    { id: "p3", name: "AI Research Sandbox" },
    { id: "p4", name: "Utility Toolkit" },
    { id: "p5", name: "Cloud Services Demo" },
    { id: "p6", name: "Core Engine Library" }
];
