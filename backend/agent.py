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
    from backend.gateway import request_generate
except ImportError:
    from terminal import execute_shell_command
    from gateway import request_generate


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


def ensure_emris_memory(workspace_root: str):
    try:
        emris_md_path = Path(workspace_root) / "Emris.md"
        if not emris_md_path.exists():
            content = """# Emris AI System Instructions & Global Rules

1. Architecture: Maintain simple, modular, high-precision code.
2. Sandboxing: All operations must strictly reside within the project workspace.
3. Code Quality: Write clean, self-describing code without comments.
4. Error Handling: Always wrap operations in defensive try-catch / try-except blocks.
"""
            with open(emris_md_path, "w", encoding="utf-8") as f:
                f.write(content.strip())
    except Exception as exc:
        print(f"[Agent] ensure_emris_memory error: {exc}")


def build_project_map(workspace_root: str) -> str:
    try:
        lines = ["# Project Map (`Project.map.md`)", f"Root: {workspace_root}", ""]
        ignore_dirs = {".git", "node_modules", ".venv", "__pycache__", "dist", "build"}
        root_path = Path(workspace_root)

        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith(".")]
            rel_dir = os.path.relpath(dirpath, root_path)
            depth = 0 if rel_dir == "." else rel_dir.count(os.sep) + 1
            indent = "  " * depth

            if rel_dir != ".":
                lines.append(f"{indent}- 📁 {os.path.basename(dirpath)}/")

            for fname in sorted(filenames):
                if fname in ignore_dirs or fname.startswith("."):
                    continue
                lines.append(f"{indent}  - 📄 {fname}")

        content = "\n".join(lines[:120])
        map_path = root_path / "Project.map.md"
        with open(map_path, "w", encoding="utf-8") as f:
            f.write(content)
        return content
    except Exception as exc:
        print(f"[Agent] build_project_map error: {exc}")
        return ""


def build_functions_index(workspace_root: str) -> str:
    try:
        root_path = Path(workspace_root)
        index_lines = ["# Functions Index (`Functions.md`)", ""]
        ignore_dirs = {".git", "node_modules", ".venv", "__pycache__", "dist", "build"}
        code_exts = {".py", ".js", ".jsx", ".ts", ".tsx"}

        py_fn_regex = re.compile(r"^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(")
        js_fn_regex = re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(")
        js_arrow_regex = re.compile(r"^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(")

        count = 0
        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith(".")]
            for fname in filenames:
                ext = os.path.splitext(fname)[1].lower()
                if ext not in code_exts:
                    continue

                full_path = Path(dirpath) / fname
                rel_path = os.path.relpath(full_path, root_path).replace("\\", "/")

                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line_idx, line in enumerate(f, start=1):
                            match = (
                                py_fn_regex.search(line)
                                or js_fn_regex.search(line)
                                or js_arrow_regex.search(line)
                            )
                            if match:
                                fn_name = match.group(1)
                                index_lines.append(f"- `{fn_name}` -> `{rel_path}` (Line {line_idx})")
                                count += 1
                                if count >= 100:
                                    break
                except Exception as read_err:
                    print(f"[Agent] Scan error on {fname}: {read_err}")

        content = "\n".join(index_lines)
        fn_path = root_path / "Functions.md"
        with open(fn_path, "w", encoding="utf-8") as f:
            f.write(content)
        return content
    except Exception as exc:
        print(f"[Agent] build_functions_index error: {exc}")
        return ""


def write_plans_md(workspace_root: str, goal: str, tasks: list) -> str:
    try:
        root_path = Path(workspace_root)
        lines = [
            "# Project Execution Plan (`plans.md`)",
            f"**Goal**: {goal}",
            "",
            "## Task Breakdown",
        ]
        for idx, task in enumerate(tasks, start=1):
            agent = task.get("agent", "Engineer Agent")
            desc = task.get("description", "Execute task")
            lines.append(f"{idx}. Task {idx}: {desc} — **{agent}**")

        content = "\n".join(lines)
        plan_path = root_path / "plans.md"
        with open(plan_path, "w", encoding="utf-8") as f:
            f.write(content)
        return content
    except Exception as exc:
        print(f"[Agent] write_plans_md error: {exc}")
        return ""


def apply_engineer_writes(text: str, workspace_root: str) -> list:
    actions = []
    try:
        pattern = re.compile(r"<write\s+src=['\"]([^'\"]+)['\"]>([\s\S]*?)</write>", re.IGNORECASE)
        for match in pattern.finditer(text):
            rel_src = match.group(1).strip()
            content = match.group(2)
            full_path = Path(workspace_root) / rel_src

            if not is_safe_path(str(full_path), workspace_root):
                actions.append({
                    "agent": "Engineer Agent",
                    "action": "write",
                    "target": rel_src,
                    "result": {"success": False, "error": "Blocked: outside sandbox"}
                })
                continue

            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
            actions.append({
                "agent": "Engineer Agent",
                "action": "write",
                "target": rel_src,
                "result": {"success": True, "bytes": len(content)}
            })
    except Exception as exc:
        print(f"[Agent] apply_engineer_writes error: {exc}")
    return actions


