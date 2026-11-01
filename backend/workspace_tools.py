import os
import re
import shutil
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

def tool_read_file(path: str, workspace_root: str, start_line: int = 1, max_lines: int = 150) -> dict:
    try:
        full_path = Path(workspace_root) / path
        if not is_safe_path(str(full_path), workspace_root):
            return {"success": False, "error": "Access denied: outside sandbox"}
        if not full_path.exists():
            return {"success": False, "error": f"File '{path}' does not exist"}
        if not full_path.is_file():
            return {"success": False, "error": f"Path '{path}' is a directory, not a file"}
        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        total_lines = len(lines)
        s_idx = max(1, start_line) - 1
        e_idx = min(total_lines, s_idx + max_lines)
        slice_lines = lines[s_idx:e_idx]
        numbered = [f"{s_idx + i + 1:4d} | {line}" for i, line in enumerate(slice_lines)]
        content = "".join(numbered)
        return {
            "success": True,
            "path": path,
            "total_lines": total_lines,
            "start_line": s_idx + 1,
            "end_line": e_idx,
            "content": content
        }
    except Exception as exc:
        print(f"[WorkspaceTools] tool_read_file error on {path}: {exc}")
        return {"success": False, "error": str(exc)}

def tool_list_files(subfolder: str, workspace_root: str) -> dict:
    try:
        target = Path(workspace_root) / (subfolder or "")
        if not is_safe_path(str(target), workspace_root) or not target.exists():
            return {"success": False, "error": "Directory does not exist"}
        items = []
        for p in target.iterdir():
            if not p.name.startswith("."):
                items.append(f"{p.name}/" if p.is_dir() else p.name)
        return {"success": True, "files": items[:40]}
    except Exception as exc:
        print(f"[WorkspaceTools] tool_list_files error: {exc}")
        return {"success": False, "error": str(exc)}

def execute_engineer_turn_tools(text: str, workspace_root: str) -> tuple[list, list]:
    actions = []
    feedbacks = []
    try:
        read_pat = re.compile(r"<read_file\s+path=['\"]([^'\"]+)['\"](?:\s+start_line=['\"]?(\d+)['\"]?)?(?:\s+max_lines=['\"]?(\d+)['\"]?)?\s*/>", re.IGNORECASE)
        for m in read_pat.finditer(text):
            p = m.group(1).strip()
            s_line = int(m.group(2)) if m.group(2) else 1
            m_lines = int(m.group(3)) if m.group(3) else 150
            res = tool_read_file(p, workspace_root, start_line=s_line, max_lines=m_lines)
            clean_res = {
                "success": res.get("success"),
                "path": p,
                "total_lines": res.get("total_lines"),
                "start_line": res.get("start_line"),
                "end_line": res.get("end_line"),
                "error": res.get("error")
            }
            actions.append({"agent": "Engineer Agent", "action": "read_file", "target": p, "result": clean_res})
            if res.get("success"):
                feedbacks.append(f"[Tool Result: read_file('{p}', lines {res.get('start_line')}-{res.get('end_line')} of {res.get('total_lines')}):\n{res.get('content')}]")
            else:
                feedbacks.append(f"[Tool Error: read_file('{p}') failed: {res.get('error')}]")

        list_pat = re.compile(r"<list_dir(?:\s+path=['\"]([^'\"]*)['\"])?\s*/>", re.IGNORECASE)
        for m in list_pat.finditer(text):
            sub = (m.group(1) or "").strip()
            res = tool_list_files(sub, workspace_root)
            actions.append({"agent": "Engineer Agent", "action": "list_dir", "target": sub or ".", "result": res})
            if res.get("success"):
                feedbacks.append(f"[Tool Result: list_dir('{sub or '.'}')]: {', '.join(res.get('files', []))}")
            else:
                feedbacks.append(f"[Tool Error: list_dir('{sub or '.'}') failed: {res.get('error')}]")

        file_actions = apply_engineer_targeted_tools(text, workspace_root)
        for a in file_actions:
            actions.append(a)
            res = a.get("result", {})
            if res.get("success"):
                feedbacks.append(f"[Tool Result: {a.get('action')} on '{a.get('target')}']: Success")
            else:
                feedbacks.append(f"[Tool Error: {a.get('action')} on '{a.get('target')}']: {res.get('error')}")
    except Exception as exc:
        print(f"[WorkspaceTools] execute_engineer_turn_tools error: {exc}")
    return actions, feedbacks

