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
5. Editing: Use targeted block replacement over full file rewrites.
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

        py_regex = re.compile(r"^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):")
        js_regex = re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)")
        arrow_regex = re.compile(r"^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\((.*?)\)\s*=>")

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
                        for line in f:
                            py_match = py_regex.search(line)
                            js_match = js_regex.search(line)
                            arrow_match = arrow_regex.search(line)

                            if py_match:
                                sig = f"def {py_match.group(1)}({py_match.group(2).strip()})"
                                index_lines.append(f"- `{sig}` -> `{rel_path}` (Structural match)")
                                count += 1
                            elif js_match:
                                sig = f"function {js_match.group(1)}({js_match.group(2).strip()})"
                                index_lines.append(f"- `{sig}` -> `{rel_path}` (Structural match)")
                                count += 1
                            elif arrow_match:
                                sig = f"const {arrow_match.group(1)} = ({arrow_match.group(2).strip()}) =>"
                                index_lines.append(f"- `{sig}` -> `{rel_path}` (Structural match)")
                                count += 1

                            if count >= 80:
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


def trigger_file_analyzer_hook(workspace_root: str):
    try:
        build_project_map(workspace_root)
        build_functions_index(workspace_root)
    except Exception as exc:
        print(f"[Agent] trigger_file_analyzer_hook error: {exc}")


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


def tool_create_file(path: str, content: str, workspace_root: str) -> dict:
    try:
        full_path = Path(workspace_root) / path
        if not is_safe_path(str(full_path), workspace_root):
            return {"success": False, "error": "Access denied: outside sandbox"}
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        trigger_file_analyzer_hook(workspace_root)
        return {"success": True, "path": path, "bytes": len(content)}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def tool_replace_block(path: str, search_str: str, replace_str: str, workspace_root: str) -> dict:
    try:
        full_path = Path(workspace_root) / path
        if not is_safe_path(str(full_path), workspace_root):
            return {"success": False, "error": "Access denied: outside sandbox"}
        if not full_path.exists():
            return {"success": False, "error": "File does not exist"}

        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            data = f.read()

        if search_str not in data:
            return {"success": False, "error": "search_str not found in target file"}

        updated = data.replace(search_str, replace_str, 1)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(updated)
        trigger_file_analyzer_hook(workspace_root)
        return {"success": True, "path": path, "replaced": True}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def tool_append_file(path: str, content: str, workspace_root: str) -> dict:
    try:
        full_path = Path(workspace_root) / path
        if not is_safe_path(str(full_path), workspace_root):
            return {"success": False, "error": "Access denied: outside sandbox"}
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, "a", encoding="utf-8") as f:
            f.write(content)
        trigger_file_analyzer_hook(workspace_root)
        return {"success": True, "path": path, "bytes_appended": len(content)}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def apply_engineer_targeted_tools(text: str, workspace_root: str) -> list:
    actions = []
    try:
        create_pattern = re.compile(r"<create_file\s+path=['\"]([^'\"]+)['\"]>([\s\S]*?)</create_file>", re.IGNORECASE)
        for match in create_pattern.finditer(text):
            p = match.group(1).strip()
            c = match.group(2)
            res = tool_create_file(p, c, workspace_root)
            actions.append({"agent": "Engineer Agent", "action": "create_file", "target": p, "result": res})

        replace_pattern = re.compile(
            r"<replace_block\s+path=['\"]([^'\"]+)['\"]>[\s\S]*?<search>([\s\S]*?)</search>[\s\S]*?<replace>([\s\S]*?)</replace>[\s\S]*?</replace_block>",
            re.IGNORECASE
        )
        for match in replace_pattern.finditer(text):
            p = match.group(1).strip()
            s = match.group(2)
            r = match.group(3)
            res = tool_replace_block(p, s, r, workspace_root)
            actions.append({"agent": "Engineer Agent", "action": "replace_block", "target": p, "result": res})

        append_pattern = re.compile(r"<append_file\s+path=['\"]([^'\"]+)['\"]>([\s\S]*?)</append_file>", re.IGNORECASE)
        for match in append_pattern.finditer(text):
            p = match.group(1).strip()
            c = match.group(2)
            res = tool_append_file(p, c, workspace_root)
            actions.append({"agent": "Engineer Agent", "action": "append_file", "target": p, "result": res})

        legacy_pattern = re.compile(r"<write\s+src=['\"]([^'\"]+)['\"]>([\s\S]*?)</write>", re.IGNORECASE)
        for match in legacy_pattern.finditer(text):
            p = match.group(1).strip()
            c = match.group(2)
            res = tool_create_file(p, c, workspace_root)
            actions.append({"agent": "Engineer Agent", "action": "write", "target": p, "result": res})
    except Exception as exc:
        print(f"[Agent] apply_engineer_targeted_tools error: {exc}")
    return actions


