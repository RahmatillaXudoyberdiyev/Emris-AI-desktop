# Emris AI Desktop App — Project Navigation Map

## Root Directory Structure
- `PROJECT_MAP.md` — Root navigation index describing the project structure.
- `dist/` — Output directory containing the standalone Windows executable (`EmrisAI.exe`).
- `EmrisAI.spec` — PyInstaller specification file for building `EmrisAI.exe`.
- `backend/` — Python FastAPI + PyWebView desktop application shell.
  - `BACKEND_MAP.md` — Backend folder navigation index.
  - `main.py` — Main Python entry point launching the FastAPI server and native desktop window (supports both standard Python and PyInstaller frozen `.exe` mode).
  - `requirements.txt` — Python package dependencies (`fastapi`, `uvicorn`, `pywebview`, `pyinstaller`).
  - `favicon.ico` — Application icon copied from `D:\suniyintellekt uz`.
- `frontend/` — React.js + Vite user interface replicating the Emris AI v1.9 Beta layout.
  - `FRONTEND_MAP.md` — Frontend folder navigation index.
  - `package.json` — React and Vite configuration and scripts.
  - `vite.config.js` — Vite bundler settings.
  - `index.html` — Root HTML document with favicons, Tailwind CSS, Inter & JetBrains Mono fonts, and FontAwesome icons.
  - `public/` — All favicons and manifest copied from `D:\suniyintellekt uz`.
  - `src/` — Modular React components and static UI configuration.
  - `dist/` — Production build bundled into `EmrisAI.exe`.
- `gemini_logs/` — Project milestone and session logs organized by `YYYY-MM-DD`.