def sanitize_code_content(path: str, content: str) -> str:
    cleaned = content.strip()
    cleaned = re.sub(r"(?m)^\s*```[a-zA-Z0-9_\-]*\s*$", "", cleaned)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".html", ".css", ".sql", ".sh"):
        lines = [line for line in cleaned.splitlines() if not re.match(r"^\s*```[a-zA-Z0-9_\-]*\s*$", line)]
        while lines and not lines[0].strip():
            lines.pop(0)
        while lines and not lines[-1].strip():
            lines.pop()
        cleaned = "\n".join(lines)
    return cleaned


WORKSPACE_TOOLS_DECLARATIONS = [
    {
        "function_declarations": [
            {
                "name": "read_file",
                "description": "Read file lines bounded by line numbers with line numbering for inspection and context.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "path": {
                            "type": "STRING",
                            "description": "Relative path to the target file in the workspace"
                        },
                        "start_line": {
                            "type": "INTEGER",
                            "description": "1-based starting line number"
                        },
                        "max_lines": {
                            "type": "INTEGER",
                            "description": "Maximum number of lines to read"
                        }
                    },
                    "required": ["path"]
                }
            },
            {
                "name": "create_file",
                "description": "Create a new file or completely overwrite a file with exact code content.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "path": {
                            "type": "STRING",
                            "description": "Relative path of the file to create or overwrite"
                        },
                        "content": {
                            "type": "STRING",
                            "description": "Full source code or text content of the file"
                        }
                    },
                    "required": ["path", "content"]
                }
            },
            {
                "name": "replace_block",
                "description": "Replace a targeted code block in an existing file. Must match search_str accurately.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "path": {
                            "type": "STRING",
                            "description": "Relative path to the target file"
                        },
                        "search_str": {
                            "type": "STRING",
                            "description": "Exact lines of existing code to locate and replace"
                        },
                        "replace_str": {
                            "type": "STRING",
                            "description": "New replacement code lines"
                        }
                    },
                    "required": ["path", "search_str", "replace_str"]
                }
            },
            {
                "name": "list_dir",
                "description": "List all files and subdirectories in a workspace directory.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "path": {
                            "type": "STRING",
                            "description": "Relative directory path (empty string or '.' for workspace root)"
                        }
                    }
                }
            },
            {
                "name": "cmd_command",
                "description": "Execute a terminal CLI command in the workspace.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "command": {
                            "type": "STRING",
                            "description": "Shell command line to execute"
                        }
                    },
                    "required": ["command"]
                }
            }
        ]
    }
]

def tool_create_file(path: str, content: str, workspace_root: str) -> dict:
    try:
        full_path = Path(workspace_root) / path
        if not is_safe_path(str(full_path), workspace_root):
            return {"success": False, "error": "Access denied: outside sandbox"}
        full_path.parent.mkdir(parents=True, exist_ok=True)
        sanitized = sanitize_code_content(path, content)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(sanitized)
        trigger_file_analyzer_hook(workspace_root)
        return {"success": True, "path": path, "bytes": len(sanitized)}
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

        s_clean = search_str.strip("\r\n")
        if not s_clean:
            return {"success": False, "error": "search_str is empty"}

        rep_clean = sanitize_code_content(path, replace_str)

        if s_clean in data:
            start_idx = data.find(s_clean)
            l_start = data[:start_idx].count("\n") + 1
            l_finish = l_start + s_clean.count("\n")
            updated = data[:start_idx] + rep_clean.strip("\r\n") + data[start_idx + len(s_clean):]
        else:
            file_lines = data.splitlines(keepends=True)
            search_lines = [l.strip() for l in s_clean.splitlines() if l.strip()]
            if not search_lines:
                return {"success": False, "error": "search_str not found"}

            matched_idx = -1
            n = len(search_lines)
            for i in range(len(file_lines) - n + 1):
                if [file_lines[i + j].strip() for j in range(n)] == search_lines:
                    matched_idx = i
                    break

            if matched_idx == -1:
                return {"success": False, "error": "search_str not found"}

            l_start = matched_idx + 1
            l_finish = matched_idx + n

            first_line = file_lines[matched_idx]
            base_indent = len(first_line) - len(first_line.lstrip())
            indent_prefix = first_line[:base_indent]

            rep_lines = rep_clean.strip("\r\n").splitlines()
            formatted_rep = []
            for r_line in rep_lines:
                if r_line.strip() and not (r_line.startswith(" ") or r_line.startswith("\t")):
                    formatted_rep.append(indent_prefix + r_line)
                else:
                    formatted_rep.append(r_line)

            rep_block = "\n".join(formatted_rep)
            if file_lines[matched_idx + n - 1].endswith("\n"):
                rep_block += "\n"

            updated = "".join(file_lines[:matched_idx]) + rep_block + "".join(file_lines[matched_idx + n:])

        with open(full_path, "w", encoding="utf-8") as f:
            f.write(updated)
        trigger_file_analyzer_hook(workspace_root)
        return {
            "success": True,
            "path": path,
            "l_start": l_start,
            "l_finish": l_finish,
            "replaced": True
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}

