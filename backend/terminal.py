import os
import re
import socket
import subprocess
import threading
import time
from pathlib import Path
from backend.process_manager import default_process_manager


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
    if "-m venv" in rewritten.lower():
        return command, env
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


def get_background_task_errors() -> list:
    return default_process_manager.get_background_errors()


def clear_background_error(process_id: str = None) -> bool:
    return default_process_manager.clear_background_error(process_id)


def stop_shell_process(process_id: str = None) -> dict:
    return default_process_manager.stop_process(process_id)


def check_local_port_active(port: int) -> bool:
    return default_process_manager.check_port_active(port)


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
            if default_process_manager.check_port_active(port):
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
    return default_process_manager.get_active_processes()


def detect_target_port(command: str) -> int:
    m = re.search(r"--port(?:=|\s+)(\d+)", command, re.IGNORECASE)
    if m:
        return int(m.group(1))
    m = re.search(r"-p\s+(\d+)", command, re.IGNORECASE)
    if m:
        return int(m.group(1))
    if "5000" in command or "flask" in command.lower():
        return 5000
    if "8000" in command or "uvicorn" in command.lower() or "fastapi" in command.lower():
        return 8000
    if "3000" in command or "next" in command.lower():
        return 3000
    if "5173" in command or "vite" in command.lower():
        return 5173
    return None


def execute_shell_command(command: str, cwd: str = None, timeout: int = 120) -> dict:
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

        target_port = detect_target_port(cmd_to_run)

        print(f"[Terminal] Executing command in [{target_cwd}]: {cmd_to_run} (daemon: {is_daemon}, supervised: {requires_supervision})")

        if is_daemon:
            return default_process_manager.start_daemon(cmd_to_run, target_cwd, proc_env, raw_cmd, target_port=target_port)
        else:
            return default_process_manager.execute_supervised(cmd_to_run, target_cwd, proc_env, raw_cmd, timeout=timeout)
    except Exception as exc:
        print(f"[Terminal] Execution error: {exc}")
        return {
            "success": False,
            "stdout": "",
            "stderr": str(exc),
            "exit_code": -1,
            "stopped_by_user": False
        }
