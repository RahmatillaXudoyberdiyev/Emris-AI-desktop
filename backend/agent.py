import json
import os
import re
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

try:
    from backend.terminal import execute_shell_command
    from backend.gateway import request_generate, get_active_credentials
except ImportError:
    from terminal import execute_shell_command
    from gateway import request_generate, get_active_credentials


def is_safe_path(target_path: str, workspace_root: str) -> bool:
    try:
        if not workspace_root:
            return True
        root = Path(workspace_root).resolve()
        target = Path(target_path).resolve()
        return root == target or root in target.parents
    except Exception as exc:
        print(f"[Agent] Safe path check error: {exc}")
        return False


def tool_list_files(target_dir: str, workspace_root: str) -> dict:
    try:
        dir_to_read = target_dir if target_dir else workspace_root
        if not dir_to_read or not os.path.exists(dir_to_read):
            return {"success": False, "error": "Directory does not exist"}
        if not is_safe_path(dir_to_read, workspace_root):
            return {"success": False, "error": "Access denied: Path outside workspace"}

        items = []
        for entry in os.scandir(dir_to_read):
            if entry.name in [".git", "node_modules", ".venv", "__pycache__", "dist"]:
                continue
            items.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if entry.is_file() else 0
            })
        return {"success": True, "files": items[:60]}
    except Exception as exc:
        print(f"[Agent] list_files error: {exc}")
        return {"success": False, "error": str(exc)}


def tool_read_file(file_path: str, workspace_root: str) -> dict:
    try:
        if not file_path:
            return {"success": False, "error": "Missing file path"}
        full_path = Path(file_path) if Path(file_path).is_absolute() else Path(workspace_root) / file_path
        if not is_safe_path(str(full_path), workspace_root):
            return {"success": False, "error": "Access denied: Path outside workspace"}
        if not full_path.exists():
            return {"success": False, "error": "File does not exist"}

        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read(15000)
        return {"success": True, "content": content, "path": str(full_path)}
    except Exception as exc:
        print(f"[Agent] read_file error: {exc}")
        return {"success": False, "error": str(exc)}


def tool_write_file(file_path: str, content: str, workspace_root: str) -> dict:
    try:
        if not file_path:
            return {"success": False, "error": "Missing file path"}
        full_path = Path(file_path) if Path(file_path).is_absolute() else Path(workspace_root) / file_path
        if not is_safe_path(str(full_path), workspace_root):
            return {"success": False, "error": "Access denied: Path outside workspace"}

        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[Agent] Successfully written: {full_path}")
        return {"success": True, "path": str(full_path), "bytes": len(content)}
    except Exception as exc:
        print(f"[Agent] write_file error: {exc}")
        return {"success": False, "error": str(exc)}


def execute_agent_step(step_item: dict, workspace_root: str) -> dict:
    try:
        action = step_item.get("action")
        target = step_item.get("target", "")

        if action == "list_files":
            res = tool_list_files(target, workspace_root)
            return {"action": "list_files", "target": target, "result": res}
        elif action == "read_file":
            res = tool_read_file(target, workspace_root)
            return {"action": "read_file", "target": target, "result": res}
        elif action == "write_file":
            content = step_item.get("content", "")
            res = tool_write_file(target, content, workspace_root)
            return {"action": "write_file", "target": target, "result": res}
        elif action == "run_command":
            cmd = step_item.get("command", target)
            res = execute_shell_command(cmd, cwd=workspace_root)
            return {"action": "run_command", "target": cmd, "result": res}
        else:
            return {"action": "noop", "target": target, "result": {"success": True}}
    except Exception as exc:
        print(f"[Agent] Step execution error: {exc}")
        return {"action": "error", "error": str(exc)}


def run_hierarchical_cycle(prompt: str, workspace_root: str = None, model: str = "gemini-3.5-flash-lite") -> dict:
    try:
        print(f"[Agent] Starting Hierarchical Cycle for goal: '{prompt[:60]}...'")
        effective_workspace = workspace_root if workspace_root and os.path.exists(workspace_root) else os.getcwd()

        structure_info = tool_list_files(effective_workspace, effective_workspace)
        files_sample = [f["name"] for f in structure_info.get("files", [])[:15]]

        chief_prompt = f"""You are the Chief AI Architect in a hierarchical multi-agent coding system.
Workspace: {effective_workspace}
Top files: {files_sample}
User Goal: {prompt}

Deconstruct the goal into an architectural plan and subtasks.
Respond ONLY in valid JSON matching this schema:
{{
  "chief_thought": "Brief 1-2 sentence architectural rationale",
  "steps": [
    {{"id": 1, "agent": "researcher", "action": "list_files", "target": ".", "description": "Scan project layout"}},
    {{"id": 2, "agent": "lead_coder", "action": "explain", "target": "", "description": "Formulate solution"}}
  ],
  "response": "Detailed, professional answer to the user explaining the implementation"
}}"""

        chief_result = request_generate(chief_prompt, model=model)
        raw_text = ""
        if chief_result.get("success") and chief_result.get("data"):
            data = chief_result["data"]
            raw_text = data.get("response") or data.get("text") or data.get("content") or str(data)

        parsed_plan = None
        if raw_text:
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)
            try:
                parsed_plan = json.loads(cleaned)
            except Exception as parse_err:
                print(f"[Agent] Plan parse note: {parse_err}")

        if not parsed_plan or not isinstance(parsed_plan, dict):
            parsed_plan = {
                "chief_thought": "Direct execution strategy formulated.",
                "steps": [
                    {"id": 1, "agent": "lead_coder", "action": "code", "description": "Synthesize response"}
                ],
                "response": raw_text or "Topshiriq qabul qilindi va tahlil qilindi."
            }

        executed_actions = []
        for step in parsed_plan.get("steps", [])[:5]:
            if step.get("action") in ["list_files", "read_file", "write_file", "run_command"]:
                action_res = execute_agent_step(step, effective_workspace)
                executed_actions.append(action_res)

        return {
            "success": True,
            "chief_thought": parsed_plan.get("chief_thought", ""),
            "steps": parsed_plan.get("steps", []),
            "actions": executed_actions,
            "response": parsed_plan.get("response", raw_text)
        }
    except Exception as exc:
        print(f"[Agent] Hierarchical cycle failure: {exc}")
        return {
            "success": False,
            "chief_thought": "Error in agent loop",
            "steps": [],
            "actions": [],
            "response": f"Agent jarayonida xatolik yuz berdi: {exc}"
        }