def tool_delete_file(path: str, workspace_root: str) -> dict:
    try:
        full_path = Path(workspace_root) / path
        if not is_safe_path(str(full_path), workspace_root):
            return {"success": False, "error": "Access denied: outside sandbox"}
        if not full_path.exists():
            return {"success": False, "error": "File does not exist"}
        if full_path.is_file():
            full_path.unlink()
        elif full_path.is_dir():
            shutil.rmtree(full_path)
        trigger_file_analyzer_hook(workspace_root)
        return {"success": True, "path": path}
    except Exception as exc:
        print(f"[WorkspaceTools] tool_delete_file error on {path}: {exc}")
        return {"success": False, "error": str(exc)}

def apply_engineer_targeted_tools(text: str, workspace_root: str) -> list:
    actions = []
    try:
        patterns = [
            re.compile(r"<create_file\s+(?:path|src)=['\"]([^'\"]+)['\"]>([\s\S]*?)</create_file>", re.IGNORECASE),
            re.compile(r"<write\s+(?:src|path)=['\"]([^'\"]+)['\"]>([\s\S]*?)</write>", re.IGNORECASE),
            re.compile(r"<file\s+(?:path|src)=['\"]([^'\"]+)['\"]>([\s\S]*?)</file>", re.IGNORECASE)
        ]
        seen_paths = set()
        for pat in patterns:
            for match in pat.finditer(text):
                p = match.group(1).strip()
                raw_c = match.group(2).strip()

                nested_pat = re.search(r'(?:\r?\n```(?:xml)?\s*)?<(?:write|create_file|file)\s+(?:src|path)=[\'"]([^\'"]+)[\'"]>([\s\S]*)', raw_c, re.IGNORECASE)
                if nested_pat:
                    clean_first = raw_c[:nested_pat.start()].rstrip()
                    if p not in seen_paths:
                        seen_paths.add(p)
                        res = tool_create_file(p, clean_first, workspace_root)
                        actions.append({"agent": "Engineer Agent", "action": "create_file", "target": p, "result": res})

                    nested_p = nested_pat.group(1).strip()
                    nested_c = re.sub(r'</(?:write|create_file|file)>[\s\S]*$', '', nested_pat.group(2)).strip()
                    if nested_p not in seen_paths:
                        seen_paths.add(nested_p)
                        res2 = tool_create_file(nested_p, nested_c, workspace_root)
                        actions.append({"agent": "Engineer Agent", "action": "create_file", "target": nested_p, "result": res2})
                    continue

                if p in seen_paths:
                    continue
                seen_paths.add(p)
                res = tool_create_file(p, raw_c, workspace_root)
                actions.append({"agent": "Engineer Agent", "action": "create_file", "target": p, "result": res})

        rep_pat = re.compile(
            r"<replace_block\s+path=['\"]([^'\"]+)['\"]>[\s\S]*?<search>([\s\S]*?)</search>[\s\S]*?<replace>([\s\S]*?)</replace>[\s\S]*?</replace_block>",
            re.IGNORECASE
        )
        for match in rep_pat.finditer(text):
            p = match.group(1).strip()
            res = tool_replace_block(p, match.group(2), match.group(3), workspace_root)
            actions.append({
                "agent": "Engineer Agent",
                "action": "replace_block",
                "target": p,
                "result": res,
                "l_start": res.get("l_start"),
                "l_finish": res.get("l_finish")
            })

        del_pat = re.compile(r"<delete(?:_file)?\s+(?:path|src)=['\"]([^'\"]+)['\"]\s*/>", re.IGNORECASE)
        for match in del_pat.finditer(text):
            p = match.group(1).strip()
            res = tool_delete_file(p, workspace_root)
            actions.append({"agent": "Engineer Agent", "action": "delete_file", "target": p, "result": res})
    except Exception as exc:
        print(f"[WorkspaceTools] apply_engineer_targeted_tools error: {exc}")
    return actions