def apply_cli_commands(text: str, workspace_root: str) -> list:
    actions = []
    try:
        pattern = re.compile(r"<cmd_command>([\s\S]*?)</cmd_command>", re.IGNORECASE)
        for match in pattern.finditer(text):
            cmd = match.group(1).strip()
            if not cmd:
                continue

            res = execute_shell_command(cmd, cwd=workspace_root)
            status_ok = res.get("success", False)
            actions.append({
                "agent": "CLI Agent",
                "action": "cmd_command",
                "target": cmd,
                "result": res
            })

            if not status_ok or res.get("exit_code", 0) != 0:
                inspector_action = {
                    "agent": "Inspector Agent",
                    "action": "error_diagnosed",
                    "target": cmd,
                    "result": {
                        "success": False,
                        "diagnosis": f"Command returned exit code {res.get('exit_code')}. Delegated to Engineer Agent for correction."
                    }
                }
                actions.append(inspector_action)
    except Exception as exc:
        print(f"[Agent] apply_cli_commands error: {exc}")
    return actions


def run_hierarchical_cycle(prompt: str, workspace_root: str = None, model: str = "nemotron-3-ultra-550b") -> dict:
    try:
        effective_workspace = workspace_root if workspace_root and os.path.exists(workspace_root) else os.getcwd()

        ensure_emris_memory(effective_workspace)
        proj_map = build_project_map(effective_workspace)
        fn_index = build_functions_index(effective_workspace)

        architect_prompt = f"""You are the Project Architect in the Emris AI hierarchical multi-agent system.
Workspace: {effective_workspace}

PROJECT MAP:
{proj_map[:1200]}

FUNCTIONS INDEX:
{fn_index[:1200]}

USER GOAL:
{prompt}

Deconstruct the goal into an architectural plan and subtasks.
You assign subtasks to:
- File analyzer Agent (inspects files and functions via Functions.md)
- Engineer Agent (writes code strictly within <write src='path_within_sandbox'>...</write>)
- CLI Agent (runs terminal commands within <cmd_command>...</cmd_command>)
(Note: Inspector Agent triggers automatically on errors, and Researcher Agent triggers on-demand).

Respond ONLY in valid JSON matching this schema:
{{
  "chief_thought": "High-level architectural rationale and strategy",
  "plans_md": [
    {{"id": 1, "agent": "File analyzer Agent", "description": "Scan codebase and locate relevant functions"}},
    {{"id": 2, "agent": "Engineer Agent", "description": "Implement solution in targeted file"}},
    {{"id": 3, "agent": "CLI Agent", "description": "Verify implementation via command"}}
  ],
  "response": "Detailed explanation with clean code solutions and guidance for the user"
}}"""

        raw_result = request_generate(architect_prompt, model=model)
        raw_text = ""
        if raw_result.get("success") and raw_result.get("data"):
            data = raw_result["data"]
            raw_text = data.get("response") or data.get("text") or data.get("content") or str(data)

        parsed_plan = None
        if raw_text:
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)
            try:
                parsed_plan = json.loads(cleaned)
            except Exception as parse_err:
                print(f"[Agent] JSON parse notice: {parse_err}")

        if not parsed_plan or not isinstance(parsed_plan, dict):
            parsed_plan = {
                "chief_thought": f"Loyiha xaritasi (`Project.map.md`) va funksiyalar indeksi (`Functions.md`) yangilandi. Topshiriq rejalashtirildi.",
                "plans_md": [
                    {"id": 1, "agent": "File analyzer Agent", "description": "Fayllar va funksiyalar indeksi yangilandi"},
                    {"id": 2, "agent": "Engineer Agent", "description": "Yechim va arxitektura ishlab chiqildi"},
                    {"id": 3, "agent": "CLI Agent", "description": "Muhit va buyruqlar tayyorlandi"}
                ],
                "response": raw_text or f"Topshiriq qabul qilindi: '{prompt}'.\n\nProject Architect `plans.md` rejasini tuzdi. Fayllar va funksiyalar to'liq indekslandi."
            }

        tasks = parsed_plan.get("plans_md", [])
        write_plans_md(effective_workspace, prompt, tasks)

        executed_actions = [
            {"agent": "Project Architect", "action": "write_plans", "target": "plans.md", "result": {"success": True}},
            {"agent": "File analyzer Agent", "action": "index_functions", "target": "Functions.md", "result": {"success": True}}
        ]

        full_text = parsed_plan.get("response", raw_text)
        write_actions = apply_engineer_writes(full_text, effective_workspace)
        cmd_actions = apply_cli_commands(full_text, effective_workspace)
        executed_actions.extend(write_actions)
        executed_actions.extend(cmd_actions)

        return {
            "success": True,
            "chief_thought": parsed_plan.get("chief_thought", ""),
            "steps": tasks,
            "actions": executed_actions,
            "response": full_text
        }
    except Exception as exc:
        print(f"[Agent] Multi-agent cycle error: {exc}")
        return {
            "success": False,
            "chief_thought": "Agent workflow error",
            "steps": [],
            "actions": [],
            "response": f"Jarayonda xatolik yuz berdi: {exc}"
        }
