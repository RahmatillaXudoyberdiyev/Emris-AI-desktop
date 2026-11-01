import os
import sys
from pathlib import Path

_prompt_cache = {}


def resolve_prompt_file_path(filename: str) -> Path | None:
    try:
        local_app_data = os.environ.get("LOCALAPPDATA")
        if local_app_data:
            installed_path = Path(local_app_data) / "Programs" / "EmrisAI" / "prompts" / filename
            if installed_path.exists():
                return installed_path

        app_data = os.environ.get("APPDATA")
        if app_data:
            custom_path = Path(app_data) / "EmrisAI" / "prompts" / filename
            if custom_path.exists():
                return custom_path

        if getattr(sys, "frozen", False):
            if hasattr(sys, "_MEIPASS"):
                meipass_path = Path(sys._MEIPASS) / "backend" / "prompts" / filename
                if meipass_path.exists():
                    return meipass_path
                alt_meipass = Path(sys._MEIPASS) / "prompts" / filename
                if alt_meipass.exists():
                    return alt_meipass
            exe_parent = Path(sys.executable).resolve().parent
            internal_prompts = exe_parent / "_internal" / "backend" / "prompts" / filename
            if internal_prompts.exists():
                return internal_prompts
            alt_internal = exe_parent / "_internal" / "prompts" / filename
            if alt_internal.exists():
                return alt_internal

        dev_path = Path(__file__).resolve().parent / "prompts" / filename
        if dev_path.exists():
            return dev_path

        alt_dev_path = Path(__file__).resolve().parent.parent / "backend" / "prompts" / filename
        if alt_dev_path.exists():
            return alt_dev_path

        return None
    except Exception as exc:
        print(f"[PromptLoader] Error resolving path for {filename}: {exc}")
        return None


def load_prompt_template(filename: str) -> str:
    try:
        if filename in _prompt_cache:
            return _prompt_cache[filename]

        target_file = resolve_prompt_file_path(filename)
        if target_file and target_file.exists():
            with open(target_file, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                _prompt_cache[filename] = content
                return content

        print(f"[PromptLoader] Warning: prompt file not found: {filename}")
        return ""
    except Exception as exc:
        print(f"[PromptLoader] Error loading {filename}: {exc}")
        return ""


def render_prompt(filename: str, **kwargs) -> str:
    try:
        template = load_prompt_template(filename)
        if not template:
            return ""
        rendered = template
        for k, v in kwargs.items():
            placeholder = f"{{{k}}}"
            rendered = rendered.replace(placeholder, str(v) if v is not None else "")
        return rendered
    except Exception as exc:
        print(f"[PromptLoader] Error rendering {filename}: {exc}")
        return ""