def extract_cli_commands(text: str, workspace_root: str) -> list:
    actions = []
    try:
        pattern = re.compile(r"<cmd_command(?:\s+cwd=['\"]([^'\"]+)['\"])?>([\s\S]*?)</cmd_command>", re.IGNORECASE)
        for match in pattern.finditer(text):
            sub_cwd = match.group(1)
            cmd = match.group(2).strip()
            if not cmd:
                continue
            target_cwd = workspace_root
            if sub_cwd:
                cand = os.path.normpath(os.path.join(workspace_root, sub_cwd))
                if os.path.exists(cand):
                    target_cwd = cand
            else:
                if re.search(r"\b(?:npm|pnpm|yarn|bun)\s+(?:run|start|build|dev|test)\b", cmd, re.IGNORECASE):
                    if not os.path.exists(os.path.join(workspace_root, "package.json")):
                        for root_dir, dirs, files in os.walk(workspace_root):
                            dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", ".venv", "dist", "build")]
                            if "package.json" in files:
                                target_cwd = root_dir
                                sub_cwd = os.path.relpath(root_dir, workspace_root).replace("\\", "/")
                                break
                elif re.search(r"\bpython(?:\.exe)?\s+(\S+\.py)\b", cmd, re.IGNORECASE):
                    m_py = re.search(r"\bpython(?:\.exe)?\s+(\S+\.py)\b", cmd, re.IGNORECASE).group(1)
                    if not os.path.exists(os.path.join(workspace_root, m_py)):
                        py_name = os.path.basename(m_py)
                        for root_dir, dirs, files in os.walk(workspace_root):
                            dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", ".venv", "__pycache__")]
                            if py_name in files:
                                target_cwd = root_dir
                                sub_cwd = os.path.relpath(root_dir, workspace_root).replace("\\", "/")
                                break
            actions.append({
                "agent": "CLI Agent",
                "action": "cmd_command",
                "command": cmd,
                "cwd": target_cwd,
                "display_cwd": sub_cwd or ".",
                "pending_approval": True,
                "result": {"status": "pending_approval"}
            })
    except Exception as exc:
        print(f"[WorkspaceTools] extract_cli_commands error: {exc}")
    return actions

def sanitize_display_response(text: str, workspace_root: str = None) -> str:
    try:
        clean = re.sub(r"<(?:create_file|write|file)\s+(?:path|src)=['\"][^'\"]+['\"]>[\s\S]*?</(?:create_file|write|file)>", "", text, flags=re.IGNORECASE)
        clean = re.sub(r"<replace_block[\s\S]*?</replace_block>", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"<delete(?:_file)?\s+(?:path|src)=['\"][^'\"]+['\"]\s*/>", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"<read_file\s+[^>]*/>", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"<list_dir(?:\s+[^>]*)?/>", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"<cmd_command[\s\S]*?</cmd_command>", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"\[Tool (?:Result|Error)[^\]]*\]:[\s\S]*?(?=\n\n|\Z)", "", clean)
        clean = re.sub(r"<\/?(?:div|agent-summary|summary|response)[^>]*>", "", clean, flags=re.IGNORECASE)
        if workspace_root:
            clean = clean.replace(workspace_root, "project workspace")
            clean = clean.replace(workspace_root.replace("\\", "/"), "project workspace")
        clean = re.sub(r"TASK-\d+[:\s]*", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"(?i)^(?:hello!?\s*)?(?:i am|we are)(?:\s+the)?\s+emris ai[^\n]*\n*", "", clean)
        clean = re.sub(r"(?i)\b(?:i am|we are)\s+(?:the\s+)?emris ai\s+(?:engineering|cli|architect)[^\n]*\n*", "", clean)
        clean = re.sub(r"(?i)(?:here is (?:our|the) execution plan[^\n]*\n+)?(?:\n*---\s*\n+)?\*{0,2}Step\s+\d+[:\s][\s\S]*?(?=(?:\n\n[A-Z]|\Z))", "", clean)
        stripped = clean.strip()
        if stripped.startswith("```") and stripped.endswith("```"):
            lines = stripped.split("\n")
            if len(lines) >= 2 and lines[0].startswith("```"):
                first_tag = lines[0].replace("```", "").strip().lower()
                if first_tag in ("markdown", "md", "html", "text", "", "xml", "code"):
                    clean = "\n".join(lines[1:-1]).strip()
        clean = re.sub(r"^```(?:xml|html|markdown|text|code)?\s*", "", clean)
        clean = re.sub(r"\s*```$", "", clean)
        clean = re.sub(r"\n{3,}", "\n\n", clean)
        return clean.strip()
    except Exception:
        return text

