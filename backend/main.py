import io
import os
import socket
import sys
import webbrowser
from pathlib import Path
import webview

try:
    from backend.database import db
    from backend.terminal import execute_shell_command
except ImportError:
    from database import db
    from terminal import execute_shell_command

if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()


def load_env_file():
    try:
        env_path = Path(__file__).resolve().parent.parent / ".env"
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip())
            print("[Desktop] .env configuration loaded.")
    except Exception as exc:
        print(f"[Desktop] Error loading .env: {exc}")


load_env_file()


def choose_folder_dialog():
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected = filedialog.askdirectory(title="Select Project Folder")
        root.destroy()
        if selected:
            resolved = str(Path(selected).resolve())
            print(f"[Desktop] Selected directory: {resolved}")
            return resolved
        return None
    except Exception as exc:
        print(f"[Desktop] Folder dialog error: {exc}")
        return None


class DesktopBridge:
    def open_external(self, url: str):
        try:
            print(f"[Desktop] Opening external URL: {url}")
            webbrowser.open(url)
            return True
        except Exception as exc:
            print(f"[Desktop] Error opening external URL: {exc}")
            return False

    def choose_folder(self):
        try:
            return choose_folder_dialog()
        except Exception as exc:
            print(f"[Desktop] Folder selection error: {exc}")
            return None

    def get_projects(self):
        try:
            return db.get_projects()
        except Exception as exc:
            print(f"[Desktop] get_projects error: {exc}")
            return []

    def create_project(self, name: str, path: str):
        try:
            return db.create_project(name, path)
        except Exception as exc:
            print(f"[Desktop] create_project error: {exc}")
            return None

    def delete_project(self, project_id: str):
        try:
            return db.delete_project(project_id)
        except Exception as exc:
            print(f"[Desktop] delete_project error: {exc}")
            return False

    def get_conversations(self, project_id: str = None):
        try:
            return db.get_conversations(project_id)
        except Exception as exc:
            print(f"[Desktop] get_conversations error: {exc}")
            return []

    def create_conversation(self, title: str, project_id: str = None, model: str = "Gemini 3.5 Flash Lite"):
        try:
            return db.create_conversation(title, project_id, model)
        except Exception as exc:
            print(f"[Desktop] create_conversation error: {exc}")
            return None

    def delete_conversation(self, conversation_id: str):
        try:
            return db.delete_conversation(conversation_id)
        except Exception as exc:
            print(f"[Desktop] delete_conversation error: {exc}")
            return False

    def get_messages(self, conversation_id: str):
        try:
            return db.get_messages(conversation_id)
        except Exception as exc:
            print(f"[Desktop] get_messages error: {exc}")
            return []

    def add_message(self, conversation_id: str, role: str, content: str):
        try:
            return db.add_message(conversation_id, role, content)
        except Exception as exc:
            print(f"[Desktop] add_message error: {exc}")
            return None

    def get_setting(self, key: str, default: str = ""):
        try:
            return db.get_setting(key, default)
        except Exception as exc:
            print(f"[Desktop] get_setting error: {exc}")
            return default

    def set_setting(self, key: str, value: str):
        try:
            return db.set_setting(key, value)
        except Exception as exc:
            print(f"[Desktop] set_setting error: {exc}")
            return False

    def run_command(self, command: str, cwd: str = None):
        try:
            return execute_shell_command(command, cwd)
        except Exception as exc:
            print(f"[Desktop] run_command error: {exc}")
            return {"success": False, "stdout": "", "stderr": str(exc), "exit_code": -1}


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            return sock.connect_ex((host, port)) == 0
    except Exception as exc:
        print(f"[Desktop] Port check error: {exc}")
        return False


def get_base_dir() -> Path:
    try:
        if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
            return Path(sys._MEIPASS)
        return Path(__file__).resolve().parent.parent
    except Exception as exc:
        print(f"[Desktop] Error resolving base dir: {exc}")
        return Path.cwd()


def resolve_target_url(base_dir: Path) -> str:
    try:
        is_dev_flag = "--dev" in sys.argv or os.getenv("EMRIS_ENV") == "development"
        vite_active = is_port_in_use(5173)

        if is_dev_flag or vite_active:
            print("[Desktop] Live server active: targeting http://localhost:5173")
            return "http://localhost:5173"

        dist_index = base_dir / "frontend" / "dist" / "index.html"
        if dist_index.exists():
            print(f"[Desktop] Production build found: targeting {dist_index}")
            return str(dist_index)

        return "http://localhost:5173"
    except Exception as exc:
        print(f"[Desktop] Error determining target URL: {exc}")
        return "http://localhost:5173"


def launch_desktop_window():
    try:
        base_dir = get_base_dir()
        target_url = resolve_target_url(base_dir)
        print(f"[Desktop] Launching Emris AI Desktop window: {target_url}")

        use_http_server = not target_url.startswith("http://") and not target_url.startswith("https://")
        bridge_api = DesktopBridge()

        window = webview.create_window(
            title="Emris AI Dekstop App — v1.1 Beta",
            url=target_url,
            width=1360,
            height=860,
            min_size=(960, 640),
            background_color="#131314",
            js_api=bridge_api
        )
        webview.start(http_server=use_http_server)
    except Exception as exc:
        print(f"[Desktop] Critical launcher error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    launch_desktop_window()
