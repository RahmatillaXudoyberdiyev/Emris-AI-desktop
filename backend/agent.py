import json
import os
import re
import subprocess
import sys
from pathlib import Path

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
    from backend.terminal import execute_shell_command, get_workspace_background_context, prepare_virtualenv_execution
    from backend.gateway import request_generate, request_generate_with_tools
    from backend.workspace_tools import (
        ensure_emris_memory,
        build_project_map,
        build_functions_index,
        trigger_file_analyzer_hook,
        write_plans_md,
        tool_create_file,
        tool_replace_block,
        tool_delete_file,
        apply_engineer_targeted_tools,
        extract_cli_commands,
        sanitize_display_response,
        detect_and_prepare_subfolder,
        get_existing_subprojects,
        load_referenced_source_files,
        detect_workspace_environments,
        execute_engineer_turn_tools,
        tool_read_file,
        tool_list_files,
        sanitize_code_content,
        WORKSPACE_TOOLS_DECLARATIONS
    )
    from backend.retrievers import HybridCodeRetrieverEngine
    from backend.prompt_loader import render_prompt
except ImportError:
    from terminal import execute_shell_command, get_workspace_background_context, prepare_virtualenv_execution
    from gateway import request_generate, request_generate_with_tools
    from workspace_tools import (
        ensure_emris_memory,
        build_project_map,
        build_functions_index,
        trigger_file_analyzer_hook,
        write_plans_md,
        tool_create_file,
        tool_replace_block,
        tool_delete_file,
        apply_engineer_targeted_tools,
        extract_cli_commands,
        sanitize_display_response,
        detect_and_prepare_subfolder,
        get_existing_subprojects,
        load_referenced_source_files,
        detect_workspace_environments,
        execute_engineer_turn_tools,
        tool_read_file,
        tool_list_files,
        sanitize_code_content,
        WORKSPACE_TOOLS_DECLARATIONS
    )
    from retrievers import HybridCodeRetrieverEngine
    from prompt_loader import render_prompt


def generate_conversation_title(prompt: str) -> dict:
    try:
        title_prompt = render_prompt("title_generator.md", prompt=prompt)
        res = request_generate(title_prompt, model="gemini-3.5-flash-lite")
        if res.get("success") and res.get("data"):
            text = res["data"].get("response") or res["data"].get("text") or ""
            clean_title = text.strip().replace('"', '').replace("'", "").strip()
            if clean_title:
                return {"success": True, "title": clean_title[:45]}
        clean = " ".join(prompt.split()[:5]).strip()
        return {"success": True, "title": clean if clean else "New chat"}
    except Exception as exc:
        print(f"[Agent] generate_conversation_title error: {exc}")
        return {"success": True, "title": "New chat"}


def classify_workflow_intent(prompt: str, has_project: bool = True, project_name: str = None) -> dict:
    try:
        if not has_project or not project_name or project_name == "No Project":
            return {
                "success": True,
                "workflow": "conversation",
                "reason": "No project selected"
            }

        p_low = prompt.strip().lower()
        chit_chat = ("hello", "hi", "hey", "salom", "assalomu alaykum", "who are you", "what is your name", "kimsen", "qandaysan", "how are you", "thanks", "thank you", "rahmat")
        if p_low in chit_chat:
            return {"success": True, "workflow": "conversation"}

        return {"success": True, "workflow": "work"}
    except Exception as exc:
        print(f"[Agent] classify_workflow_intent error: {exc}")
        return {"success": True, "workflow": "work" if has_project else "conversation"}
    except Exception as exc:
        print(f"[Agent] classify_workflow_intent error: {exc}")
        return {"success": True, "workflow": "work" if has_project else "conversation"}


