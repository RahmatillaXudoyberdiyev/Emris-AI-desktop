import os
import re
import socket
import subprocess
import time
from pathlib import Path


DISALLOWED_COMMAND_PATTERNS = [
    r"\bformat\b",
    r"\bshutdown\b",
    r"\bdiskpart\b",
    r"\breg\s+delete\b",
    r"\bdel\s+.*[c-zC-Z]:\\",
    r"\brmdir\s+.*[c-zC-Z]:\\",
    r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;",
]

DAEMON_COMMAND_PATTERNS = [
    r"\bnpm\s+run\s+dev\b",
    r"\bnpm\s+start\b",
    r"\bpnpm\s+(?:run\s+)?dev\b",
    r"\bpnpm\s+start\b",
    r"\byarn\s+dev\b",
    r"\byarn\s+start\b",
    r"\bbun\s+(?:run\s+)?dev\b",
    r"\bnext\s+dev\b",
    r"\bvite\b",
    r"\bhttp\.server\b",
    r"\buvicorn\b",
    r"\bgunicorn\b",
    r"\bflask\s+run\b",
    r"\bpython(?:\.exe)?\s+(?:.*[/\\])?(?:app|main|server|run|manage)\.py\b",
    r"\bpython(?:\.exe)?\s+-m\s+(?:flask|http\.server|uvicorn)\b",
    r"\b(?:live-server|serve|nodemon)\b",
]

active_processes = {}


def normalize_command(command: str) -> tuple[str, bool]:
    clean = command.strip()
    is_explicit_bg = False
    lower = clean.lower()
    if lower.startswith("$start ") or lower.startswith("start "):
        clean = re.sub(r"^\$?start\s+", "", clean, flags=re.IGNORECASE).strip()
        is_explicit_bg = True
    elif clean.startswith("$"):
        clean = clean[1:].strip()
    elif re.match(r"^cmd(?:\.exe)?\s+/c\s+start\s+", clean, re.IGNORECASE):
        clean = re.sub(r"^cmd(?:\.exe)?\s+/c\s+start\s+", "", clean, flags=re.IGNORECASE).strip()
        is_explicit_bg = True
    return clean, is_explicit_bg


def prepare_virtualenv_execution(command: str, cwd: str) -> tuple[str, dict]:
    env = os.environ.copy()
    if not cwd or not os.path.exists(cwd):
        return command, env
    root = Path(cwd).resolve()
    venv_dir = None
    scripts_dir = None

    search_dirs = [root] + list(root.parents)[:3]
    for s_dir in search_dirs:
        for name in [".venv", "venv", "env"]:
            cand = s_dir / name
            if cand.exists() and cand.is_dir():
                s_scripts = cand / ("Scripts" if os.name == "nt" else "bin")
                if s_scripts.exists():
                    venv_dir = cand
                    scripts_dir = s_scripts
                    break
        if venv_dir:
            break

    if not venv_dir or not scripts_dir:
        return command, env

    env["PATH"] = str(scripts_dir) + os.pathsep + env.get("PATH", "")
    env["VIRTUAL_ENV"] = str(venv_dir)

    rewritten = command.strip()
    sep = "\\" if os.name == "nt" else "/"

    for tool in ["python", "pip", "flask", "pytest", "uvicorn"]:
        pat = rf"^\$?{tool}(?:\.exe)?(\s+.*|$)"
        m = re.match(pat, rewritten, re.IGNORECASE)
        if m:
            rest = m.group(1)
            tool_exe = scripts_dir / (f"{tool}.exe" if os.name == "nt" else tool)
            if tool_exe.exists():
                try:
                    rel_to_cwd = os.path.relpath(str(tool_exe), str(root))
                    if not rel_to_cwd.startswith("."):
                        rel_to_cwd = f".{sep}{rel_to_cwd}"
                    rewritten = f"{rel_to_cwd}{rest}"
                except Exception:
                    rewritten = f'"{str(tool_exe)}"{rest}'
            break
    return rewritten, env


def is_command_safe(command: str) -> tuple[bool, str]:
    try:
        lower_cmd = command.lower().strip()
        for pattern in DISALLOWED_COMMAND_PATTERNS:
            if re.search(pattern, lower_cmd):
                return False, f"Command contains restricted pattern: {pattern}"
        return True, "Safe"
    except Exception as exc:
        print(f"[Security] Command safety validation failed: {exc}")
        return False, str(exc)


def is_path_jailed(target_path: str, workspace_root: str) -> bool:
    try:
        if not workspace_root:
            return True
        target = Path(target_path).resolve()
        root = Path(workspace_root).resolve()
        return root == target or root in target.parents
    except Exception as exc:
        print(f"[Security] Path verification failed: {exc}")
        return False


def is_daemon_command(command: str) -> bool:
    try:
        lower = command.lower().strip()
        if lower.startswith("start ") or lower.startswith("$start "):
            return True
        if any(re.search(pat, lower) for pat in DAEMON_COMMAND_PATTERNS):
            return True
        if re.search(r"\bpython(?:\.exe)?\s+\S+\.py\b", lower) and any(k in lower for k in ["app.py", "server.py", "main.py", "runserver"]):
            return True
        return False
    except Exception:
        return False


