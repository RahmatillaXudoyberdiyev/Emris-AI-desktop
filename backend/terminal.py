import os
import re
import subprocess
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
        print(f"[Terminal] Executing command in [{target_cwd}]: {command}")

        process = subprocess.run(
            command,
            shell=True,
            cwd=target_cwd,
            text=True,
            capture_output=True,
            timeout=timeout
        )

        stdout = process.stdout or ""
        stderr = process.stderr or ""
        print(f"[Terminal] Command completed with exit code: {process.returncode}")

        return {
            "success": process.returncode == 0,
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": process.returncode
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
