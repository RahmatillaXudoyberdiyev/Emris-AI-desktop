import io
import os
import socket
import subprocess
import sys
import webbrowser
from pathlib import Path
import webview

project_root = Path(__file__).resolve().parent.parent
backend_dir = Path(__file__).resolve().parent
if getattr(sys, "frozen", False):
    if hasattr(sys, "_MEIPASS"):
        meipass_path = Path(sys._MEIPASS)
        if str(meipass_path) not in sys.path:
            sys.path.insert(0, str(meipass_path))
    exe_dir = Path(sys.executable).resolve().parent
    if str(exe_dir) not in sys.path:
        sys.path.insert(0, str(exe_dir))
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from backend.database import db
    from backend.terminal import execute_shell_command, stop_shell_process, get_active_shell_processes
    from backend.gateway import (
        get_device_quota,
        check_gateway_health,
        request_generate,
        get_persistent_device_id,
        fetch_remote_keys
    )
    from backend.agent import run_hierarchical_cycle, generate_conversation_title, run_conversational_cycle, inspect_command_failure, classify_workflow_intent
    from backend.server import start_local_api_server
except ImportError:
    from database import db
    from terminal import execute_shell_command, stop_shell_process, get_active_shell_processes
    from gateway import (
        get_device_quota,
        check_gateway_health,
        request_generate,
        get_persistent_device_id,
        fetch_remote_keys
    )
    from agent import run_hierarchical_cycle, generate_conversation_title, run_conversational_cycle, inspect_command_failure, classify_workflow_intent
    from server import start_local_api_server

if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()


os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = "--allow-insecure-localhost --disable-features=BlockInsecurePrivateNetworkRequests --disable-web-security"


def load_env_file():
    try:
        candidates = []
        if getattr(sys, "frozen", False):
            app_data = os.getenv("APPDATA")
            if app_data:
                candidates.append(Path(app_data) / "EmrisAI" / ".env")
            candidates.append(Path(sys.executable).resolve().parent / ".env")
        candidates.append(Path(__file__).resolve().parent.parent / ".env")
        for env_path in candidates:
            if env_path.exists():
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip())
                print(f"[Desktop] .env configuration loaded from: {env_path}")
                break
    except Exception as exc:
        print(f"[Desktop] Error loading .env: {exc}")


load_env_file()


