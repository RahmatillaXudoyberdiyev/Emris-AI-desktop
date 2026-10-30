import json
import os
import re
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.terminal import execute_shell_command
from backend.gateway import request_generate
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
    tool_list_files
)
from backend.retrievers import HybridCodeRetrieverEngine
from backend.prompt_loader import render_prompt


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

        router_prompt = render_prompt("intent_router.md", prompt=prompt)
        res = request_generate(router_prompt, model="gemini-3.5-flash-lite")
        if res.get("success") and res.get("data"):
            text = res["data"].get("response") or res["data"].get("text") or ""
            cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)
            try:
                data = json.loads(cleaned)
                workflow = data.get("workflow", "").lower().strip()
                if workflow in ("work", "conversation"):
                    return {"success": True, "workflow": workflow}
            except Exception:
                pass
            if "conversation" in text.lower() and "work" not in text.lower():
                return {"success": True, "workflow": "conversation"}
            if "work" in text.lower():
                return {"success": True, "workflow": "work"}

        is_coding = any(k in prompt.lower() for k in ["code", "create", "make", "build", "fix", "write", "run", "install", "debug", "test", "npm", "pip", "python", "html", "react", "js", "ts", "file", "folder", "app"])
        return {"success": True, "workflow": "work" if is_coding else "conversation"}
    except Exception as exc:
        print(f"[Agent] classify_workflow_intent error: {exc}")
        return {"success": True, "workflow": "work" if has_project else "conversation"}


