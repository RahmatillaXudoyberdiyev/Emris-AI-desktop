# Emris AI Dekstop App — v1.1 Beta

[![Version](https://img.shields.io/badge/version-v1.1--Beta-blue.svg)](https://github.com/RahmatillaXudoyberdiyev/Emris-AI-desktop)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)

An open-source, ultra-lightweight desktop AI workstation combining **Python** and **React.js**. Built for developer productivity, autonomous agent workflows, and seamless project management without the typical resource bloat of Electron apps.

---

## Highlights

* **Ultra-Lightweight Desktop Shell (Baseline ~11 MB, Capped <= 150 MB)**: Uses native OS webviews (Microsoft Edge WebView2 on Windows via `pywebview`) instead of bundling a 150+ MB Chromium runtime, preserving a lightweight footprint while supporting native codebase intelligence.
* **Antigravity-Inspired Navigation**: Organized sidebar featuring project folder hierarchies, conversation histories, automations, and customizations.
* **Inline Project Switcher**: Floating project selector located directly above the prompt bar for switching contexts instantly.
* **Dual Work & Chat Integration**:
  * **Work Mode (Default)**: Dedicated desktop workspace for code tasks, file operations, and autonomous agent executions.
  * **Chat Mode**: Quick-action gateway connecting to the [SuniyIntellekt.uz](https://suniyintellekt.uz) online platform.
* **Instant Hot Reloading**: Powered by Vite and Python live-reload for smooth pair programming and real-time development.

---

## Tech Stack

* **Frontend**: React 18, Vite, Tailwind CSS, FontAwesome 6.4, Inter & JetBrains Mono typography.
* **Desktop Wrapper**: Python 3.10+, `pywebview` (Edge WebView2 native bridge).
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

To build a standalone Windows binary with embedded assets:

```bash
# 1. Compile the React production bundle
cd frontend
npm run build
cd ..

# 2. Package with PyInstaller
.\.venv\Scripts\pyinstaller.exe --noconfirm --clean --onefile --noconsole --name "EmrisAI" --icon "backend/favicon.ico" --add-data "frontend/dist;frontend/dist" backend/main.py
```

The resulting single-file executable will be generated at `dist/EmrisAI.exe` (~11 MB).

---

## Repository Structure

```text
Emris-AI-desktop/
├── backend/
│   ├── main.py              # Python desktop launcher & native webview bridge
│   ├── requirements.txt     # Python backend dependencies
│   └── favicon.ico          # Application icon
├── frontend/
│   ├── public/              # Favicons and webmanifest
│   ├── src/
│   │   ├── components/      # Sidebar, Header, CenterWorkspace, ProjectDropdown
│   │   ├── constants/       # Static UI & project data
│   │   ├── App.jsx          # Root layout
│   │   ├── index.css        # Custom styles & scrollbars
│   │   └── main.jsx         # React DOM mount
│   ├── index.html           # Main HTML shell
│   ├── package.json         # NPM scripts and dependencies
│   └── vite.config.js       # Vite bundler configuration
└── README.md
```

---

## Roadmap

- [x] v1.1 Beta UI layout & Antigravity sidebar
- [x] Lightweight native desktop window integration (~11 MB)
- [x] Live hot-module-reload development environment
- [ ] Local agent execution engine & Python backend endpoints
- [ ] Multi-turn conversation persistence & session caching
- [ ] Local file and folder workspace mounting

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