def choose_folder_dialog():
    try:
        if sys.platform == "win32":
            cmd = [
                "powershell",
                "-NoProfile",
                "-Sta",
                "-NonInteractive",
                "-ExecutionPolicy", "Bypass",
                "-Command",
                "Add-Type -AssemblyName System.Windows.Forms; "
                "$d = New-Object System.Windows.Forms.FolderBrowserDialog; "
                "$d.Description = 'Select Project Folder'; "
                "$d.ShowNewFolderButton = $true; "
                "$f = New-Object System.Windows.Forms.Form; "
                "$f.TopMost = $true; "
                "$f.StartPosition = 'CenterScreen'; "
                "if ($d.ShowDialog($f) -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.SelectedPath) }; "
                "$f.Dispose(); $d.Dispose();"
            ]
            flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
            res = subprocess.run(cmd, capture_output=True, text=True, creationflags=flags, timeout=300)
            selected = res.stdout.strip()
            if selected and os.path.exists(selected):
                resolved = str(Path(selected).resolve())
                print(f"[Desktop] Selected directory via native dialog: {resolved}")
                return resolved
    except Exception as exc:
        print(f"[Desktop] Native folder dialog error: {exc}")

    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected = filedialog.askdirectory(parent=root, title="Select Project Folder")
        root.destroy()
        if selected:
            resolved = str(Path(selected).resolve())
            print(f"[Desktop] Selected directory via fallback: {resolved}")
            return resolved
        return None
    except Exception as exc:
        print(f"[Desktop] Folder dialog fallback error: {exc}")
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

    def create_conversation(self, title: str = "New chat", project_id: str = None, model: str = "Gemini 3.5 Flash Lite"):
        try:
            return db.create_conversation(title or "New chat", project_id, model)
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

    def truncate_messages_from(self, conversation_id: str, message_id: str):
        try:
            return db.truncate_messages_from(conversation_id, message_id)
        except Exception as exc:
            print(f"[Desktop] truncate_messages_from error: {exc}")
            return {"success": False, "error": str(exc)}

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

    def stop_command(self, process_id: str = None):
        try:
            return stop_shell_process(process_id)
        except Exception as exc:
            print(f"[Desktop] stop_command error: {exc}")
            return {"success": False, "error": str(exc)}

    def get_active_processes(self):
        try:
            return {"success": True, "processes": get_active_shell_processes()}
        except Exception as exc:
            print(f"[Desktop] get_active_processes error: {exc}")
            return {"success": False, "processes": []}

    def get_quota(self):
        try:
            return get_device_quota()
        except Exception as exc:
            print(f"[Desktop] get_quota error: {exc}")
            return {"error": str(exc)}

    def check_gateway_health(self):
        try:
            return check_gateway_health()
        except Exception as exc:
            print(f"[Desktop] check_gateway_health error: {exc}")
            return {"online": False, "error": str(exc)}

    def generate_ai(self, prompt: str, model: str = "gemini-3.5-flash-lite", history: list = None):
        try:
            return request_generate(prompt, model, history)
        except Exception as exc:
            print(f"[Desktop] generate_ai error: {exc}")
            return {"success": False, "error": str(exc)}

    def get_device_id(self):
        try:
            return get_persistent_device_id()
        except Exception as exc:
            print(f"[Desktop] get_device_id error: {exc}")
            return "unknown"

    def fetch_keys(self):
        try:
            return fetch_remote_keys()
        except Exception as exc:
            print(f"[Desktop] fetch_keys error: {exc}")
            return {"success": False, "error": str(exc)}

    def run_agent_workflow(self, prompt: str, workspace_root: str = None, model: str = "gemini-3.5-flash-lite", history: list = None):
        try:
            return run_hierarchical_cycle(prompt, workspace_root, model, history)
        except Exception as exc:
            print(f"[Desktop] run_agent_workflow error: {exc}")
            return {"success": False, "error": str(exc)}

    def run_conversation(self, prompt: str, history: list = None, model: str = "gemini-3.5-flash-lite"):
        try:
            return run_conversational_cycle(prompt, history, model)
        except Exception as exc:
            print(f"[Desktop] run_conversation error: {exc}")
            return {"success": False, "response": f"Xatolik: {str(exc)}"}

    def classify_workflow(self, prompt: str, has_project: bool = True, project_name: str = None):
        try:
            return classify_workflow_intent(prompt, has_project, project_name)
        except Exception as exc:
            print(f"[Desktop] classify_workflow error: {exc}")
            return {"success": True, "workflow": "work" if has_project else "conversation"}

    def inspect_command_error(self, command: str, cwd: str = None, exit_code: int = -1, stdout: str = "", stderr: str = "", workspace_root: str = None):
        try:
            return inspect_command_failure(command, cwd, exit_code, stdout, stderr, workspace_root)
        except Exception as exc:
            print(f"[Desktop] inspect_command_error: {exc}")
            return {"success": False, "diagnosis": f"Command failed with code {exit_code}.", "suggested_command": "", "action": "retry"}

    def generate_title(self, prompt: str):
        try:
            return generate_conversation_title(prompt)
        except Exception as exc:
            print(f"[Desktop] generate_title error: {exc}")
            return {"success": False, "title": "New Conversation", "error": str(exc)}

    def list_directory_files(self, folder_path: str):
        try:
            if not folder_path or not os.path.exists(folder_path):
                return {"success": False, "error": "Directory does not exist", "tree": []}

            def scan_dir(p):
                items = []
                try:
                    entries = sorted(os.scandir(p), key=lambda e: (not e.is_dir(), e.name.lower()))
                    for entry in entries:
                        if entry.name.startswith(".") or entry.name in ("__pycache__", "node_modules", ".venv", "venv", "gemini_logs", "dist"):
                            continue
                        rel = os.path.relpath(entry.path, folder_path).replace("\\", "/")
                        item = {
                            "name": entry.name,
                            "path": rel,
                            "is_dir": entry.is_dir()
                        }
                        if entry.is_dir():
                            item["children"] = scan_dir(entry.path)
                        else:
                            try:
                                item["size"] = entry.stat().st_size
                            except Exception:
                                item["size"] = 0
                        items.append(item)
                except Exception as scan_err:
                    print(f"[Desktop] scan_dir error: {scan_err}")
                return items

            tree = scan_dir(folder_path)
            return {"success": True, "tree": tree, "root_name": os.path.basename(folder_path) or folder_path}
        except Exception as exc:
            print(f"[Desktop] list_directory_files error: {exc}")
            return {"success": False, "error": str(exc), "tree": []}

    def read_file_content(self, folder_path: str, relative_path: str):
        try:
            if not folder_path or not relative_path:
                return {"success": False, "error": "Invalid arguments", "content": ""}
            base = Path(folder_path).resolve()
            target = (base / relative_path).resolve()
            if not str(target).startswith(str(base)):
                return {"success": False, "error": "Access denied outside workspace", "content": ""}
            if not target.exists() or not target.is_file():
                return {"success": False, "error": "File does not exist", "content": ""}
            with open(target, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return {"success": True, "content": content, "path": relative_path}
        except Exception as exc:
            print(f"[Desktop] read_file_content error: {exc}")
            return {"success": False, "error": str(exc), "content": ""}


    def update_conversation_title(self, conversation_id: str, title: str):
        try:
            return db.update_conversation_title(conversation_id, title)
        except Exception as exc:
            print(f"[Desktop] update_conversation_title error: {exc}")
            return False


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
        if getattr(sys, "frozen", False):
            if hasattr(sys, "_MEIPASS"):
                return Path(sys._MEIPASS)
            return Path(sys.executable).resolve().parent
        return Path(__file__).resolve().parent.parent
    except Exception as exc:
        print(f"[Desktop] Error resolving base dir: {exc}")
        return Path.cwd()


def resolve_target_url(base_dir: Path) -> str:
    try:
        is_dev_flag = "--dev" in sys.argv or os.getenv("EMRIS_ENV") == "development"
        if is_dev_flag and is_port_in_use(5173, "127.0.0.1"):
            print("[Desktop] Live server active: targeting http://127.0.0.1:5173")
            return "http://127.0.0.1:5173"

        dist_index = base_dir / "frontend" / "dist" / "index.html"
        if dist_index.exists():
            print(f"[Desktop] Production build found: targeting {dist_index}")
            return str(dist_index)

        exe_dist_index = Path(sys.executable).resolve().parent / "frontend" / "dist" / "index.html"
        if exe_dist_index.exists():
            print(f"[Desktop] Production build found at executable: targeting {exe_dist_index}")
            return str(exe_dist_index)

        if is_port_in_use(5173, "127.0.0.1"):
            return "http://127.0.0.1:5173"

        return "http://127.0.0.1:8765"
    except Exception as exc:
        print(f"[Desktop] Error determining target URL: {exc}")
        return "http://127.0.0.1:8765"


def launch_desktop_window():
    try:
        base_dir = get_base_dir()
        target_url = resolve_target_url(base_dir)
        print(f"[Desktop] Launching Emris AI Desktop window: {target_url}")

        start_local_api_server(8765)
        bridge_api = DesktopBridge()

        window = webview.create_window(
            title="Emris AI Desktop App — v1.2 Beta",
            url=target_url,
            width=1360,
            height=860,
            min_size=(960, 640),
            background_color="#131314",
            js_api=bridge_api
        )
        webview.start(http_server=False)
    except Exception as exc:
        print(f"[Desktop] Critical launcher error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    launch_desktop_window()
