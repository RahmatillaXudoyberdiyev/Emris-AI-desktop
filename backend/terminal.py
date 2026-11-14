import os
import re
import socket
import subprocess
import threading
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
    r"\bnpm\s+(?:run\s+)?dev\b",
    r"\bnpm\s+start\b",
    r"\bpnpm\s+(?:run\s+)?dev\b",
    r"\bpnpm\s+start\b",
    r"\byarn\s+dev\b",
    r"\byarn\s+start\b",
    r"\bbun\s+(?:run\s+)?dev\b",
    r"\bnext\s+dev\b",
    r"\bnext\s+start\b",
    r"\bvite\b",
    r"\bhttp\.server\b",
    r"\buvicorn\b",
    r"\bgunicorn\b",
    r"\bflask\s+run\b",
    r"\bstreamlit\s+run\b",
    r"\b(?:node|nodemon)\s+(?:.*[/\\])?(?:server|app|index|main)\.js\b",
    r"\bpython(?:\.exe)?\s+(?:.*[/\\])?(?:app|main|server|run|manage|bot|start|web|api)\.py\b",
    r"\bpython(?:\.exe)?\s+-m\s+(?:flask|http\.server|uvicorn|streamlit)\b",
    r"\b(?:live-server|serve|nodemon)\b",
    r"\b(?:cargo|dotnet|go)\s+run\b",
    r"\brunserver\b",
    r"--reload\b",
    r"--watch\b"
]

SUPERVISED_COMMAND_PATTERNS = [
    r"\b(?:pip|npm|pnpm|yarn|bun|poetry)\s+(?:install|add|remove|uninstall|update)\b",
    r"\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?build\b",
    r"\b(?:pytest|jest|vitest|test|unittest)\b",
    r"\b(?:tsc|next\s+build|vite\s+build|webpack|cargo\s+build|go\s+build|make)\b",
    r"\b(?:migrate|makemigrations|alembic)\b",
    r"\bgit\s+(?:clone|pull|push|commit|add|status|diff|checkout|branch)\b",
]

active_processes = {}
user_stopped_pids = set()
background_errors = {}


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


def classify_command_supervision(command: str) -> dict:
    try:
        lower = command.lower().strip()
        is_explicit_bg = False
        if lower.startswith("start ") or lower.startswith("$start ") or "cmd /c start " in lower or lower.startswith("& "):
            is_explicit_bg = True

        for pat in SUPERVISED_COMMAND_PATTERNS:
            if re.search(pat, lower):
                return {"is_daemon": False, "requires_supervision": True}

        if is_explicit_bg:
            return {"is_daemon": True, "requires_supervision": False}

        for pat in DAEMON_COMMAND_PATTERNS:
            if re.search(pat, lower):
                return {"is_daemon": True, "requires_supervision": False}

        if lower.startswith("python") and any(k in lower for k in [".py"]):
            return {"is_daemon": True, "requires_supervision": False}

        return {"is_daemon": False, "requires_supervision": True}
    except Exception as exc:
        print(f"[Terminal] classify_command_supervision error: {exc}")
        return {"is_daemon": False, "requires_supervision": True}


def is_daemon_command(command: str) -> bool:
    try:
        res = classify_command_supervision(command)
        return bool(res.get("is_daemon", False))
    except Exception:
        return False


