# Emris AI Desktop App — Standalone Windows EXE Build

## Changes Made
- **Isolated Clean Virtual Environment (`.venv`)**:
  - Created `.venv` with only `pywebview` and `pyinstaller` so no extraneous global libraries (`PyQt`, `torch`, `scipy`, etc.) are bundled.
- **Optimized `backend/main.py` for Minimal `.exe` Size**:
  - Switched `backend/main.py` to use `pywebview`'s built-in lightweight HTTP server (`webview.start(http_server=True)`) serving `frontend/dist/index.html` directly via `sys._MEIPASS`.
- **Built Standalone Executable (`dist/EmrisAI.exe`)**:
  - Packaged with `.venv\Scripts\pyinstaller.exe --noconfirm --clean --onefile --noconsole --name "EmrisAI" --icon "backend/favicon.ico" --add-data "frontend/dist;frontend/dist" backend/main.py`.
  - Final size of `dist/EmrisAI.exe`: **10.89 MB**.

## Solutions Found
- **Keeping EXE Small (10.89 MB)**: Building from the global Python environment pulls in heavy packages and causes Qt hook conflicts (`PyQt5` vs `PyQt6`). Using an isolated `.venv` + `pywebview`'s built-in `http_server=True` produces a single-file `.exe` of just **10.89 MB** (compared to 150MB+ for Electron or global Python builds).
- **Null Streams in Windowed Mode**: Initialized `io.StringIO()` fallback for `sys.stdout` and `sys.stderr` when `None` in `--noconsole` mode.

## Guidance for Future Chats
- Whenever frontend changes are made, run `npm.cmd run build` inside `frontend/`, then build the `.exe` using `.\.venv\Scripts\pyinstaller.exe EmrisAI.spec`.

## What Works & What Doesn't
- [x] Standalone `dist/EmrisAI.exe` (**10.89 MB**) with custom Emris AI icon (`favicon.ico`).
- [x] Native Windows desktop window via `pywebview` (Edge WebView2) with zero terminal popup.
- [x] Embedded React.js UI (`frontend/dist`) served locally inside the executable.
