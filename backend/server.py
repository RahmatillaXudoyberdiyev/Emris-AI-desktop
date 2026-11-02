import json
import os
import sys
import urllib.parse
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading

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
    from backend.agent import run_hierarchical_cycle, generate_conversation_title, run_conversational_cycle, inspect_command_failure, classify_workflow_intent
    from backend.database import db
    from backend.terminal import execute_shell_command, stop_shell_process, get_active_shell_processes
    from backend.gateway import get_device_quota, check_gateway_health, request_generate, get_persistent_device_id, fetch_remote_keys
except ImportError:
    from agent import run_hierarchical_cycle, generate_conversation_title, run_conversational_cycle, inspect_command_failure, classify_workflow_intent
    from database import db
    from terminal import execute_shell_command, stop_shell_process, get_active_shell_processes
    from gateway import get_device_quota, check_gateway_health, request_generate, get_persistent_device_id, fetch_remote_keys

class ApiRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def _send_json(self, data, status=200):
        try:
            payload = json.dumps(data).encode("utf-8")
            self.send_response(status)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except Exception as exc:
            print(f"[Server] Send JSON error: {exc}")

    def _read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw = self.rfile.read(content_length).decode("utf-8")
                return json.loads(raw)
            return {}
        except Exception as exc:
            print(f"[Server] Read body error: {exc}")
            return {}

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            params = urllib.parse.parse_qs(parsed.query)

            if path == "/api/health":
                self._send_json({"status": "ok", "service": "Emris AI Local API"})
                return

            if path == "/api/active_processes":
                procs = get_active_shell_processes()
                self._send_json({"success": True, "processes": procs})
                return

            if path == "/api/projects":
                projects = db.get_projects()
                self._send_json(projects)
                return

            if path == "/api/conversations":
                project_id = params.get("project_id", [None])[0]
                conversations = db.get_conversations(project_id)
                self._send_json(conversations)
                return

            if path == "/api/messages":
                conv_id = params.get("conversation_id", [None])[0]
                msgs = db.get_messages(conv_id) if conv_id else []
                self._send_json(msgs)
                return

            if path == "/api/list_files":
                folder_path = params.get("path", [""])[0]
                if not folder_path or not os.path.exists(folder_path):
                    self._send_json({"success": False, "error": "Folder not found", "tree": []})
                    return

                def scan_dir(p):
                    nodes = []
                    try:
                        for entry in sorted(os.scandir(p), key=lambda e: (not e.is_dir(), e.name.lower())):
                            if entry.name.startswith(".") or entry.name in ("__pycache__", "node_modules", ".venv"):
                                continue
                            node = {
                                "name": entry.name,
                                "path": os.path.relpath(entry.path, folder_path).replace("\\", "/"),
                                "is_dir": entry.is_dir()
                            }
                            if entry.is_dir():
                                node["children"] = scan_dir(entry.path)
                            else:
                                node["size"] = entry.stat().st_size
                            nodes.append(node)
                    except Exception as err:
                        print(f"[Server] Scan error: {err}")
                    return nodes

                tree = scan_dir(folder_path)
                self._send_json({"success": True, "root_name": os.path.basename(folder_path), "tree": tree})
                return

            if path == "/api/read_file":
                folder = params.get("path", [""])[0]
                rel = params.get("file", [""])[0]
                target = os.path.normpath(os.path.join(folder, rel))
                if not target.startswith(os.path.abspath(folder)) or not os.path.exists(target):
                    self._send_json({"success": False, "error": "File not found"})
                    return
                with open(target, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                self._send_json({"success": True, "content": content})
                return

            dist_root = project_root / "frontend" / "dist"
            if dist_root.exists():
                rel_path = path.lstrip("/")
                target_file = (dist_root / rel_path).resolve()
                if not target_file.exists() or target_file.is_dir():
                    target_file = dist_root / "index.html"
                if target_file.exists() and str(target_file).startswith(str(dist_root.resolve())):
                    mime_types = {
                        ".html": "text/html",
                        ".js": "application/javascript",
                        ".css": "text/css",
                        ".svg": "image/svg+xml",
                        ".png": "image/png",
                        ".ico": "image/x-icon",
                        ".json": "application/json"
                    }
                    content_type = mime_types.get(target_file.suffix.lower(), "application/octet-stream")
                    with open(target_file, "rb") as sf:
                        payload = sf.read()
                    self.send_response(200)
                    self._send_cors_headers()
                    self.send_header("Content-Type", content_type)
                    self.send_header("Content-Length", str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                    return

            self._send_json({"error": "Endpoint not found"}, status=404)
        except Exception as exc:
            print(f"[Server] GET error: {exc}")
            self._send_json({"error": str(exc)}, status=500)

    def do_POST(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            body = self._read_json_body()

            if path == "/api/run_agent_stream":
                prompt = body.get("prompt", "")
                workspace = body.get("workspace_root")
                model = body.get("model", "gemini-3.5-flash-lite")
                history = body.get("history", [])

                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "keep-alive")
                self.end_headers()

                def send_sse(evt_data):
                    try:
                        line = f"data: {json.dumps(evt_data)}\n\n"
                        self.wfile.write(line.encode("utf-8"))
                        self.wfile.flush()
                    except Exception as sse_err:
                        print(f"[Server] SSE push notice: {sse_err}")

                result = run_hierarchical_cycle(prompt, workspace, model, history, event_callback=send_sse)
                send_sse({"type": "done", "result": result})
                return

            if path in ("/api/run_workflow", "/api/run_agent_workflow"):
                prompt = body.get("prompt", "")
                workspace = body.get("workspace_root")
                model = body.get("model", "gemini-3.5-flash-lite")
                history = body.get("history", [])
                result = run_hierarchical_cycle(prompt, workspace, model, history)
                self._send_json(result)
                return

            if path == "/api/run_conversation":
                prompt = body.get("prompt", "")
                history = body.get("history", [])
                model = body.get("model", "gemini-3.5-flash-lite")
                result = run_conversational_cycle(prompt, history, model)
                self._send_json(result)
                return

            if path == "/api/classify_workflow":
                prompt = body.get("prompt", "")
                has_proj = body.get("has_project", True)
                proj_name = body.get("project_name")
                result = classify_workflow_intent(prompt, has_proj, proj_name)
                self._send_json(result)
                return

            if path == "/api/inspect_error":
                cmd = body.get("command", "")
                cwd = body.get("cwd")
                exit_code = body.get("exit_code", -1)
                stdout = body.get("stdout", "")
                stderr = body.get("stderr", "")
                workspace = body.get("workspace_root")
                result = inspect_command_failure(cmd, cwd, exit_code, stdout, stderr, workspace)
                self._send_json(result)
                return

            if path == "/api/generate_title":
                prompt = body.get("prompt", "")
                result = generate_conversation_title(prompt)
                self._send_json(result)
                return

            if path == "/api/projects":
                name = body.get("name", "")
                folder = body.get("path", "")
                proj = db.create_project(name, folder)
                self._send_json(proj)
                return

            if path == "/api/conversations":
                title = body.get("title", "New chat")
                proj_id = body.get("project_id")
                model = body.get("model", "gemini-3.5-flash-lite")
                conv = db.create_conversation(title, proj_id, model)
                self._send_json(conv)
                return

            if path == "/api/update_title":
                conv_id = body.get("conversation_id")
                title = body.get("title", "")
                db.update_conversation_title(conv_id, title)
                self._send_json({"success": True})
                return

            if path == "/api/messages":
                conv_id = body.get("conversation_id")
                role = body.get("role", "user")
                content = body.get("content", "")
                msg = db.add_message(conv_id, role, content)
                self._send_json(msg)
                return

            if path == "/api/truncate_messages":
                conv_id = body.get("conversation_id")
                msg_id = body.get("message_id")
                res = db.truncate_messages_from(conv_id, msg_id)
                self._send_json(res)
                return

            if path == "/api/run_command":
                cmd = body.get("command", "")
                cwd = body.get("cwd")
                out = execute_shell_command(cmd, cwd)
                self._send_json(out)
                return

            if path == "/api/stop_command":
                pid = body.get("process_id")
                out = stop_shell_process(pid)
                self._send_json(out)
                return

            self._send_json({"error": "Endpoint not found"}, status=404)
        except Exception as exc:
            print(f"[Server] POST error: {exc}")
            self._send_json({"error": str(exc)}, status=500)

    def log_message(self, format, *args):
        pass


def start_local_api_server(port=8765):
    try:
        server = ThreadingHTTPServer(("127.0.0.1", port), ApiRequestHandler)
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        print(f"[Server] Local HTTP API server listening at http://127.0.0.1:{port}")
        return server
    except Exception as exc:
        print(f"[Server] Failed to start local server on port {port}: {exc}")
        return None

if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8765), ApiRequestHandler)
    print("[Server] Standalone Local HTTP API server listening at http://127.0.0.1:8765")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[Server] Server stopped.")
