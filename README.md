# Emris AI Desktop App — v1.2 Beta

[![Version](https://img.shields.io/badge/version-v1.2--Beta-blue.svg)](https://github.com/RahmatillaXudoyberdiyev/Emris-AI-desktop/releases)
[![Sponsor](https://img.shields.io/badge/sponsor-support%20project-ff69b4.svg)](https://github.com/sponsors/RahmatillaXudoyberdiyev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)

An open-source, ultra-lightweight desktop AI workstation combining **Python** and **React.js**. Built for developer productivity, autonomous multi-agent engineering workflows, and codebase intelligence without the typical resource bloat of Electron apps.

---

## What's New in v1.2 Beta

* **Hierarchical Multi-Agent Engine**:
  * **Chief Architect**: Decomposes user goals into dynamic, structured execution plans synced directly to `plans.md`.
  * **File Analyzer Agent**: Workspace directory mapping and Hybrid BM25/Cosine RAG code search across project repositories.
  * **Engineer Agent**: Native tool calling with line-bounded file inspections (`read_file`), surgical string replacement (`replace_block`), and file synthesis (`create_file`) without code fence leakage.
  * **Inspector Agent**: Autonomous diagnostics and error analysis when terminal commands exit with non-zero codes, automatically proposing auto-patches for syntax bugs or environment fixes.
  * **CLI Agent**: Secure, user-supervised terminal command execution with integrated approval gates.
* **Smart Virtual Environment Isolation**:
  * Automatically detects local virtual environments (`.venv` or `venv`) in target workspaces.
  * Pre-empts bare `python`, `pip`, `flask`, `pytest`, or `uvicorn` commands and binds them to the project's local virtual environment, preventing global Python package pollution.
  * Intelligent dependency diagnostics: verifies whether modules are already installed in `.venv` before prompting for pip installations.
* **Live Token Analytics**:
  * Displays real-time token metrics (prompt, completion, and total tokens) in the response footer.
  * Preserved across terminal command approvals, code auto-patches, and reloaded sessions.
* **Prompt History Management**:
  * In-line prompt editing (`Save & Resend`) and revert (`Delete`) buttons on user messages with clean conversation truncation and history re-branching.

---

## Highlights

* **Ultra-Lightweight Desktop Shell (Baseline ~11 MB, Capped <= 150 MB)**: Uses native OS webviews (Microsoft Edge WebView2 on Windows via `pywebview`) instead of bundling a 150+ MB Chromium runtime, preserving a minimal footprint while supporting native codebase intelligence.
* **Antigravity-Inspired Navigation**: Organized sidebar featuring project folder hierarchies, conversation histories, automations, and customizations.
* **Inline Project Switcher**: Floating project selector located directly above the prompt bar for switching workspace contexts instantly.
* **Dual Work & Chat Integration**:
  * **Work Mode (Default)**: Dedicated desktop workspace for code tasks, file operations, and autonomous agent executions.
  * **Chat Mode**: Quick-action gateway connecting to the [SuniyIntellekt.uz](https://suniyintellekt.uz) online platform.
* **Instant Hot Reloading**: Powered by Vite and Python live-reload for smooth pair programming and real-time development.

---

## Tech Stack

* **Frontend**: React 18, Vite, Tailwind CSS, FontAwesome 6.4, Inter & JetBrains Mono typography.
* **Desktop Wrapper**: Python 3.10+, `pywebview` (Edge WebView2 native bridge).
* **Intelligence Layer**: Google Gemini API (`gemini-3.5-flash-lite`) with Groq fallback (`llama-3.3-70b-versatile`).
* **Packaging**: PyInstaller with optimized runtime hooks.

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+) & `npm`
* [Python](https://www.python.org/) (v3.10+)

### 1. Clone the Repository
```bash
git clone https://github.com/RahmatillaXudoyberdiyev/Emris-AI-desktop.git
cd Emris-AI-desktop
```

### 2. Set Up Python Environment
```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Install dependencies:
pip install -r backend/requirements.txt
```

### 3. Set Up React Frontend
```bash
cd frontend
npm install
cd ..
```

---

## Development

Run the frontend dev server and desktop window simultaneously for real-time live editing:

**Terminal 1 (Vite Dev Server):**
```bash
cd frontend
npm run dev
```

**Terminal 2 (Desktop Launcher):**
```bash
python backend/main.py --dev
```

Any code changes made in `frontend/src/` will hot-reload immediately inside the open desktop window.

---

## Building a Standalone Executable (.exe)

To package the standalone Windows binary with embedded assets:

```bash
# 1. Compile the React production bundle
cd frontend
npm run build
cd ..

# 2. Package with PyInstaller
.\.venv\Scripts\pyinstaller.exe --noconfirm --clean --onefile --noconsole --name "Emris-AI-Desktop-v1.2-Beta" --add-data "frontend/dist;frontend/dist" --add-data "backend/prompts;backend/prompts" backend/main.py
```

The resulting single-file executable is output to `dist/Emris-AI-Desktop-v1.2-Beta.exe`.

---

## Repository Structure

```text
Emris-AI-desktop/
├── .github/
│   ├── FUNDING.yml          # GitHub Sponsors configuration
│   └── workflows/
│       └── release.yml      # Automated release builder for Windows executables
├── backend/
│   ├── main.py              # Desktop launcher & native webview bridge
│   ├── agent.py             # Multi-agent cycle orchestration & task synthesis
│   ├── gateway.py           # LLM gateway (Gemini API & Groq fallback)
│   ├── terminal.py          # Process execution & virtualenv isolation
│   ├── workspace_tools.py   # Line-bounded file read/replace/create tools
│   ├── retrievers.py        # Hybrid BM25 & Cosine RAG search engine
│   ├── prompts/             # Agent system prompts (Chief Architect, Engineer, Inspector)
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── public/              # Favicons and webmanifest
│   ├── src/
│   │   ├── components/      # AgentActivityCard, ChatMessage, Sidebar, CenterWorkspace
│   │   ├── hooks/           # useAgentWorkflow state machine
│   │   ├── locales/         # English, Russian, Uzbek translations
│   │   ├── services/        # Desktop Bridge & local API client
│   │   ├── App.jsx          # Root application container
│   │   └── main.jsx         # React DOM mount
│   ├── index.html           # Main HTML shell
│   ├── package.json         # NPM scripts and dependencies
│   └── vite.config.js       # Vite bundler configuration
├── GEMINI.md                # Project operational notes
└── README.md                # Documentation & release notes
```

---

## Roadmap

- [x] v1.1 Beta UI layout & Antigravity sidebar
- [x] Lightweight native desktop window integration (`pywebview`)
- [x] Live hot-module-reload development environment
- [x] Autonomous multi-agent execution cycle & workspace tools (v1.2 Beta)
- [x] Multi-turn conversation persistence & session caching
- [x] Native local file inspection with surgical `replace_block`
- [x] Automatic virtual environment isolation & command retargeting
- [x] Live token usage analytics per response
- [ ] Git version control sidecar & branch management
- [ ] Cross-platform macOS (WebKit) and Linux packaging

---

## Support & Sponsorship

If you find Emris AI Desktop valuable for your engineering workflow and would like to support ongoing development, maintenance, and new capabilities, contributions are warmly welcomed:

* **GitHub Sponsors**: [github.com/sponsors/RahmatillaXudoyberdiyev](https://github.com/sponsors/RahmatillaXudoyberdiyev)
* **Website**: [rahmatilla.uz](https://rahmatilla.uz)
* **Platform**: [SuniyIntellekt.uz](https://suniyintellekt.uz)

Your support helps cover API testing infrastructure, automated builds, and open-source feature development.

---

## Contributing

Contributions, feature suggestions, and feedback are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m "Add some AmazingFeature"`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## Author & Credits

* **Author**: Rahmatilla Xudoyberdiyev ([Rahmatilla.uz](https://rahmatilla.uz) / [@rahmatilla_uz](https://t.me/rahmatilla_uz))
* **Platform**: [SuniyIntellekt.uz](https://suniyintellekt.uz)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