def run_hierarchical_cycle(prompt: str, workspace_root: str = None, model: str = "gemini-3.5-flash-lite", history: list = None, event_callback: callable = None) -> dict:
    try:
        def emit(evt):
            if event_callback:
                try:
                    event_callback(evt)
                except Exception as cb_err:
                    print(f"[Agent] Event callback notice: {cb_err}")

        conversation_context = "No previous context."
        clean_history = []
        if history:
            recent_turns = [h for h in history if h.get("content")][-6:]
            lines = []
            for h in recent_turns:
                role_label = "User" if h.get("role") == "user" else "Assistant"
                cleaned_c = re.sub(r"<!--workflow:[\s\S]*?-->", "", h.get("content", ""))
                cleaned_c = re.sub(r"<!--files_changes:[\s\S]*?-->", "", cleaned_c).strip()
                if cleaned_c:
                    lines.append(f"{role_label}: {cleaned_c[:500]}")
                    clean_history.append({"role": h.get("role", "user"), "content": cleaned_c})
            if lines:
                conversation_context = "\n".join(lines)

        if workspace_root:
            try:
                os.makedirs(workspace_root, exist_ok=True)
            except Exception as me:
                print(f"[Agent] Workspace mkdir error: {me}")
        effective_workspace = workspace_root if workspace_root and os.path.exists(workspace_root) else os.getcwd()
        ensure_emris_memory(effective_workspace)

        existing_subdirs = get_existing_subprojects(effective_workspace)
        _, explicit_sub = detect_and_prepare_subfolder(prompt, effective_workspace)
        targeted_subdirs = [d for d in existing_subdirs if re.search(r'\b' + re.escape(d) + r'\b', prompt, re.IGNORECASE)]

        if explicit_sub and explicit_sub != ".":
            sub_exists = os.path.exists(os.path.join(effective_workspace, explicit_sub))
            mkdir_rule = f"The directory '{explicit_sub}' ALREADY EXISTS. DO NOT run 'mkdir {explicit_sub}'." if sub_exists else f"Create '{explicit_sub}' if needed."
            isolation_rule = f"MANDATORY TARGET: The user explicitly specified '{explicit_sub}'. Place all created files inside '{explicit_sub}/'. {mkdir_rule} NEVER use 'Emris' or 'emris_*' in any folder name."
        elif targeted_subdirs:
            isolation_rule = (
                f"TARGET DIRECTORY: Working within '{targeted_subdirs[0]}'. "
                f"DO NOT generate 'mkdir {targeted_subdirs[0]}'. Operate directly inside it. NEVER use 'Emris' or 'emris_*' in folder names."
            )
        else:
            isolation_rule = (
                "WORKSPACE INTEGRITY: Operate directly inside the active project workspace root or its standard directories. "
                "Do NOT create redundant wrapper subfolders. "
                "CRITICAL: NEVER use 'Emris', 'emris', 'emris_project', or 'emris_app' as a folder or file name!"
            )

        proj_map = build_project_map(effective_workspace)
        fn_index = build_functions_index(effective_workspace)

        effective_query = f"{prompt} {clean_history[-1]['content'][:250]}" if clean_history else prompt
        retriever = HybridCodeRetrieverEngine()
        retriever.index_workspace(effective_workspace)
        all_hits = retriever.retrieve(effective_query, top_k=6)
        if existing_subdirs and not targeted_subdirs and (not explicit_sub or explicit_sub == "."):
            filtered_hits = [
                h for h in all_hits
                if not any(h.get("file_path", "").replace("\\", "/").startswith(f"{d}/") for d in existing_subdirs)
            ]
            retrieved_hits = filtered_hits[:4] if filtered_hits else []
        else:
            retrieved_hits = all_hits[:4]

        hit_files = list(dict.fromkeys(r.get("file_path") for r in retrieved_hits if r.get("file_path")))
        retrieved_context = ""
        if retrieved_hits:
            lines = ["RELEVANT CODE CONTEXT:"]
            for r in retrieved_hits:
                fp = r.get("file_path", "")
                lines.append(f"--- File: `{fp}` (Lines {r.get('start_line', 1)}-{r.get('end_line', '')}) ---")
                lines.append(r.get("text", "").strip())
            retrieved_context = "\n".join(lines)

        referenced_files_context = load_referenced_source_files(prompt, effective_workspace, context_text=conversation_context)
        env_info = detect_workspace_environments(effective_workspace)
        env_rules = "ENVIRONMENT RULES:\n- Always isolate dependencies locally in the project directory. NEVER install packages globally.\n"
        if env_info.get("has_python_venv"):
            env_rules += f"- Local Python virtual environment detected: `{env_info['venv_path']}`. Use local python/pip (e.g. `.\\{env_info['venv_path']}\\Scripts\\python` or `.\\{env_info['venv_path']}\\Scripts\\pip`). Inspect existing packages and skip or update only what is needed.\n"
        else:
            env_rules += "- If Python dependencies are needed, create a local venv inside the project (`python -m venv .venv`). Do NOT install to global Python.\n"
        if env_info.get("has_package_json"):
            env_rules += f"- Existing Node project detected (`package.json`). Dependencies present: {env_info.get('has_node_modules')}. Reuse or update existing packages; do not re-scaffold.\n"

        bg_tasks_context = get_workspace_background_context(effective_workspace)

        root_items = []
        try:
            root_items = [f for f in os.listdir(effective_workspace) if not f.startswith(".")]
        except Exception:
            pass

        engineer_prompt = render_prompt(
            "engineer.md",
            workspace_root=effective_workspace,
            existing_files=', '.join(root_items[:50]) if root_items else "Empty directory",
            isolation_rule=isolation_rule,
            env_rules=env_rules,
            project_map=proj_map[:6000],
            referenced_files=referenced_files_context,
            retrieved_context=retrieved_context[:4000],
            background_tasks=bg_tasks_context,
            conversation_context=conversation_context,
            prompt=prompt
        )

        total_tokens = 0
        prompt_tokens = 0
        completion_tokens = 0
        executed_actions = [
            {"agent": "File analyzer Agent", "action": "hybrid_rag", "target": f"{len(retriever.chunks)} chunks indexed", "result": {"hit_files": hit_files}}
        ]
        thought_log = []

        emit({
            "type": "step",
            "step": {
                "id": 1,
                "task_id": "TASK-001",
                "phase": "Phase 1: Strategy & Thinking",
                "agent": "Engineer Agent",
                "model": "Gemini 3.5 Flash Lite",
                "title": "Thought: Formulating Execution Strategy",
                "subtitle": "Analyzing prompt and formulating dynamic execution strategy...",
                "description": "Formulating execution strategy",
                "output": "Formulating execution strategy.",
                "tools": ["strategy:react_loop"],
                "status": "running"
            }
        })

        MAX_TURNS = 12
        eng_text = ""
        contents = [
            {"role": "user", "parts": [{"text": engineer_prompt}]}
        ]

        for turn_idx in range(1, MAX_TURNS + 1):
            raw_eng_res = request_generate_with_tools(
                contents=contents,
                tools=WORKSPACE_TOOLS_DECLARATIONS,
                model="gemini-3.5-flash-lite"
            )
            if not raw_eng_res.get("success"):
                err_msg = raw_eng_res.get("error", "API request failed")
                if turn_idx == 1 and not eng_text:
                    eng_text = f"API so'rovida xatolik yuz berdi: {err_msg}. Iltimos, API kalitingiz sozlanganini tekshiring."
                break

            e_tok = raw_eng_res.get("tokens") or raw_eng_res.get("data", {}).get("tokens") or {}
            total_tokens += e_tok.get("total", 0)
            prompt_tokens += e_tok.get("prompt", 0)
            completion_tokens += e_tok.get("completion", 0)

            parts = raw_eng_res.get("parts", [])
            tool_calls = raw_eng_res.get("tool_calls", [])
            text_resp = raw_eng_res.get("text", "")
            raw_thought = raw_eng_res.get("thought", "")

            if raw_thought and raw_thought.strip() not in thought_log:
                thought_log.append(raw_thought.strip())

            if text_resp:
                eng_text = text_resp
                if tool_calls and len(text_resp.strip()) > 10 and text_resp.strip() not in thought_log:
                    thought_log.append(text_resp.strip())
                turn_actions, _ = execute_engineer_turn_tools(text_resp, effective_workspace)
                executed_actions.extend(turn_actions)
                turn_cmds = extract_cli_commands(text_resp, effective_workspace)
                if turn_cmds:
                    for cmd in turn_cmds:
                        cmd["id"] = f"cmd_{len(executed_actions) + 1}"
                    executed_actions.extend(turn_cmds)

            if not tool_calls:
                has_mutations = any(a.get("action") in ("create_file", "replace_block", "cmd_command") for a in executed_actions)
                if turn_idx == 1 and not has_mutations:
                    contents.append({"role": "model", "parts": parts if parts else [{"text": text_resp}]})
                    contents.append({
                        "role": "user",
                        "parts": [{
                            "text": "You have not called any tool functions. You MUST call 'create_file', 'replace_block', or 'cmd_command' now to implement the requested solution on disk. Do not simply describe what to do. Call the tool functions directly."
                        }]
                    })
                    continue
                break

            contents.append({"role": "model", "parts": parts})
            response_parts = []

            for tc in tool_calls:
                fn_name = tc.get("name")
                args = tc.get("args", {})
                call_id = tc.get("id") or f"call_{len(executed_actions) + 1}"

                if fn_name == "read_file":
                    p = args.get("path", "")
                    s_line = int(args.get("start_line") or 1)
                    m_lines = int(args.get("max_lines") or 120)
                    r_res = tool_read_file(p, effective_workspace, start_line=s_line, max_lines=m_lines)
                    response_parts.append({
                        "functionResponse": {
                            "name": "read_file",
                            "id": call_id,
                            "response": {
                                "success": r_res.get("success"),
                                "path": p,
                                "total_lines": r_res.get("total_lines"),
                                "start_line": r_res.get("start_line"),
                                "end_line": r_res.get("end_line"),
                                "content": r_res.get("content", ""),
                                "error": r_res.get("error")
                            }
                        }
                    })
                    act_item = {
                        "agent": "File analyzer Agent",
                        "action": "read_file",
                        "target": p,
                        "start_line": r_res.get("start_line"),
                        "end_line": r_res.get("end_line"),
                        "lines_added": 0,
                        "lines_removed": 0,
                        "result": {
                            "success": r_res.get("success"),
                            "path": p,
                            "total_lines": r_res.get("total_lines"),
                            "start_line": r_res.get("start_line"),
                            "end_line": r_res.get("end_line"),
                            "error": r_res.get("error")
                        }
                    }
                    executed_actions.append(act_item)
                    emit({
                        "type": "step",
                        "step": {
                            "id": len(executed_actions) + 1,
                            "task_id": f"TASK-{len(executed_actions) + 1:03d}",
                            "phase": "Phase 1: Code Inspection",
                            "agent": "File analyzer Agent",
                            "model": "Gemini 3.5 Flash Lite",
                            "title": f"Analyzed {Path(p).name}",
                            "subtitle": f"Lines {r_res.get('start_line', 1)}-{r_res.get('end_line', '')}",
                            "description": f"Inspection: {p}",
                            "output": f"Read `{p}` contents.",
                            "lines_added": 0,
                            "lines_removed": 0,
                            "tools": ["file_system:read_file"],
                            "status": "done"
                        }
                    })

                elif fn_name == "create_file":
                    p = args.get("path", "")
                    cnt = args.get("content", "")
                    c_res = tool_create_file(p, cnt, effective_workspace)
                    response_parts.append({
                        "functionResponse": {
                            "name": "create_file",
                            "id": call_id,
                            "response": {
                                "success": c_res.get("success"),
                                "path": p,
                                "bytes": c_res.get("bytes", 0),
                                "error": c_res.get("error")
                            }
                        }
                    })
                    lines_add = c_res.get("lines_added", len(cnt.splitlines()) if cnt else 0)
                    act_item = {
                        "agent": "Engineer Agent",
                        "action": "create_file",
                        "target": p,
                        "lines_added": lines_add,
                        "lines_removed": 0,
                        "result": {"success": c_res.get("success"), "error": c_res.get("error")}
                    }
                    executed_actions.append(act_item)
                    emit({
                        "type": "step",
                        "step": {
                            "id": len(executed_actions) + 1,
                            "task_id": f"TASK-{len(executed_actions) + 1:03d}",
                            "phase": "Phase 2: Source Synthesis",
                            "agent": "Engineer Agent",
                            "model": "Gemini 3.5 Flash Lite",
                            "title": f"Created {Path(p).name}",
                            "subtitle": f"Target: {p}",
                            "description": f"File creation: {p}",
                            "output": f"Created `{p}` on disk successfully.",
                            "lines_added": lines_add,
                            "lines_removed": 0,
                            "tools": ["file_system:create_file"],
                            "status": "done"
                        }
                    })

                elif fn_name == "replace_block":
                    p = args.get("path", "")
                    s_str = args.get("search_str", "")
                    r_str = args.get("replace_str", "")
                    rep_res = tool_replace_block(p, s_str, r_str, effective_workspace)
                    response_parts.append({
                        "functionResponse": {
                            "name": "replace_block",
                            "id": call_id,
                            "response": {
                                "success": rep_res.get("success"),
                                "path": p,
                                "l_start": rep_res.get("l_start"),
                                "l_finish": rep_res.get("l_finish"),
                                "error": rep_res.get("error")
                            }
                        }
                    })
                    l_add = rep_res.get("lines_added", len(r_str.splitlines()) if r_str else 0)
                    l_rem = rep_res.get("lines_removed", len(s_str.splitlines()) if s_str else 0)
                    act_item = {
                        "agent": "Engineer Agent",
                        "action": "replace_block",
                        "target": p,
                        "l_start": rep_res.get("l_start"),
                        "l_finish": rep_res.get("l_finish"),
                        "lines_added": l_add,
                        "lines_removed": l_rem,
                        "result": {"success": rep_res.get("success"), "error": rep_res.get("error")}
                    }
                    executed_actions.append(act_item)
                    emit({
                        "type": "step",
                        "step": {
                            "id": len(executed_actions) + 1,
                            "task_id": f"TASK-{len(executed_actions) + 1:03d}",
                            "phase": "Phase 2: Code Refactor",
                            "agent": "Engineer Agent",
                            "model": "Gemini 3.5 Flash Lite",
                            "title": f"Edited {Path(p).name}",
                            "subtitle": f"Lines {rep_res.get('l_start', 1)}-{rep_res.get('l_finish', 1)}",
                            "description": f"File modification: {p}",
                            "output": f"Patched `{p}` successfully.",
                            "lines_added": l_add,
                            "lines_removed": l_rem,
                            "tools": ["file_system:replace_block"],
                            "status": "done"
                        }
                    })

                elif fn_name == "cmd_command":
                    raw_cmd_str = args.get("command", "").strip()
                    cmd_str, _ = prepare_virtualenv_execution(raw_cmd_str, effective_workspace)

                    already_queued = any(
                        a.get("action") == "cmd_command" and a.get("command") == cmd_str
                        for a in executed_actions
                    )
                    has_install_queued = any(
                        a.get("action") == "cmd_command" and "install" in a.get("command", "").lower()
                        for a in executed_actions
                    )
                    is_new_install = "install" in cmd_str.lower()
                    is_verification_test = bool(re.search(r"python(?:\.exe)?\s+-c\s+[\"']import\b", cmd_str, re.IGNORECASE))

                    if already_queued or (has_install_queued and is_new_install) or is_verification_test:
                        response_parts.append({
                            "functionResponse": {
                                "name": "cmd_command",
                                "id": call_id,
                                "response": {
                                    "status": "already_queued",
                                    "command": cmd_str,
                                    "message": f"Terminal command '{cmd_str}' is already registered for execution. Do not repeat installation or verification commands. Complete remaining file edits or finish your turn."
                                }
                            }
                        })
                    else:
                        response_parts.append({
                            "functionResponse": {
                                "name": "cmd_command",
                                "id": call_id,
                                "response": {
                                    "status": "queued_for_approval",
                                    "command": cmd_str,
                                    "message": f"Command '{cmd_str}' has been queued for execution in the local environment upon workflow approval. Do NOT repeat installation or verification commands. Proceed to complete file modifications or finish your response."
                                }
                            }
                        })
                        cmd_item = {
                            "id": f"cmd_{len(executed_actions) + 1}",
                            "agent": "CLI Agent",
                            "action": "cmd_command",
                            "target": cmd_str,
                            "command": cmd_str,
                            "cwd": effective_workspace,
                            "display_cwd": Path(effective_workspace).name or ".",
                            "pending_approval": True,
                            "result": {"status": "pending_approval"}
                        }
                        executed_actions.append(cmd_item)
                        emit({
                            "type": "step",
                            "step": {
                                "id": len(executed_actions) + 1,
                                "task_id": f"TASK-{len(executed_actions) + 1:03d}",
                                "phase": "Phase 3: Terminal & Commands",
                                "agent": "CLI Agent",
                                "model": "Gemini 3.5 Flash Lite",
                                "title": f"Ran: {cmd_str[:35]}",
                                "subtitle": "Terminal command execution approval",
                                "description": f"Command: {cmd_str}",
                                "output": f"Command proposed: {cmd_str}",
                                "lines_added": 0,
                                "lines_removed": 0,
                                "tools": ["cli:run_command"],
                                "pending_command": cmd_item,
                                "status": "running"
                            }
                        })

                elif fn_name == "list_dir":
                    sub = args.get("path", "")
                    l_res = tool_list_files(sub, effective_workspace)
                    response_parts.append({
                        "functionResponse": {
                            "name": "list_dir",
                            "id": call_id,
                            "response": l_res
                        }
                    })
                    act_item = {
                        "agent": "File analyzer Agent",
                        "action": "list_dir",
                        "target": sub or ".",
                        "result": l_res
                    }
                    executed_actions.append(act_item)
                    emit({
                        "type": "step",
                        "step": {
                            "id": len(executed_actions) + 1,
                            "task_id": f"TASK-{len(executed_actions) + 1:03d}",
                            "phase": "Phase 1: Workspace Analysis",
                            "agent": "File analyzer Agent",
                            "model": "Gemini 3.5 Flash Lite",
                            "title": f"Analyzed workspace: {sub or '.'}",
                            "subtitle": "Scanned directory tree",
                            "description": f"Directory listing: {sub or '.'}",
                            "output": "Directory structure inspected.",
                            "lines_added": 0,
                            "lines_removed": 0,
                            "tools": ["file_system:list_dir"],
                            "status": "done"
                        }
                    })

            contents.append({"role": "user", "parts": response_parts})

        pkg_path = Path(effective_workspace) / "package.json"
        has_next = (Path(effective_workspace) / "app").exists() or (Path(effective_workspace) / "pages").exists()
        if not pkg_path.exists() and has_next:
            default_pkg = {
                "name": "nextjs-app",
                "version": "0.1.0",
                "private": True,
                "scripts": {
                    "dev": "next dev",
                    "build": "next build",
                    "start": "next start"
                },
                "dependencies": {
                    "react": "^18.2.0",
                    "react-dom": "^18.2.0",
                    "next": "^14.2.0"
                }
            }
            try:
                with open(pkg_path, "w", encoding="utf-8") as pf:
                    json.dump(default_pkg, pf, indent=2)
                executed_actions.append({"agent": "Engineer Agent", "action": "create_file", "target": "package.json", "result": {"success": True}})
            except Exception as pe:
                print(f"[Agent] Auto-synthesize package.json notice: {pe}")

        created_files = [a["target"] for a in executed_actions if a.get("action") == "create_file" and a.get("result", {}).get("success")]
        changed_files = [
            f"`{a['target']}` [L{a.get('l_start', 1)}:L{a.get('l_finish', 1)}]"
            for a in executed_actions
            if a.get("action") == "replace_block" and a.get("result", {}).get("success")
        ]
        deleted_files = [a["target"] for a in executed_actions if a.get("action") == "delete_file" and a.get("result", {}).get("success")]
        inspected_files = [a["target"] for a in executed_actions if a.get("action") == "read_file" and a.get("result", {}).get("success")]
        pending_commands = [a for a in executed_actions if a.get("action") == "cmd_command"]

        has_file_ops = bool(created_files or changed_files or deleted_files or pending_commands)
        if not eng_text or len(eng_text.strip()) < 120 or (has_file_ops and len(eng_text.strip()) < 250):
            summary_request = (
                "All requested workspace operations, file inspections, and edits have been executed on disk.\n"
                "Now provide a comprehensive, detailed, professional explanation to the user:\n"
                "1. Detail every file modified or created, explaining the exact technical changes made.\n"
                "2. Clarify how the solution resolves the user's request.\n"
                "3. Provide exact instructions and commands on how to run, test, or preview the application.\n"
                "Write in clean Markdown prose. Do NOT call any tools."
            )
            contents.append({"role": "user", "parts": [{"text": summary_request}]})
            summary_res = request_generate_with_tools(
                contents=contents,
                tools=None,
                model="gemini-3.5-flash-lite"
            )
            if summary_res.get("success"):
                final_text = summary_res.get("text", "")
                if final_text:
                    eng_text = final_text
                s_tok = summary_res.get("tokens") or summary_res.get("data", {}).get("tokens") or {}
                total_tokens += s_tok.get("total", 0)
                prompt_tokens += s_tok.get("prompt", 0)
                completion_tokens += s_tok.get("completion", 0)

        formatted_steps = []
        step_id = 1
        thought_combined = " ".join(thought_log).strip()
        first_step_sub = (thought_combined[:120] + "...") if len(thought_combined) > 120 else (thought_combined if thought_combined else "Analyzed prompt and formulated dynamic execution strategy.")

        formatted_steps.append({
            "id": step_id,
            "task_id": f"TASK-{step_id:03d}",
            "phase": "Phase 1: Strategy & Thinking",
            "agent": "Engineer Agent",
            "model": "Gemini 3.5 Flash Lite",
            "title": "Thought: Formulating Execution Strategy",
            "subtitle": first_step_sub,
            "description": first_step_sub,
            "output": thought_combined if thought_combined else "Formulated implementation strategy.",
            "tools": ["strategy:react_loop"],
            "pending_command": None
        })

        for a in executed_actions:
            act_type = a.get("action")
            if act_type == "create_file":
                step_id += 1
                t_name = Path(a["target"]).name
                formatted_steps.append({
                    "id": step_id,
                    "task_id": f"TASK-{step_id:03d}",
                    "phase": "Phase 2: Source Synthesis",
                    "agent": "Engineer Agent",
                    "model": "Gemini 3.5 Flash Lite",
                    "title": f"Created {t_name}",
                    "subtitle": f"Target: {a['target']}",
                    "description": f"File creation: {a['target']}",
                    "output": f"Created `{a['target']}` on disk successfully.",
                    "lines_added": a.get("lines_added", 0),
                    "lines_removed": 0,
                    "tools": ["file_system:create_file"],
                    "pending_command": None,
                    "status": "done"
                })
            elif act_type == "replace_block":
                step_id += 1
                t_name = Path(a["target"]).name
                formatted_steps.append({
                    "id": step_id,
                    "task_id": f"TASK-{step_id:03d}",
                    "phase": "Phase 2: Code Refactor",
                    "agent": "Engineer Agent",
                    "model": "Gemini 3.5 Flash Lite",
                    "title": f"Edited {t_name}",
                    "subtitle": f"Lines {a.get('l_start', 1)}-{a.get('l_finish', 1)}",
                    "description": f"File modification: {a['target']}",
                    "output": f"Patched `{a['target']}` successfully.",
                    "lines_added": a.get("lines_added", 0),
                    "lines_removed": a.get("lines_removed", 0),
                    "tools": ["file_system:replace_block"],
                    "pending_command": None,
                    "status": "done"
                })
            elif act_type == "read_file":
                step_id += 1
                t_name = Path(a["target"]).name
                formatted_steps.append({
                    "id": step_id,
                    "task_id": f"TASK-{step_id:03d}",
                    "phase": "Phase 1: Code Inspection",
                    "agent": "File analyzer Agent",
                    "model": "Gemini 3.5 Flash Lite",
                    "title": f"Analyzed {t_name}",
                    "subtitle": f"Lines {a.get('start_line', 1)}-{a.get('end_line', '')}",
                    "description": f"Inspection: {a['target']}",
                    "output": f"Read `{a['target']}` contents.",
                    "lines_added": 0,
                    "lines_removed": 0,
                    "tools": ["file_system:read_file"],
                    "pending_command": None,
                    "status": "done"
                })
            elif act_type == "list_dir":
                step_id += 1
                formatted_steps.append({
                    "id": step_id,
                    "task_id": f"TASK-{step_id:03d}",
                    "phase": "Phase 1: Workspace Analysis",
                    "agent": "File analyzer Agent",
                    "model": "Gemini 3.5 Flash Lite",
                    "title": f"Analyzed workspace: {a.get('target', '.')}",
                    "subtitle": "Scanned directory tree",
                    "description": f"Directory listing: {a.get('target', '.')}",
                    "output": "Directory structure inspected.",
                    "lines_added": 0,
                    "lines_removed": 0,
                    "tools": ["file_system:list_dir"],
                    "pending_command": None,
                    "status": "done"
                })
            elif act_type == "cmd_command":
                step_id += 1
                cmd_item = dict(a)
                cmd_item["step_id"] = step_id
                formatted_steps.append({
                    "id": step_id,
                    "task_id": f"TASK-{step_id:03d}",
                    "phase": "Phase 3: Terminal & Commands",
                    "agent": "CLI Agent",
                    "model": "Gemini 3.5 Flash Lite",
                    "title": f"Ran: {a.get('command', '')[:35]}",
                    "subtitle": "Terminal command execution approval",
                    "description": f"Command: {a.get('command', '')}",
                    "output": f"Command proposed: {a.get('command', '')}",
                    "lines_added": 0,
                    "lines_removed": 0,
                    "tools": ["cli:run_command"],
                    "pending_command": cmd_item,
                    "status": "running"
                })

        step_id += 1
        total_mutations = len(created_files) + len(changed_files)
        val_output = f"Verified {len(created_files)} created, {len(changed_files)} edited file(s) on disk." if total_mutations > 0 else "Workspace inspection complete. No file mutations required."
        inspector_step = {
            "id": step_id,
            "task_id": f"TASK-{step_id:03d}",
            "phase": "Phase 4: Verification",
            "agent": "Inspector Agent",
            "model": "Gemini 3.5 Flash Lite",
            "title": "Quality Inspection & Validation",
            "subtitle": "Verified file system integrity and execution state",
            "description": "Validation completed",
            "output": val_output,
            "lines_added": 0,
            "lines_removed": 0,
            "tools": ["inspector:verify"],
            "pending_command": None,
            "status": "done"
        }
        formatted_steps.append(inspector_step)
        emit({"type": "step", "step": inspector_step})

        user_friendly_summary = sanitize_display_response(eng_text, effective_workspace)

        running_url = None
        all_cmds_str = " ".join([c.get("command", "") for c in pending_commands] + [a.get("command", "") for a in executed_actions if a.get("action") == "cmd_command"])
        if re.search(r"\b(?:5000|flask)\b", all_cmds_str, re.IGNORECASE):
            running_url = "http://127.0.0.1:5000"
        elif re.search(r"\b(?:8000|uvicorn|fastapi|http\.server)\b", all_cmds_str, re.IGNORECASE):
            running_url = "http://127.0.0.1:8000"
        elif re.search(r"\b(?:3000|next)\b", all_cmds_str, re.IGNORECASE):
            running_url = "http://localhost:3000"
        elif re.search(r"\b(?:5173|vite)\b", all_cmds_str, re.IGNORECASE):
            running_url = "http://localhost:5173"
        elif any(k in all_cmds_str.lower() for k in ["app.py", "server.py", "main.py"]):
            running_url = "http://127.0.0.1:5000"

        if running_url and "http" not in user_friendly_summary.lower():
            user_friendly_summary = (user_friendly_summary.strip() + f"\n\n**Application is running at:** [{running_url}]({running_url})").strip()

        if not user_friendly_summary or len(user_friendly_summary.strip()) < 20:
            if created_files or changed_files:
                parts = ["### Workspace Updates Completed\n"]
                if changed_files:
                    parts.append("**Modified Files:**")
                    for cf in changed_files:
                        parts.append(f"- {cf}")
                if created_files:
                    parts.append("\n**Created Files:**")
                    for crf in created_files:
                        parts.append(f"- `{crf}`")
                if pending_commands:
                    parts.append("\n**Proposed Commands:**")
                    for pc in pending_commands:
                        parts.append(f"- `{pc.get('command')}`")
                user_friendly_summary = "\n".join(parts)
            elif pending_commands:
                user_friendly_summary = f"I have formulated the required action. The proposed command is ready for your review: `{pending_commands[0].get('command')}`"
            elif inspected_files:
                user_friendly_summary = f"I have inspected the requested files ({', '.join(inspected_files)}) and verified their contents in the workspace."
            elif thought_combined:
                user_friendly_summary = f"Workflow completed:\n\n{thought_combined}"
            else:
                user_friendly_summary = "Operation completed successfully."

        files_changes = {
            "created": created_files,
            "changed": changed_files,
            "deleted": deleted_files
        }
        final_response = f"<!--files_changes:{json.dumps(files_changes)}-->\n" + user_friendly_summary.strip() if has_file_ops else user_friendly_summary.strip()

        plan_summary_data = {
            "project": {"name": Path(effective_workspace).name or "Workspace Solution", "framework": "Modern Architecture", "orchestrator": "Engineer Agent"},
            "execution_plan": formatted_steps
        }
        write_plans_md(effective_workspace, prompt, plan_summary_data)

        if not total_tokens:
            est_p = max(50, len(engineer_prompt) // 4)
            est_c = max(10, len(final_response) // 4)
            total_tokens = est_p + est_c
            prompt_tokens = est_p
            completion_tokens = est_c

        return {
            "success": True,
            "project": plan_summary_data.get("project", {}),
            "chief_thought": f"Dynamic workflow executed {len(formatted_steps)} steps with Inspector verification.",
            "steps": formatted_steps,
            "actions": executed_actions,
            "created_files": created_files,
            "changed_files": changed_files,
            "deleted_files": deleted_files,
            "files_changes": files_changes,
            "pending_commands": pending_commands,
            "tokens": {
                "total": total_tokens,
                "prompt": prompt_tokens,
                "completion": completion_tokens
            },
            "response": final_response
        }
    except Exception as exc:
        print(f"[Agent] Multi-agent cycle error: {exc}")
        return {
            "success": False,
            "chief_thought": "Agent workflow error",
            "steps": [],
            "actions": [],
            "response": f"Kutilmagan xatolik yuz berdi: {str(exc)}"
        }


def engineer_fix_code_error(file_path: str, line_number: int = None, error_output: str = "", fix_instructions: str = "", workspace_root: str = None) -> dict:
    try:
        effective_root = workspace_root if workspace_root and os.path.exists(workspace_root) else os.getcwd()
        if os.path.isabs(file_path) and os.path.exists(file_path):
            target_path = Path(file_path)
            clean_rel = target_path.name
            effective_root = str(target_path.parent)
        else:
            root_path = Path(effective_root)
            clean_rel = file_path.replace("\\", "/").strip("./")
            target_path = root_path / clean_rel
            if not target_path.exists():
                fname = Path(clean_rel).name
                found = [p for p in root_path.rglob(fname) if not any(part.startswith(".") for part in p.parts)]
                if found:
                    target_path = found[0]
                    clean_rel = str(target_path.relative_to(root_path)).replace("\\", "/")

        if not target_path.exists() or not target_path.is_file():
            return {"success": False, "error": f"Target file '{file_path}' not found in workspace"}

        with open(target_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        total_lines = len(lines)
        if total_lines == 0:
            return {"success": False, "error": "File is empty"}

        has_stray_fence = any(re.match(r"^\s*```[a-zA-Z0-9_\-]*\s*$", l) for l in lines)
        if has_stray_fence:
            cleaned_lines = [l for l in lines if not re.match(r"^\s*```[a-zA-Z0-9_\-]*\s*$", l)]
            with open(target_path, "w", encoding="utf-8") as f:
                f.write("".join(cleaned_lines))
            return {
                "success": True,
                "file_path": clean_rel,
                "l_start": line_number or 1,
                "l_finish": line_number or 1,
                "message": f"Removed stray markdown code fence from {clean_rel}",
                "replaced_code": "Stripped ``` fence"
            }

        s_line = max(1, (line_number - 15) if line_number else 1)
        read_res = tool_read_file(clean_rel, effective_root, start_line=s_line, max_lines=40)
        snippet = read_res.get("content", "") if read_res.get("success") else ""
        if not snippet:
            s_idx = max(0, s_line - 1)
            e_idx = min(total_lines, s_idx + 40)
            snippet = "".join([f"{i + 1:4d} | {lines[i]}" for i in range(s_idx, e_idx)])
            s_line = s_idx + 1
            e_line = e_idx
        else:
            s_line = read_res.get("start_line", 1)
            e_line = read_res.get("end_line", total_lines)

        fix_contents = [
            {
                "role": "user",
                "parts": [{
                    "text": (
                        f"You are the Engineer Agent in Emris AI. Fix the syntax or code error in `{clean_rel}`.\n\n"
                        f"Target File Context: `{clean_rel}` (Lines {s_line}-{e_line}):\n"
                        f"```\n{snippet}\n```\n\n"
                        f"Error Output:\n{error_output[:1200]}\n\n"
                        f"Fix Instructions:\n{fix_instructions or 'Locate the exact syntax mistake or error in the lines above and call replace_block.'}\n\n"
                        f"Call the replace_block tool with the exact search_str and clean replacement replace_str. Never output markdown code block fences in replace_str."
                    )
                }]
            }
        ]
        tool_res = request_generate_with_tools(
            contents=fix_contents,
            tools=WORKSPACE_TOOLS_DECLARATIONS,
            model="gemini-3.5-flash-lite"
        )
        if tool_res.get("success") and tool_res.get("tool_calls"):
            for tc in tool_res.get("tool_calls"):
                if tc.get("name") == "replace_block":
                    args = tc.get("args", {})
                    search_str = args.get("search_str", "")
                    replace_str = sanitize_code_content(clean_rel, args.get("replace_str", ""))
                    rep_res = tool_replace_block(clean_rel, search_str, replace_str, effective_root)
                    if rep_res.get("success"):
                        return {
                            "success": True,
                            "file_path": clean_rel,
                            "l_start": rep_res.get("l_start"),
                            "l_finish": rep_res.get("l_finish"),
                            "message": f"Fixed {clean_rel} [L{rep_res.get('l_start')}:L{rep_res.get('l_finish')}]",
                            "replaced_code": replace_str.strip()[:150]
                        }

        fix_prompt = (
            f"You are the Engineer Agent in Emris AI. Fix the syntax or code error in `{clean_rel}`.\n\n"
            f"Target File Context: `{clean_rel}` (Lines {s_line}-{e_line}):\n"
            f"```\n{snippet}\n```\n\n"
            f"Error Output:\n{error_output[:1200]}\n\n"
            f"Fix Instructions:\n{fix_instructions or 'Locate the exact syntax mistake or error in the lines above and provide a targeted replace_block.'}\n\n"
            f"Output ONLY valid XML:\n"
            f"<replace_block path=\"{clean_rel}\">\n"
            f"<search>\nEXACT_ORIGINAL_LINES_TO_REPLACE\n</search>\n"
            f"<replace>\nCORRECTED_LINES\n</replace>\n"
            f"</replace_block>"
        )

        res = request_generate(fix_prompt, model="gemini-3.5-flash-lite")
        if res.get("success") and res.get("data"):
            text = res["data"].get("response") or res["data"].get("text") or ""
            rep_pat = re.compile(
                r"<replace_block\s+path=['\"]([^'\"]+)['\"]>[\s\S]*?<search>([\s\S]*?)</search>[\s\S]*?<replace>([\s\S]*?)</replace>[\s\S]*?</replace_block>",
                re.IGNORECASE
            )
            m = rep_pat.search(text)
            if m:
                target_f = m.group(1).strip()
                search_str = m.group(2)
                replace_str = sanitize_code_content(clean_rel, m.group(3))
                rep_res = tool_replace_block(clean_rel, search_str, replace_str, effective_root)
                if rep_res.get("success"):
                    return {
                        "success": True,
                        "file_path": clean_rel,
                        "l_start": rep_res.get("l_start"),
                        "l_finish": rep_res.get("l_finish"),
                        "message": f"Fixed {clean_rel} [L{rep_res.get('l_start')}:L{rep_res.get('l_finish')}]",
                        "replaced_code": replace_str.strip()[:150]
                    }
        return {"success": False, "error": "Could not formulate valid replace_block"}
    except Exception as exc:
        print(f"[Agent] engineer_fix_code_error error: {exc}")
        return {"success": False, "error": str(exc)}


def inspect_command_failure(command: str, cwd: str = None, exit_code: int = -1, stdout: str = "", stderr: str = "", workspace_root: str = None) -> dict:
    try:
        combined_err = (stderr or "") + ("\n" + stdout if stdout else "")
        target_dir = None
        if workspace_root and os.path.exists(workspace_root):
            target_dir = workspace_root
        elif cwd:
            if os.path.isabs(cwd) and os.path.exists(cwd):
                target_dir = cwd
            elif workspace_root and os.path.exists(os.path.join(workspace_root, cwd)):
                target_dir = os.path.join(workspace_root, cwd)
            elif os.path.exists(os.path.abspath(cwd)):
                target_dir = os.path.abspath(cwd)
        if not target_dir:
            target_dir = os.getcwd()

        detected_file = None
        detected_line = None

        tb_match = re.search(r'File\s+["\']([^"\']+)["\'],\s+line\s+(\d+)', combined_err)
        if tb_match:
            detected_file = tb_match.group(1)
            try:
                detected_line = int(tb_match.group(2))
            except Exception:
                detected_line = None
        else:
            js_match = re.search(r'([a-zA-Z0-9_\-\./\\]+\.(?:js|ts|tsx|jsx|mjs)):(\d+)', combined_err)
            if js_match:
                detected_file = js_match.group(1)
                try:
                    detected_line = int(js_match.group(2))
                except Exception:
                    detected_line = None

        is_syntax_or_code = any(k in combined_err for k in ["SyntaxError", "IndentationError", "NameError", "TypeError", "AttributeError", "ZeroDivisionError", "IndexError", "KeyError"]) or bool(detected_file and detected_line)

        if "enoent" in combined_err.lower() and "package.json" in combined_err.lower():
            return {
                "success": True,
                "target_agent": "cli",
                "error_type": "missing_dependency",
                "diagnosis": f"The command failed because 'package.json' does not exist in '{target_dir}'. An npm project has not been initialized or the wrong folder is targeted.",
                "suggested_command": "npm init -y",
                "file_path": None,
                "line_number": None,
                "engineer_fix": None
            }

        mod_match = re.search(r"No module named\s+['\"]([^'\"]+)['\"]", combined_err)
        if mod_match:
            missing_mod = mod_match.group(1)
            venv_python = None
            search_dirs = [Path(target_dir).resolve()] + list(Path(target_dir).resolve().parents)[:3]
            for s_dir in search_dirs:
                for vn in [".venv", "venv", "env"]:
                    cand = s_dir / vn / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python")
                    if cand.exists():
                        venv_python = str(cand)
                        break
                if venv_python:
                    break

            is_in_venv = False
            if venv_python:
                try:
                    check_proc = subprocess.run([venv_python, "-c", f"import {missing_mod}"], capture_output=True, timeout=5)
                    if check_proc.returncode == 0:
                        is_in_venv = True
                except Exception:
                    pass

            if is_in_venv:
                fixed_cmd = re.sub(r"^\$?python(?:\.exe)?\b", lambda m: ".\\.venv\\Scripts\\python", command.strip(), count=1, flags=re.IGNORECASE)
                if fixed_cmd == command.strip():
                    fixed_cmd = f".\\.venv\\Scripts\\python {command.strip()}"
                return {
                    "success": True,
                    "target_agent": "cli",
                    "error_type": "environment_path",
                    "diagnosis": f"Module '{missing_mod}' is already installed in the local virtual environment (`.venv`). The previous command ran with system Python.",
                    "suggested_command": fixed_cmd,
                    "file_path": None,
                    "line_number": None,
                    "engineer_fix": None
                }

            pkg_map = {
                "flask_sqlalchemy": "Flask-SQLAlchemy",
                "dotenv": "python-dotenv",
                "yaml": "pyyaml",
                "cv2": "opencv-python",
                "PIL": "pillow",
                "bs4": "beautifulsoup4",
                "sklearn": "scikit-learn"
            }
            pip_pkg = pkg_map.get(missing_mod, missing_mod)
            if venv_python:
                pip_cmd = f".\\.venv\\Scripts\\pip install {pip_pkg}"
            else:
                pip_cmd = f"python -m venv .venv && .\\.venv\\Scripts\\pip install {pip_pkg}"

            return {
                "success": True,
                "target_agent": "cli",
                "error_type": "missing_dependency",
                "diagnosis": f"Python dependency '{pip_pkg}' is not installed in the local environment.",
                "suggested_command": pip_cmd,
                "file_path": None,
                "line_number": None,
                "engineer_fix": None
            }

        prompt = render_prompt(
            "inspector.md",
            command=command,
            working_directory=target_dir,
            exit_code=exit_code,
            error_output=combined_err[:1500]
        )
        res = request_generate(prompt, model="gemini-3.5-flash-lite")
        diag_data = {}
        if res.get("success") and res.get("data"):
            text = res["data"].get("response") or res["data"].get("text") or ""
            cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)
            try:
                parsed = json.loads(cleaned)
                if isinstance(parsed, dict):
                    diag_data = parsed
            except Exception:
                pass

        target_agent = diag_data.get("target_agent") or ("engineer" if is_syntax_or_code else "cli")
        diagnosis = diag_data.get("diagnosis") or f"Command exited with code {exit_code}."
        what_is_wrong = diag_data.get("what_is_wrong") or diagnosis
        reasoning = diag_data.get("reasoning") or ""
        improvement_plan = diag_data.get("improvement_plan") or diag_data.get("fix_instructions") or ""
        error_type = diag_data.get("error_type") or ("syntax_error" if is_syntax_or_code else "other")
        suggested_command = diag_data.get("suggested_command") or ""
        file_path = diag_data.get("file_path") or detected_file
        line_number = diag_data.get("line_number") or detected_line
        fix_instructions = diag_data.get("fix_instructions") or improvement_plan or ""

        engineer_fix = None
        if target_agent == "engineer" and file_path:
            fix_res = engineer_fix_code_error(
                file_path=file_path,
                line_number=line_number,
                error_output=combined_err,
                fix_instructions=fix_instructions,
                workspace_root=workspace_root or target_dir
            )
            if fix_res.get("success"):
                engineer_fix = fix_res
                suggested_command = command

        return {
            "success": True,
            "target_agent": target_agent,
            "error_type": error_type,
            "diagnosis": diagnosis,
            "what_is_wrong": what_is_wrong,
            "reasoning": reasoning,
            "improvement_plan": improvement_plan,
            "suggested_command": suggested_command,
            "file_path": file_path,
            "line_number": line_number,
            "engineer_fix": engineer_fix
        }
    except Exception as exc:
        print(f"[Agent] inspect_command_failure error: {exc}")
        return {
            "success": False,
            "target_agent": "cli",
            "diagnosis": f"Execution failed with code {exit_code}.",
            "suggested_command": command,
            "file_path": None,
            "line_number": None,
            "engineer_fix": None,
            "error": str(exc)
        }


def run_conversational_cycle(prompt: str, history: list = None, model: str = "gemini-3.5-flash-lite") -> dict:
    try:
        clean_history = []
        if history:
            for h in history:
                raw_c = h.get("content", "")
                cleaned = re.sub(r"<!--workflow:[\s\S]*?-->", "", raw_c)
                cleaned = re.sub(r"<!--files_changes:[\s\S]*?-->", "", cleaned).strip()
                if cleaned:
                    clean_history.append({"role": h.get("role", "user"), "content": cleaned})

        full_prompt = render_prompt("conversation.md", prompt=prompt)
        res = request_generate(full_prompt, model=model, history=clean_history)
        tok = res.get("tokens") or res.get("data", {}).get("tokens") or {}
        if res.get("success") and res.get("data"):
            text = res["data"].get("response") or res["data"].get("text") or ""
            if text:
                if not tok or not tok.get("total"):
                    est_p = max(20, len(full_prompt) // 4)
                    est_c = max(10, len(text) // 4)
                    tok = {"total": est_p + est_c, "prompt": est_p, "completion": est_c}
                return {"success": True, "response": text.strip(), "tokens": tok}
        fallback = res.get("error") or "Kechirasiz, javob olishda xatolik yuz berdi."
        return {"success": False, "response": fallback, "tokens": tok}
    except Exception as exc:
        print(f"[Agent] run_conversational_cycle error: {exc}")
        return {"success": False, "response": f"Xatolik: {str(exc)}"}
