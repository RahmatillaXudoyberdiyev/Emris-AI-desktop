import os
import re
from pathlib import Path

def is_safe_path(target_path: str, workspace_root: str) -> bool:
    try:
        if not workspace_root:
            return True
        root = Path(workspace_root).resolve()
        target = Path(target_path).resolve()
        return root == target or root in target.parents
    except Exception as exc:
        print(f"[WorkspaceTools] Safe path check error: {exc}")
        return False

def ensure_emris_memory(workspace_root: str):
    try:
        emris_md_path = Path(workspace_root) / "Emris.md"
        if not emris_md_path.exists():
            content = "# Emris AI System Instructions\n1. Maintain modular code.\n2. Work in sandbox.\n3. Wrap operations in defensive try-except."
            with open(emris_md_path, "w", encoding="utf-8") as f:
                f.write(content)
    except Exception as exc:
        print(f"[WorkspaceTools] ensure_emris_memory error: {exc}")

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
                if fname not in ignore_dirs and not fname.startswith("."):
                    lines.append(f"{indent}  - 📄 {fname}")
        content = "\n".join(lines[:140])
        with open(root_path / "Project.map.md", "w", encoding="utf-8") as f:
            f.write(content)
        return content
    except Exception as exc:
        print(f"[WorkspaceTools] build_project_map error: {exc}")
        return ""

def build_functions_index(workspace_root: str) -> str:
    try:
        root_path = Path(workspace_root)
        index_lines = ["# Functions Index (`Functions.md`)", ""]
        ignore_dirs = {".git", "node_modules", ".venv", "__pycache__", "dist", "build"}
        code_exts = {".py", ".js", ".jsx", ".ts", ".tsx", ".html"}

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
                                index_lines.append(f"- `{sig}` -> `{rel_path}`")
                                count += 1
                            elif js_match:
                                sig = f"function {js_match.group(1)}({js_match.group(2).strip()})"
                                index_lines.append(f"- `{sig}` -> `{rel_path}`")
                                count += 1
                            elif arrow_match:
                                sig = f"const {arrow_match.group(1)} = ({arrow_match.group(2).strip()}) =>"
                                index_lines.append(f"- `{sig}` -> `{rel_path}`")
                                count += 1

                            if count >= 80:
                                break
                except Exception as read_err:
                    print(f"[WorkspaceTools] Scan error on {fname}: {read_err}")

        content = "\n".join(index_lines)
        fn_path = root_path / "Functions.md"
        with open(fn_path, "w", encoding="utf-8") as f:
            f.write(content)
        return content
    except Exception as exc:
        print(f"[WorkspaceTools] build_functions_index error: {exc}")
        return ""

def trigger_file_analyzer_hook(workspace_root: str):
    try:
        build_project_map(workspace_root)
        build_functions_index(workspace_root)
    except Exception as exc:
        print(f"[WorkspaceTools] trigger_file_analyzer_hook error: {exc}")

def write_plans_md(workspace_root: str, goal: str, plan_data: dict) -> str:
    try:
        root_path = Path(workspace_root)
        proj = plan_data.get("project", {})
        tasks = plan_data.get("execution_plan", [])
        lines = [
            f"# Project Execution Plan (`plans.md`)",
            f"**Project**: {proj.get('name', 'Software Initiative')}",
            f"**Framework**: {proj.get('framework', 'Modern Web')}",
            f"**Goal**: {goal}\n",
            "## Execution Phases & Tasks"
        ]
        for task in tasks:
            tid = task.get("task_id", "TASK")
            phase = task.get("phase", "General")
            title = task.get("title", "")
            agent = task.get("agent", "Engineer Agent")
            obj = task.get("objective", "")
            tools = ", ".join(task.get("tools", []))
            lines.append(f"### [{tid}] {title}")
            lines.append(f"- **Phase**: {phase}")
            lines.append(f"- **Agent**: {agent}")
            if tools:
                lines.append(f"- **Tools**: `{tools}`")
            lines.append(f"- **Objective**: {obj}\n")

        content = "\n".join(lines)
        with open(root_path / "plans.md", "w", encoding="utf-8") as f:
            f.write(content)
        return content
    except Exception as exc:
        print(f"[WorkspaceTools] write_plans_md error: {exc}")
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
        print(f"[WorkspaceTools] tool_create_file error on {path}: {exc}")
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
            return {"success": False, "error": "search_str not found"}

        updated = data.replace(search_str, replace_str, 1)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(updated)
        trigger_file_analyzer_hook(workspace_root)
        return {"success": True, "path": path, "replaced": True}
    except Exception as exc:
        return {"success": False, "error": str(exc)}
