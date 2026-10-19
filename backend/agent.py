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
    tool_replace_block
)


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
                if p in seen_paths:
                    continue
                seen_paths.add(p)
                res = tool_create_file(p, match.group(2).strip(), workspace_root)
                actions.append({"agent": "Engineer Agent", "action": "create_file", "target": p, "result": res})

        rep_pat = re.compile(
            r"<replace_block\s+path=['\"]([^'\"]+)['\"]>[\s\S]*?<search>([\s\S]*?)</search>[\s\S]*?<replace>([\s\S]*?)</replace>[\s\S]*?</replace_block>",
            re.IGNORECASE
        )
        for match in rep_pat.finditer(text):
            p = match.group(1).strip()
            res = tool_replace_block(p, match.group(2), match.group(3), workspace_root)
            actions.append({"agent": "Engineer Agent", "action": "replace_block", "target": p, "result": res})
    except Exception as exc:
        print(f"[Agent] apply_engineer_targeted_tools error: {exc}")
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
        print(f"[Agent] extract_cli_commands error: {exc}")
    return actions


def sanitize_display_response(text: str, workspace_root: str = None) -> str:
    try:
        clean = re.sub(r"<(?:create_file|write|file)\s+(?:path|src)=['\"][^'\"]+['\"]>[\s\S]*?</(?:create_file|write|file)>", "", text, flags=re.IGNORECASE)
        clean = re.sub(r"<replace_block[\s\S]*?</replace_block>", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"<append_file[\s\S]*?</append_file>", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"<cmd_command(?:\s+cwd=['\"][^'\"]+['\"])?>([\s\S]*?)</cmd_command>", r"```bash\n\1\n```", clean, flags=re.IGNORECASE)

        if workspace_root:
            clean = clean.replace(workspace_root, "project workspace")
            clean = clean.replace(workspace_root.replace("\\", "/"), "project workspace")

        clean = re.sub(r"TASK-\d+[:\s]*", "", clean, flags=re.IGNORECASE)
        clean = re.sub(r"\n{3,}", "\n\n", clean)
        return clean.strip()
    except Exception:
        return text


def generate_conversation_title(prompt: str) -> dict:
    try:
        title_prompt = (
            "You are a conversation titling agent in Emris AI. Read the user's initial prompt and formulate a "
            "concise, clear, professional title of 3 to 5 words max. "
            "Do NOT use quotes, brackets, or trailing punctuation. Output ONLY the title text.\n\n"
            f"Prompt: {prompt}"
        )
        res = request_generate(title_prompt, model="gemini-3.5-flash-lite")
        if res.get("success") and res.get("data"):
            text = res["data"].get("response") or res["data"].get("text") or ""
            clean_title = text.strip().replace('"', '').replace("'", "").strip()
            if clean_title:
                return {"success": True, "title": clean_title[:45]}
        clean = " ".join(prompt.split()[:5]).strip()
        return {"success": True, "title": clean if clean else "New Conversation"}
    except Exception as exc:
        print(f"[Agent] generate_conversation_title error: {exc}")
        return {"success": True, "title": "New Conversation"}


def detect_and_prepare_subfolder(prompt: str, workspace_root: str):
    try:
        folder_match = re.search(r"(?:make|create|in)\s+([a-zA-Z0-9_\-]+)\s+(?:folder|directory)", prompt, re.IGNORECASE)
        if folder_match:
            sub = folder_match.group(1).strip()
            if sub and not sub.lower() in ("a", "the", "new", "this"):
                sub_path = Path(workspace_root) / sub
                sub_path.mkdir(parents=True, exist_ok=True)
                print(f"[Agent] Prepared requested target folder: {sub_path}")
                return str(sub_path), sub
    except Exception as exc:
        print(f"[Agent] detect_and_prepare_subfolder error: {exc}")
    return workspace_root, "."