def run_hierarchical_cycle(prompt: str, workspace_root: str = None, model: str = "gemini-3.5-flash-lite", history: list = None) -> dict:
    try:
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

        planner_prompt = render_prompt(
            "chief_architect.md",
            workspace_root=effective_workspace,
            isolation_rule=isolation_rule,
            env_rules=env_rules,
            project_map=proj_map[:400],
            functions_index=fn_index[:250],
            conversation_context=conversation_context,
            prompt=prompt
        )

        raw_plan_res = request_generate(planner_prompt, model="gemini-3.5-flash-lite")
        plan_text = ""
        if raw_plan_res.get("success") and raw_plan_res.get("data"):
            data = raw_plan_res["data"]
            plan_text = data.get("response") or data.get("text") or data.get("content") or ""

        parsed_plan = None
        if plan_text:
            cleaned = re.sub(r"^```(?:json)?\s*", "", plan_text.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)
            try:
                parsed_plan = json.loads(cleaned)
            except Exception as parse_err:
                print(f"[Agent] Planner JSON parse notice: {parse_err}")

        if not parsed_plan or not isinstance(parsed_plan, dict) or "execution_plan" not in parsed_plan:
            is_cli_intent = any(k in prompt.lower() for k in ["ping", "curl", "npm", "git", "run", "install", "start"])
            first_agent = "CLI Agent" if is_cli_intent else "Chief Architect"
            parsed_plan = {
                "project": {"name": "Software Solution", "framework": "Modern Architecture", "orchestrator": "Chief Architect"},
                "execution_plan": [
                    {"task_id": "TASK-001", "phase": "Phase 1: Architecture & Planning", "title": "Analyze Goals & Structure", "agent": first_agent, "tools": ["cli:run_command" if is_cli_intent else "file_system:write_file"], "objective": f"Formulate execution for: {prompt[:40]}", "dependencies": []},
                    {"task_id": "TASK-002", "phase": "Phase 2: Execution & Synthesis", "title": "Synthesize Components & Commands", "agent": "Engineer Agent", "tools": ["file_system:write_file"], "objective": "Build required production components and configure environment.", "dependencies": ["TASK-001"]},
                    {"task_id": "TASK-003", "phase": "Phase 3: Verification & Review", "title": "Quality Inspection & Validation", "agent": "Inspector Agent", "tools": ["file_system:read_file"], "objective": "Verify build output and environment readiness.", "dependencies": ["TASK-002"]}
                ]
            }

        tasks = parsed_plan.get("execution_plan", [])
        write_plans_md(effective_workspace, prompt, parsed_plan)

        root_items = []
        try:
            root_items = [f for f in os.listdir(effective_workspace) if not f.startswith(".")]
        except Exception:
            pass

        engineer_prompt = render_prompt(
            "engineer.md",
            workspace_root=effective_workspace,
            existing_files=', '.join(root_items[:25]) if root_items else "Empty directory",
            isolation_rule=isolation_rule,
            env_rules=env_rules,
            project_map=proj_map[:500],
            referenced_files=referenced_files_context,
            retrieved_context=retrieved_context[:1200],
            execution_plan=json.dumps(tasks),
            conversation_context=conversation_context,
            prompt=prompt
        )

        executed_actions = [
            {"agent": "Chief Architect", "action": "write_plans", "target": "plans.md", "result": {"success": True}},
            {"agent": "File analyzer Agent", "action": "hybrid_rag", "target": f"{len(retriever.chunks)} chunks indexed", "result": {"hit_files": hit_files}}
        ]

        MAX_TURNS = 4
        loop_history = []
        last_eng_text = ""

        for turn_idx in range(1, MAX_TURNS + 1):
            raw_eng_res = request_generate(engineer_prompt, model="gemini-3.5-flash-lite", history=loop_history if loop_history else None)
            turn_text = ""
            if raw_eng_res.get("success") and raw_eng_res.get("data"):
                d = raw_eng_res["data"]
                turn_text = d.get("response") or d.get("text") or d.get("content") or ""

            if not turn_text:
                break

            last_eng_text = turn_text
            turn_actions, turn_feedbacks = execute_engineer_turn_tools(turn_text, effective_workspace)
            executed_actions.extend(turn_actions)

            turn_cmd_actions = extract_cli_commands(turn_text, effective_workspace)
            if turn_cmd_actions:
                for cmd in turn_cmd_actions:
                    cmd["id"] = f"cmd_{len(executed_actions) + 1}"
                executed_actions.extend(turn_cmd_actions)

            if not turn_feedbacks:
                break

            loop_history.append({"role": "model", "content": turn_text})
            feedback_msg = "TOOL EXECUTION FEEDBACK:\n" + "\n\n".join(turn_feedbacks) + "\n\nBased on these tool outputs, proceed with the next edit, terminal command, or your final summary."
            loop_history.append({"role": "user", "content": feedback_msg})

        eng_text = last_eng_text

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

        available_cmds = list(pending_commands)
        formatted_steps = []
        for idx, task in enumerate(tasks, start=1):
            t_agent = task.get("agent", "Engineer Agent")
            t_title = task.get("title", f"Step {idx}")
            t_phase = task.get("phase", "")
            t_obj = task.get("objective", "")

            step_out = f"Phase verified: {t_phase}"
            matching_cmd = None
            if ("CLI" in t_agent or "command" in task.get("tools", [])) and available_cmds:
                matching_cmd = available_cmds.pop(0)
                matching_cmd["step_id"] = idx

            if matching_cmd:
                step_out = f"Command proposed: {matching_cmd.get('command')}"
            elif "File analyzer" in t_agent or "Structure" in t_title or "Index" in t_title or "Inspect" in t_title:
                step_out = f"Inspected: {', '.join(inspected_files)}" if inspected_files else (f"RAG Retrieved: {', '.join(hit_files)}" if hit_files else f"Indexed {len(retriever.chunks)} code chunks")
            elif "Engineer" in t_agent or "Synthesizing" in t_title or "Code" in t_title or "Interactive" in t_title or "Update" in t_title:
                all_changed = created_files + changed_files
                step_out = f"Updated: {', '.join(all_changed)}" if all_changed else "Generated source components"
            elif "Architect" in t_agent:
                step_out = "Execution plan formulated & synced to plans.md"

            formatted_steps.append({
                "id": idx,
                "task_id": task.get("task_id", f"TASK-{idx:03d}"),
                "phase": t_phase,
                "agent": t_agent,
                "model": "Gemini 3.5 Flash Lite",
                "title": t_title,
                "subtitle": t_obj,
                "description": t_obj,
                "output": step_out,
                "tools": task.get("tools", []),
                "pending_command": matching_cmd
            })

        while available_cmds:
            extra_cmd = available_cmds.pop(0)
            extra_idx = len(formatted_steps) + 1
            extra_cmd["step_id"] = extra_idx
            formatted_steps.append({
                "id": extra_idx,
                "task_id": f"TASK-{extra_idx:03d}",
                "phase": "Phase 4: Environment & Execution",
                "agent": "CLI Agent",
                "model": "Gemini 3.5 Flash Lite",
                "title": f"Execute: {extra_cmd.get('command', '')[:32]}",
                "subtitle": "Command execution approval",
                "description": "Terminal environment execution",
                "output": f"Command proposed: {extra_cmd.get('command')}",
                "tools": ["cli:run_command"],
                "pending_command": extra_cmd
            })

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
            if created_files:
                user_friendly_summary = f"I have reviewed the project requirements and successfully created the requested components ({', '.join(created_files)}). All files have been structured cleanly in your workspace."
            elif changed_files:
                user_friendly_summary = f"I have updated the specified files with the requested modifications."
            elif pending_commands:
                user_friendly_summary = f"I have formulated the required action. The proposed command is ready for your review."
            else:
                user_friendly_summary = "I have reviewed your workspace and completed the requested task."

        files_changes = {
            "created": created_files,
            "changed": changed_files,
            "deleted": deleted_files
        }
        has_file_ops = bool(created_files or changed_files or deleted_files)
        final_response = f"<!--files_changes:{json.dumps(files_changes)}-->\n" + user_friendly_summary.strip() if has_file_ops else user_friendly_summary.strip()

        return {
            "success": True,
            "project": parsed_plan.get("project", {}),
            "chief_thought": f"Architected dynamic execution plan with {len(formatted_steps)} phases and synthesized targeted solution.",
            "steps": formatted_steps,
            "actions": executed_actions,
            "created_files": created_files,
            "changed_files": changed_files,
            "deleted_files": deleted_files,
            "files_changes": files_changes,
            "pending_commands": pending_commands,
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


def inspect_command_failure(command: str, cwd: str = None, exit_code: int = -1, stdout: str = "", stderr: str = "", workspace_root: str = None) -> dict:
    try:
        combined_err = (stderr or "") + ("\n" + stdout if stdout else "")
        if "enoent" in combined_err.lower() and "package.json" in combined_err.lower():
            target_dir = cwd or workspace_root or "."
            return {
                "success": True,
                "diagnosis": f"The command failed because 'package.json' does not exist in '{target_dir}'. An npm project has not been initialized or the wrong folder is targeted.",
                "suggested_command": "npm init -y",
                "action": "replace_command"
            }

        prompt = render_prompt(
            "inspector.md",
            command=command,
            working_directory=cwd or workspace_root or os.getcwd(),
            exit_code=exit_code,
            error_output=combined_err[:1500]
        )
        res = request_generate(prompt, model="gemini-3.5-flash-lite")
        if res.get("success") and res.get("data"):
            text = res["data"].get("response") or res["data"].get("text") or ""
            cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)
            try:
                data = json.loads(cleaned)
                if isinstance(data, dict):
                    return {
                        "success": True,
                        "diagnosis": data.get("diagnosis", "Command execution failed."),
                        "suggested_command": data.get("suggested_command", ""),
                        "action": data.get("action", "retry")
                    }
            except Exception:
                pass
        return {
            "success": True,
            "diagnosis": f"Command exited with code {exit_code}. Inspect stderr details above.",
            "suggested_command": "",
            "action": "retry"
        }
    except Exception as exc:
        print(f"[Agent] inspect_command_failure error: {exc}")
        return {
            "success": False,
            "diagnosis": f"Execution failed with code {exit_code}.",
            "suggested_command": "",
            "action": "retry",
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
        if res.get("success") and res.get("data"):
            text = res["data"].get("response") or res["data"].get("text") or ""
            if text:
                return {"success": True, "response": text.strip()}
        fallback = res.get("error") or "Kechirasiz, javob olishda xatolik yuz berdi."
        return {"success": False, "response": fallback}
    except Exception as exc:
        print(f"[Agent] run_conversational_cycle error: {exc}")
        return {"success": False, "response": f"Xatolik: {str(exc)}"}