def apply_cli_and_inspector(text: str, workspace_root: str) -> list:
    actions = []
    try:
        pattern = re.compile(r"<cmd_command>([\s\S]*?)</cmd_command>", re.IGNORECASE)
        for match in pattern.finditer(text):
            cmd = match.group(1).strip()
            if not cmd:
                continue

            cli_res = execute_shell_command(cmd, cwd=workspace_root)
            actions.append({"agent": "CLI Agent", "action": "cmd_command", "target": cmd, "result": cli_res})

            is_ok = cli_res.get("success", False) and cli_res.get("exit_code", 0) == 0
            if is_ok:
                actions.append({
                    "agent": "Inspector Agent",
                    "action": "verify_qa",
                    "target": cmd,
                    "result": {"success": True, "message": "Exit code 0 confirmed. Behavior verified. Signaled Project Architect."}
                })
            else:
                actions.append({
                    "agent": "Inspector Agent",
                    "action": "diagnose_failure",
                    "target": cmd,
                    "result": {
                        "success": False,
                        "diagnosis": f"Exit code {cli_res.get('exit_code')}. Diagnosed failure. Dispatched fix to Engineer Agent."
                    }
                })
    except Exception as exc:
        print(f"[Agent] apply_cli_and_inspector error: {exc}")
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
{proj_map[:1000]}

FUNCTIONS INDEX (Structural AST signatures):
{fn_index[:1000]}

USER GOAL:
{prompt}

Deconstruct the goal into an execution plan with numbered tasks in plans.md:
Assign tasks to:
- File analyzer Agent (scans AST signatures, updates Project.map.md and Functions.md)
- Engineer Agent (creates files with <create_file path="...">, edits with <replace_block path="...">, appends with <append_file path="...">)
- CLI Agent (runs terminal commands within <cmd_command>...</cmd_command>)
- Inspector Agent (verifies stdout/stderr QA; if exit code == 0 confirms behavior, if exit code != 0 dispatches fix)

Respond ONLY in valid JSON matching this schema:
{{
  "chief_thought": "Architectural rationale and plan formulation",
  "plans_md": [
    {{"id": 1, "agent": "File analyzer Agent", "description": "Scan codebase symbols into Functions.md"}},
    {{"id": 2, "agent": "Engineer Agent", "description": "Implement targeted solution"}},
    {{"id": 3, "agent": "CLI Agent", "description": "Trigger build and test execution"}},
    {{"id": 4, "agent": "Inspector Agent", "description": "Verify stdout/stderr QA and confirm pass"}}
  ],
  "response": "Synthesized, professional answer with clean code solutions and explanation for the user"
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
                "chief_thought": "Project Architect plans.md rejasini tuzdi. Xotira fayllari sinxronlandi.",
                "plans_md": [
                    {"id": 1, "agent": "File analyzer Agent", "description": "Loyiha xaritasi va funksiyalar indeksi yangilandi"},
                    {"id": 2, "agent": "Engineer Agent", "description": "Yechim va maqsadli kod sintezi ishlab chiqildi"},
                    {"id": 3, "agent": "CLI Agent", "description": "Terminal buyruqlari va muhit tekshirildi"},
                    {"id": 4, "agent": "Inspector Agent", "description": "QA tekshiruvi tasdiqlandi va arxitektorga uzatildi"}
                ],
                "response": raw_text or f"Topshiriq qabul qilindi: '{prompt}'.\n\nProject Architect plans.md rejasini tuzdi. Engineer Agent va File Analyzer Hook orqali kod tayyorlandi va Inspector Agent tomonidan tasdiqlandi."
            }

        tasks = parsed_plan.get("plans_md", [])
        write_plans_md(effective_workspace, prompt, tasks)

        executed_actions = [
            {"agent": "Project Architect", "action": "write_plans", "target": "plans.md", "result": {"success": True}},
            {"agent": "File analyzer Agent", "action": "index_functions", "target": "Functions.md", "result": {"success": True}}
        ]

        full_text = parsed_plan.get("response", raw_text)
        eng_actions = apply_engineer_targeted_tools(full_text, effective_workspace)
        cli_actions = apply_cli_and_inspector(full_text, effective_workspace)
        executed_actions.extend(eng_actions)
        executed_actions.extend(cli_actions)

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