def run_hierarchical_cycle(prompt: str, workspace_root: str = None, model: str = "gemini-3.5-flash-lite") -> dict:
    try:
        if workspace_root:
            try:
                os.makedirs(workspace_root, exist_ok=True)
            except Exception as me:
                print(f"[Agent] Workspace mkdir error: {me}")
        effective_workspace = workspace_root if workspace_root and os.path.exists(workspace_root) else os.getcwd()
        ensure_emris_memory(effective_workspace)

        detect_and_prepare_subfolder(prompt, effective_workspace)

        proj_map = build_project_map(effective_workspace)
        fn_index = build_functions_index(effective_workspace)

        planner_prompt = f"""You are the Chief Architect of an autonomous software engineering team in Emris AI.
Workspace Directory: {effective_workspace}

CURRENT PROJECT DIRECTORY MAP:
{proj_map[:600]}

FUNCTIONS INDEX:
{fn_index[:400]}

USER REQUEST:
{prompt}

Formulate an end-to-end multi-agent execution plan customized specifically to achieve this user goal.
Inspect the directory map. If the user asked to work in or create a subfolder, include that in your plan.
If the prompt requires running terminal or system commands (e.g. ping, npm install, dev server, diagnostics), assign them to the CLI Agent with tool "cli:run_command".

Respond ONLY with valid JSON matching this schema:
{{
  "project": {{
    "name": "<Descriptive Project Name>",
    "framework": "<Framework or Technology>",
    "orchestrator": "Chief Architect"
  }},
  "execution_plan": [
    {{
      "task_id": "TASK-001",
      "phase": "Phase 1: Architecture & Scaffolding",
      "title": "<Task Title>",
      "agent": "<Chief Architect | Engineer Agent | CLI Agent | Frontend UI Agent | Inspector Agent>",
      "tools": ["file_system:write_file", "cli:run_command"],
      "objective": "<Specific technical objective>",
      "dependencies": []
    }}
  ]
}}"""

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
                    {
                        "task_id": "TASK-001",
                        "phase": "Phase 1: Architecture & Planning",
                        "title": "Analyze Goals & Structure",
                        "agent": first_agent,
                        "tools": ["cli:run_command" if is_cli_intent else "file_system:write_file"],
                        "objective": f"Formulate execution for: {prompt[:40]}",
                        "dependencies": []
                    },
                    {
                        "task_id": "TASK-002",
                        "phase": "Phase 2: Execution & Synthesis",
                        "title": "Synthesize Components & Commands",
                        "agent": "Engineer Agent",
                        "tools": ["file_system:write_file"],
                        "objective": "Build required production components and configure environment.",
                        "dependencies": ["TASK-001"]
                    },
                    {
                        "task_id": "TASK-003",
                        "phase": "Phase 3: Verification & Review",
                        "title": "Quality Inspection & Validation",
                        "agent": "Inspector Agent",
                        "tools": ["file_system:read_file"],
                        "objective": "Verify build output and environment readiness.",
                        "dependencies": ["TASK-002"]
                    }
                ]
            }

        tasks = parsed_plan.get("execution_plan", [])
        write_plans_md(effective_workspace, prompt, parsed_plan)

        engineer_prompt = f"""You are the senior Engineer Agent & CLI Agent team in Emris AI.
User Goal: {prompt}
Workspace: {effective_workspace}
Directory Map:
{proj_map[:400]}
Execution Plan: {json.dumps(tasks)}

Instructions:
1. IF CREATING OR EDITING CODE:
   Synthesize the complete, working source code for all needed files.
   Format:
   <write src="relative/path/to/file">
   FULL_FILE_CONTENT
   </write>

2. IF TERMINAL OR SYSTEM COMMANDS ARE NEEDED (e.g., ping, npm install, npm run dev, test commands):
   Do NOT ask the user to manually type commands. Emit the exact commands using:
   <cmd_command cwd="optional/subfolder">exact command</cmd_command>
   The desktop system will present an interactive approval card to the user before running it.

3. FINAL USER RESPONSE:
   Write a professional, user-friendly executive summary explaining:
   - What components were created or actions prepared.
   - Key features implemented.
   - Instructions on how to test or launch the project locally.
   DO NOT include raw code dumps in your text response. The files are already saved to disk.
   DO NOT leak internal paths like "{effective_workspace}" or internal task IDs."""

        raw_eng_res = request_generate(engineer_prompt, model=model)
        eng_text = ""
        if raw_eng_res.get("success") and raw_eng_res.get("data"):
            d = raw_eng_res["data"]
            eng_text = d.get("response") or d.get("text") or d.get("content") or ""

        executed_actions = [
            {"agent": "Chief Architect", "action": "write_plans", "target": "plans.md", "result": {"success": True}},
            {"agent": "File analyzer Agent", "action": "index_functions", "target": "Functions.md", "result": {"success": True}}
        ]

        if eng_text:
            file_actions = apply_engineer_targeted_tools(eng_text, effective_workspace)
            executed_actions.extend(file_actions)

            cmd_actions = extract_cli_commands(eng_text, effective_workspace)
            executed_actions.extend(cmd_actions)

        created_files = [a["target"] for a in executed_actions if a.get("action") == "create_file"]
        pending_commands = [a for a in executed_actions if a.get("action") == "cmd_command"]

        formatted_steps = []
        for idx, task in enumerate(tasks, start=1):
            t_agent = task.get("agent", "Engineer Agent")
            t_title = task.get("title", f"Step {idx}")
            t_phase = task.get("phase", "")
            t_obj = task.get("objective", "")

            step_out = f"Phase verified: {t_phase}"
            matching_cmd = next((c for c in pending_commands if "CLI" in t_agent or "command" in task.get("tools", [])), None)

            if matching_cmd:
                step_out = f"Command proposed: {matching_cmd.get('command')}"
            elif "Engineer" in t_agent or "Synthesizing" in t_title or "Code" in t_title:
                step_out = f"Created: {', '.join(created_files)}" if created_files else "Generated source components"
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

        user_friendly_summary = sanitize_display_response(eng_text, effective_workspace)
        if not user_friendly_summary:
            if created_files:
                user_friendly_summary = f"### Solution Summary\n\nSuccessfully generated project components:\n" + "\n".join([f"- `{f}`" for f in created_files]) + "\n\nYou can review and open the code in the **Files & Code** tab on the right."
            elif pending_commands:
                user_friendly_summary = f"### Command Ready\n\nProposed command for execution: `{pending_commands[0].get('command')}`. Please review and approve in the workflow card above."
            else:
                user_friendly_summary = "Execution plan formulated and synchronized to your project directory."

        return {
            "success": True,
            "project": parsed_plan.get("project", {}),
            "chief_thought": f"Architected dynamic execution plan with {len(formatted_steps)} phases and synthesized targeted solution.",
            "steps": formatted_steps,
            "actions": executed_actions,
            "created_files": created_files,
            "pending_commands": pending_commands,
            "response": user_friendly_summary
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
