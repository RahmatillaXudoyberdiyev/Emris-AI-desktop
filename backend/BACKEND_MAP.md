# Backend Navigation Map (`backend/`)

## Files & Responsibilities
- `main.py` — Lightweight Python desktop entry point. Detects whether it is running in standard Python mode or PyInstaller frozen `.exe` mode (`sys._MEIPASS`) and serves `frontend/dist/index.html` inside a native `pywebview` desktop window using its built-in HTTP server (`http_server=True`).
- `requirements.txt` — Python dependencies (`fastapi`, `uvicorn`, `pywebview`, `pyinstaller`).
- `favicon.ico` — Application icon copied from `D:\suniyintellekt uz` and embedded into `EmrisAI.exe`.