def detect_and_prepare_subfolder(prompt: str, workspace_root: str):
    try:
        folder_match = re.search(r"(?:make|create|in)\s+([a-zA-Z0-9_\-]+)\s+(?:folder|directory)", prompt, re.IGNORECASE)
        if folder_match:
            sub = folder_match.group(1).strip()
            if sub and not sub.lower() in ("a", "the", "new", "this"):
                sub_path = Path(workspace_root) / sub
                sub_path.mkdir(parents=True, exist_ok=True)
                return str(sub_path), sub
    except Exception as exc:
        print(f"[WorkspaceTools] detect_and_prepare_subfolder error: {exc}")
    return workspace_root, "."

def get_existing_subprojects(workspace_root: str) -> list:
    try:
        if not workspace_root or not os.path.exists(workspace_root):
            return []
        ignored = {
            "node_modules", ".git", ".next", "dist", "build", ".venv", "venv",
            "__pycache__", "gemini_logs", ".gemini", "src", "public", "components",
            "pages", "app", "lib", "utils", "styles", "static", "templates", "tests",
            "test", "docs", "assets", "backend", "frontend", "config", "locales",
            "hooks", "services", "constants", "emris_backup", ".emris_backup"
        }
        return [
            d for d in os.listdir(workspace_root)
            if os.path.isdir(os.path.join(workspace_root, d)) and d not in ignored and not d.startswith(".")
        ]
    except Exception as exc:
        print(f"[WorkspaceTools] get_existing_subprojects error: {exc}")
        return []

def load_referenced_source_files(prompt: str, workspace_root: str, context_text: str = None) -> str:
    candidate_lines = []
    loaded_paths = set()
    try:
        if not workspace_root or not os.path.exists(workspace_root):
            return ""
        combined_text = (prompt + " " + (context_text or "")).lower()
        root_path = Path(workspace_root)

        tokens = [t for t in re.findall(r'[a-zA-Z0-9_\-\.]{3,}', combined_text) if t not in ("the", "and", "for", "with", "this", "file", "make", "edit", "code")]
        for p in root_path.rglob("*"):
            if len(candidate_lines) >= 20:
                break
            if p.is_file() and not any(part.startswith(".") for part in p.parts):
                if any(part in ("node_modules", "dist", "build", ".venv", "__pycache__") for part in p.parts):
                    continue
                rel = str(p.relative_to(root_path)).replace("\\", "/")
                if p.name.lower() in combined_text or rel.lower() in combined_text or any(tok in rel.lower() for tok in tokens[:8]):
                    if str(p) not in loaded_paths:
                        loaded_paths.add(str(p))
                        try:
                            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                                line_count = sum(1 for _ in f)
                            candidate_lines.append(f"- `{rel}` ({line_count} lines) -> `<read_file path=\"{rel}\" start_line=\"1\" max_lines=\"100\" />`")
                        except Exception:
                            candidate_lines.append(f"- `{rel}`")
    except Exception as exc:
        print(f"[WorkspaceTools] load_referenced_source_files error: {exc}")
    if candidate_lines:
        return "WORKSPACE FILES (Inspect line slices using tool_read_file before editing):\n" + "\n".join(candidate_lines)
    return ""

def detect_workspace_environments(workspace_root: str) -> dict:
    info = {
        "has_python_venv": False,
        "venv_path": None,
        "has_requirements": False,
        "requirements_preview": "",
        "has_package_json": False,
        "has_node_modules": False,
        "package_json_preview": ""
    }
    try:
        if not workspace_root or not os.path.exists(workspace_root):
            return info
        root = Path(workspace_root)
        for venv_name in [".venv", "venv", "env"]:
            v_dir = root / venv_name
            if v_dir.exists() and (v_dir / "Scripts").exists() or (v_dir / "bin").exists():
                info["has_python_venv"] = True
                info["venv_path"] = str(v_dir.name)
                break
        req_file = root / "requirements.txt"
        if req_file.exists():
            info["has_requirements"] = True
            with open(req_file, "r", encoding="utf-8", errors="ignore") as rf:
                info["requirements_preview"] = rf.read()[:500].strip()
        pkg_file = root / "package.json"
        if pkg_file.exists():
            info["has_package_json"] = True
            with open(pkg_file, "r", encoding="utf-8", errors="ignore") as pf:
                info["package_json_preview"] = pf.read()[:500].strip()
        if (root / "node_modules").exists():
            info["has_node_modules"] = True
    except Exception as exc:
        print(f"[WorkspaceTools] detect_workspace_environments error: {exc}")
    return info
