export const INITIAL_SESSIONS = [
    { id: "sess_1", title: "Minimalistik Kosmik ...", active: false, isPinned: false },
    { id: "sess_2", title: "Solving the Jumboo ...", active: false, isPinned: false },
    { id: "sess_3", title: "Jumboo Clock Para...", active: false, isPinned: false },
    { id: "sess_4", title: "New Session", active: true, isPinned: false },
    { id: "sess_5", title: "New Session", active: false, isPinned: false },
    { id: "sess_6", title: 'I said "Ushbu maqol...', active: false, isPinned: false },
    { id: "sess_7", title: "New Session", active: false, isPinned: false },
    { id: "sess_8", title: "Make music.html in ...", active: false, isPinned: false }
];

export const PRESET_CARDS = [
    {
        id: "preset_plot",
        icon: "fa-solid fa-chart-simple text-emerald-400",
        title: "Vizual grafik",
        description: "Matplotlib yordamida chiroyli ustunli grafik chizish"
    },
    {
        id: "preset_time",
        icon: "fa-solid fa-gamepad text-amber-400",
        title: '"Kosmik koinot" o\'yini',
        description: 'Menga HTML, CSS va JavaScript yordamida brauzerda o\'ynaladigan chiroyli, minimalistic "Kosmik koinot" o\'yinini yaratib ber...'
    },
    {
        id: "preset_landing",
        icon: "fa-solid fa-globe text-indigo-400",
        title: "HTML Landing Sahifa",
        description: "Hayvonlar haqida sodda va minimalistik html sahifa yarat"
    },
    {
        id: "preset_essay",
        icon: "fa-solid fa-pen-nib text-purple-400",
        title: "Ijodiy Insho",
        description: "Odatlar tizimi inson intizomini qanday o'zgartirishi haqida tahliliy insho"
    }
];

export const SKILL_ITEMS = [
    {
        id: "direct_answer",
        label: "To'g'ridan-to'g'ri javob",
        icon: "fa-solid fa-comment-dots text-emerald-400",
        hoverClass: "hover:border-emerald-500/40 hover:text-emerald-300"
    },
    {
        id: "writing",
        label: "Yozish (Insho/Maqola)",
        icon: "fa-solid fa-feather text-rose-400",
        hoverClass: "hover:border-rose-500/40 hover:text-rose-300"
    },
    {
        id: "goal",
        label: "Maqsad (Goal)",
        icon: "fa-solid fa-bullseye text-amber-400",
        hoverClass: "hover:border-amber-500/40 hover:text-amber-300"
    },
    {
        id: "reflection",
        label: "Refleksiya",
        icon: "fa-solid fa-brain text-purple-400",
        hoverClass: "hover:border-purple-500/40 hover:text-purple-300"
    },
    {
        id: "human_interaction",
        label: "Inson bilan muloqot",
        icon: "fa-solid fa-handshake-angle text-pink-400",
        hoverClass: "hover:border-pink-500/40 hover:text-pink-300"
    },
    {
        id: "sandbox_environment",
        label: "Sandbox muhiti",
        icon: "fa-solid fa-cube text-indigo-400",
        hoverClass: "hover:border-indigo-500/40 hover:text-indigo-300"
    },
    {
        id: "code_execution",
        label: "Kod bajarish",
        icon: "fa-solid fa-terminal text-blue-400",
        hoverClass: "hover:border-blue-500/40 hover:text-blue-300"
    },
    {
        id: "code_output",
        label: "Kod natijasi",
        icon: "fa-solid fa-code text-cyan-400",
        hoverClass: "hover:border-cyan-500/40 hover:text-cyan-300"
    },
    {
        id: "web_search",
        label: "Veb qidiruv",
        icon: "fa-solid fa-globe text-teal-400",
        hoverClass: "hover:border-teal-500/40 hover:text-teal-300"
    }
];

export const MODEL_GROUPS = [
    {
        group: "Google Gemini",
        models: [
            { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
            { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
            { value: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
            { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
        ]
    },
    {
        group: "AionLabs",
        models: [
            { value: "aion-labs/aion-3.5", label: "Aion 3.5" },
            { value: "aion-labs/aion-3.5-mini", label: "Aion 3.5 Mini" },
            { value: "aion-labs/aion-3.0", label: "Aion 3.0" }
        ]
    },
    {
        group: "Groq Cloud",
        models: [
            { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)" },
            { value: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 70B (Groq)" }
        ]
    }
];