def stop_shell_process(process_id: str = None) -> dict:
    try:
        stopped = []
        target_keys = [process_id] if process_id and process_id in active_processes else list(active_processes.keys())
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        for pid_key in target_keys:
            proc = active_processes.get(pid_key)
            if proc:
                try:
                    subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, capture_output=True, creationflags=flags)
                    stopped.append(pid_key)
                except Exception as k_err:
                    print(f"[Terminal] Kill error on PID {proc.pid}: {k_err}")
                active_processes.pop(pid_key, None)
        print(f"[Terminal] Stopped active processes: {stopped}")
        return {"success": True, "stopped": stopped}
    except Exception as exc:
        print(f"[Terminal] stop_shell_process error: {exc}")
        return {"success": False, "error": str(exc)}


def check_local_port_active(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.12)
            return s.connect_ex(("127.0.0.1", port)) == 0
    except Exception:
        return False


def get_workspace_background_context(workspace_root: str = None) -> str:
    try:
        active_procs = get_active_shell_processes()
        lines = []
        if active_procs:
            for p in active_procs:
                lines.append(f"- Active Process PID {p.get('pid')}: `{p.get('command')}` (CWD: `{p.get('cwd')}`)")

        common_ports = [
            (5000, "Flask / Web Application"),
            (8000, "Uvicorn / FastAPI / HTTP Server"),
            (3000, "Next.js / Node Server"),
            (5173, "Vite Dev Server"),
            (8080, "Web Server")
        ]
        listening = []
        for port, service in common_ports:
            if check_local_port_active(port):
                listening.append(f"- Listening Service on port {port}: {service} (http://127.0.0.1:{port})")

        if not lines and not listening:
            return "No background tasks or server processes currently running in this workspace."

        result = []
        if lines:
            result.append("ACTIVE BACKGROUND SHELL PROCESSES:\n" + "\n".join(lines))
        if listening:
            result.append("ACTIVE LOCAL NETWORK SERVICES:\n" + "\n".join(listening))
        return "\n\n".join(result)
    except Exception as exc:
        print(f"[Terminal] get_workspace_background_context error: {exc}")
        return "No background tasks currently running."


def get_active_shell_processes() -> list:
    try:
        active = []
        for pid_key in list(active_processes.keys()):
            proc = active_processes.get(pid_key)
            if proc and proc.poll() is None:
                active.append({
                    "process_id": pid_key,
                    "pid": proc.pid,
                    "command": getattr(proc, "_raw_cmd", f"PID {proc.pid}"),
                    "cwd": getattr(proc, "_raw_cwd", ""),
                    "start_time": getattr(proc, "_start_time", time.time())
                })
            elif proc:
                active_processes.pop(pid_key, None)
        return active
    except Exception as exc:
        print(f"[Terminal] get_active_shell_processes error: {exc}")
        return []


def execute_shell_command(command: str, cwd: str = None, timeout: int = 60) -> dict:
    try:
        safe, reason = is_command_safe(command)
        if not safe:
            print(f"[Terminal] Execution blocked: {reason}")
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Security restriction: {reason}",
                "exit_code": -1
            }

        target_cwd = cwd if cwd and os.path.exists(cwd) else os.getcwd()
        raw_cmd = command.strip()
        cmd_to_run, explicit_bg = normalize_command(raw_cmd)
        cmd_to_run, proc_env = prepare_virtualenv_execution(cmd_to_run, target_cwd)
        is_daemon = explicit_bg or is_daemon_command(cmd_to_run)

        print(f"[Terminal] Executing command in [{target_cwd}]: {cmd_to_run} (daemon: {is_daemon})")

        creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        process = subprocess.Popen(
            cmd_to_run,
            shell=True,
            cwd=target_cwd,
            env=proc_env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=creationflags
        )
        process._raw_cmd = raw_cmd
        process._raw_cwd = target_cwd
        process._start_time = time.time()
        pid_key = str(process.pid)
        active_processes[pid_key] = process

        if is_daemon:
            time.sleep(1.5)
            if process.poll() is None:
                print(f"[Terminal] Background task active (PID {process.pid}): {cmd_to_run}")
                return {
                    "success": True,
                    "stdout": f"Background process active (PID: {process.pid})\nCommand: {cmd_to_run}\nWorking Directory: {target_cwd}",
                    "stderr": "",
                    "exit_code": 0,
                    "process_id": pid_key,
                    "is_running": True
                }
            else:
                out, err = process.communicate()
                active_processes.pop(pid_key, None)
                return {
                    "success": process.returncode == 0,
                    "stdout": (out or "").strip(),
                    "stderr": (err or "").strip(),
                    "exit_code": process.returncode,
                    "process_id": pid_key,
                    "is_running": False
                }

        stdout, stderr = process.communicate(timeout=timeout)
        active_processes.pop(pid_key, None)
        stdout = stdout or ""
        stderr = stderr or ""
        print(f"[Terminal] Command completed with exit code: {process.returncode}")

        return {
            "success": process.returncode == 0,
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": process.returncode,
            "process_id": pid_key,
            "is_running": False
        }
    except subprocess.TimeoutExpired:
        print(f"[Terminal] Command timed out after {timeout} seconds: {command}")
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Execution timed out ({timeout}s)",
            "exit_code": 124
        }
    except Exception as exc:
        print(f"[Terminal] Execution error: {exc}")
        return {
            "success": False,
            "stdout": "",
            "stderr": str(exc),
            "exit_code": -1
        }