def _start_process_stream_readers(process, pid_key: str):
    def read_stream(stream, target_list):
        try:
            for line in iter(stream.readline, ""):
                if not line:
                    break
                clean_line = line.rstrip()
                target_list.append(clean_line)
                if len(target_list) > 300:
                    del target_list[0:50]
        except Exception:
            pass
        finally:
            try:
                stream.close()
            except Exception:
                pass

    process._stdout_lines = []
    process._stderr_lines = []
    t1 = threading.Thread(target=read_stream, args=(process.stdout, process._stdout_lines), daemon=True)
    t2 = threading.Thread(target=read_stream, args=(process.stderr, process._stderr_lines), daemon=True)
    t1.start()
    t2.start()

    def monitor_crash():
        try:
            process.wait()
            active_processes.pop(pid_key, None)
            is_user_stopped = getattr(process, "_stopped_by_user", False) or str(process.pid) in user_stopped_pids or pid_key in user_stopped_pids
            if not is_user_stopped:
                rc = process.returncode
                if rc is not None and rc != 0:
                    err_text = "\n".join(process._stderr_lines[-30:]) or "\n".join(process._stdout_lines[-30:])
                    print(f"[Terminal Bot] Background task PID {process.pid} exited with error code {rc}")
                    background_errors[pid_key] = {
                        "pid": process.pid,
                        "command": getattr(process, "_raw_cmd", ""),
                        "cwd": getattr(process, "_raw_cwd", ""),
                        "exit_code": rc,
                        "error": err_text or f"Process exited unexpectedly with code {rc}",
                        "timestamp": time.time()
                    }
        except Exception as exc:
            print(f"[Terminal Bot] Monitor crash error: {exc}")

    m_thread = threading.Thread(target=monitor_crash, daemon=True)
    m_thread.start()


def get_background_task_errors() -> list:
    try:
        return list(background_errors.values())
    except Exception as exc:
        print(f"[Terminal] get_background_task_errors error: {exc}")
        return []


def clear_background_error(process_id: str = None) -> bool:
    try:
        if process_id:
            background_errors.pop(str(process_id), None)
        else:
            background_errors.clear()
        return True
    except Exception as exc:
        print(f"[Terminal] clear_background_error error: {exc}")
        return False


def stop_shell_process(process_id: str = None) -> dict:
    try:
        stopped = []
        target_keys = [str(process_id)] if process_id and str(process_id) in active_processes else list(active_processes.keys())
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        for pid_key in target_keys:
            proc = active_processes.get(pid_key)
            if proc:
                try:
                    proc._stopped_by_user = True
                    user_stopped_pids.add(str(proc.pid))
                    user_stopped_pids.add(str(pid_key))
                    subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, capture_output=True, creationflags=flags)
                    stopped.append(pid_key)
                except Exception as k_err:
                    print(f"[Terminal] Kill error on PID {proc.pid}: {k_err}")
                active_processes.pop(pid_key, None)
                background_errors.pop(pid_key, None)
        print(f"[Terminal] Stopped active processes by user: {stopped}")
        return {"success": True, "stopped": stopped, "stopped_by_user": True}
    except Exception as exc:
        print(f"[Terminal] stop_shell_process error: {exc}")
        return {"success": False, "error": str(exc), "stopped_by_user": False}


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
                    "start_time": getattr(proc, "_start_time", time.time()),
                    "is_daemon": getattr(proc, "_is_daemon", False),
                    "requires_supervision": getattr(proc, "_requires_supervision", False)
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
                "exit_code": -1,
                "stopped_by_user": False
            }

        target_cwd = cwd if cwd and os.path.exists(cwd) else os.getcwd()
        raw_cmd = command.strip()
        cmd_to_run, explicit_bg = normalize_command(raw_cmd)
        cmd_to_run, proc_env = prepare_virtualenv_execution(cmd_to_run, target_cwd)
        mode = classify_command_supervision(cmd_to_run)
        is_daemon = explicit_bg or mode.get("is_daemon", False)
        requires_supervision = mode.get("requires_supervision", True) and not explicit_bg

        if is_daemon:
            for existing_pid in list(active_processes.keys()):
                old_proc = active_processes.get(existing_pid)
                if old_proc and old_proc.poll() is None:
                    old_cwd = getattr(old_proc, "_raw_cwd", "")
                    if target_cwd and old_cwd and os.path.abspath(old_cwd) == os.path.abspath(target_cwd):
                        print(f"[Terminal] Stopping previous background process PID {old_proc.pid} in [{target_cwd}] before re-running...")
                        stop_shell_process(existing_pid)

            if os.name == "nt":
                try:
                    script_match = re.search(r"([a-zA-Z0-9_\-]+\.py|[a-zA-Z0-9_\-]+\.js)", cmd_to_run)
                    script_name = script_match.group(1) if script_match else None
                    if script_name:
                        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
                        ps_kill = f"Get-CimInstance Win32_Process | Where-Object {{ ($_.CommandLine -like '*{script_name}*') -and ($_.ProcessId -ne {os.getpid()}) }} | ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force }}"
                        subprocess.run(["powershell", "-NoProfile", "-Command", ps_kill], capture_output=True, timeout=5, creationflags=flags)
                except Exception as k_err:
                    print(f"[Terminal] Process cleanup error: {k_err}")

            time.sleep(1.2)

        print(f"[Terminal] Executing command in [{target_cwd}]: {cmd_to_run} (daemon: {is_daemon}, supervised: {requires_supervision})")

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
        process._is_daemon = is_daemon
        process._requires_supervision = requires_supervision
        process._stopped_by_user = False
        pid_key = str(process.pid)
        active_processes[pid_key] = process

        if is_daemon:
            _start_process_stream_readers(process, pid_key)
            time.sleep(1.8)
            poll_res = process.poll()
            if poll_res is None:
                print(f"[Terminal] Background task active (PID {process.pid}): {cmd_to_run} (unsupervised)")
                initial_out = "\n".join(process._stdout_lines[-10:])
                return {
                    "success": True,
                    "stdout": (f"Background process active (PID: {process.pid})\nCommand: {cmd_to_run}\n" + (f"\n{initial_out}" if initial_out else "")).strip(),
                    "stderr": "",
                    "exit_code": 0,
                    "process_id": pid_key,
                    "is_running": True,
                    "is_daemon": True,
                    "requires_supervision": False,
                    "stopped_by_user": False
                }
            else:
                active_processes.pop(pid_key, None)
                out = "\n".join(process._stdout_lines)
                err = "\n".join(process._stderr_lines)
                was_stopped = getattr(process, "_stopped_by_user", False) or pid_key in user_stopped_pids or str(process.pid) in user_stopped_pids
                if was_stopped:
                    return {
                        "success": True,
                        "stdout": "Process stopped by user.",
                        "stderr": "",
                        "exit_code": 0,
                        "process_id": pid_key,
                        "is_running": False,
                        "stopped_by_user": True
                    }
                return {
                    "success": process.returncode == 0,
                    "stdout": out.strip(),
                    "stderr": err.strip(),
                    "exit_code": process.returncode,
                    "process_id": pid_key,
                    "is_running": False,
                    "is_daemon": True,
                    "requires_supervision": False,
                    "stopped_by_user": False
                }

        stdout, stderr = process.communicate(timeout=timeout)
        active_processes.pop(pid_key, None)
        was_stopped = getattr(process, "_stopped_by_user", False) or pid_key in user_stopped_pids or str(process.pid) in user_stopped_pids
        if was_stopped:
            return {
                "success": True,
                "stdout": "Process stopped by user.",
                "stderr": "",
                "exit_code": 0,
                "process_id": pid_key,
                "is_running": False,
                "stopped_by_user": True
            }

        stdout = stdout or ""
        stderr = stderr or ""
        print(f"[Terminal] Supervised command completed with exit code: {process.returncode}")

        return {
            "success": process.returncode == 0,
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": process.returncode,
            "process_id": pid_key,
            "is_running": False,
            "is_daemon": False,
            "requires_supervision": True,
            "stopped_by_user": False
        }
    except subprocess.TimeoutExpired:
        print(f"[Terminal] Command timed out after {timeout} seconds: {command}")
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Execution timed out ({timeout}s)",
            "exit_code": 124,
            "stopped_by_user": False
        }
    except Exception as exc:
        print(f"[Terminal] Execution error: {exc}")
        return {
            "success": False,
            "stdout": "",
            "stderr": str(exc),
            "exit_code": -1,
            "stopped_by_user": False
        }
