import json
import os
import urllib.error
import urllib.request
import uuid
import winreg
from pathlib import Path


def _load_env_file():
    try:
        env_path = Path(__file__).resolve().parent.parent / ".env"
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip()
    except Exception as exc:
        print(f"[Gateway] Env load notice: {exc}")

_load_env_file()


def get_persistent_device_id() -> str:
    try:
        reg_key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Cryptography"
        )
        guid, _ = winreg.QueryValueEx(reg_key, "MachineGuid")
        winreg.CloseKey(reg_key)
        if guid and len(str(guid).strip()) > 0:
            return str(guid).strip()
    except Exception:
        pass

    try:
        try:
            from backend.database import db
        except ImportError:
            from database import db
        saved_id = db.get_setting("device_id", "")
        if saved_id:
            return saved_id
        new_id = uuid.uuid4().hex
        db.set_setting("device_id", new_id)
        return new_id
    except Exception:
        return "device_" + uuid.uuid4().hex[:12]


def get_active_credentials() -> dict:
    gemini_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("EMRIS_DESKTOP_GEMINI_KEY", "")
    groq_key = os.getenv("GROQ_API_KEY", "")
    kilo_key = os.getenv("KILO_API_KEY", "")
    return {
        "gemini": gemini_key,
        "groq": groq_key,
        "kilo": kilo_key,
        "models": {}
    }


def fetch_remote_keys() -> dict:
    creds = get_active_credentials()
    return {"success": True, "keys": creds}


def check_gateway_health() -> dict:
    return {"online": True, "service": "Local Direct Engine"}


def get_device_quota() -> dict:
    return {"unlimited": True, "remaining": 999, "limit": 999}


def generate_with_gemini_direct(prompt: str, model: str = "gemini-3.5-flash-lite", history: list = None) -> dict:
    try:
        api_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("EMRIS_DESKTOP_GEMINI_KEY", "")
        if not api_key:
            return {"success": False, "error": "No GEMINI_API_KEY configured"}
        model_name = "gemini-3.5-flash-lite"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        contents = []
        if history:
            for h in history:
                role = "user" if h.get("role") == "user" else "model"
                contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})
        payload = {
            "contents": contents,
            "generationConfig": {"temperature": 0.2}
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidate = data.get("candidates", [{}])[0]
            text = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
            usage = data.get("usageMetadata", {})
            tokens = {
                "total": usage.get("totalTokenCount", 0),
                "prompt": usage.get("promptTokenCount", 0),
                "completion": usage.get("candidatesTokenCount", 0)
            }
            if text:
                return {
                    "success": True,
                    "tokens": tokens,
                    "data": {"response": text, "text": text, "tokens": tokens}
                }
        return {"success": False, "error": "Empty response from Gemini"}
    except Exception as exc:
        print(f"[Gateway] Gemini direct error: {exc}")
        return {"success": False, "error": str(exc)}


def generate_with_groq_direct(prompt: str, model: str = "llama-3.3-70b-versatile", history: list = None) -> dict:
    try:
        groq_key = os.getenv("GROQ_API_KEY", "")
        if not groq_key:
            return {"success": False, "error": "No GROQ_API_KEY configured"}
        url = "https://api.groq.com/openai/v1/chat/completions"
        msgs = []
        if history:
            for h in history:
                msgs.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        msgs.append({"role": "user", "content": prompt})
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": msgs,
            "temperature": 0.2
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {groq_key}"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            choice = data.get("choices", [{}])[0]
            text = choice.get("message", {}).get("content", "")
            usage = data.get("usage", {})
            tokens = {
                "total": usage.get("total_tokens", 0),
                "prompt": usage.get("prompt_tokens", 0),
                "completion": usage.get("completion_tokens", 0)
            }
            if text:
                return {
                    "success": True,
                    "tokens": tokens,
                    "data": {"response": text, "text": text, "tokens": tokens}
                }
        return {"success": False, "error": "Empty response from Groq"}
    except Exception as exc:
        print(f"[Gateway] Groq fallback error: {exc}")
        return {"success": False, "error": str(exc)}


def request_generate(prompt: str, model: str = "gemini-3.5-flash-lite", history: list = None) -> dict:
    gem_res = generate_with_gemini_direct(prompt, model, history)
    if gem_res.get("success") and gem_res.get("data"):
        return gem_res

    groq_res = generate_with_groq_direct(prompt, "llama-3.3-70b-versatile", history)
    if groq_res.get("success") and groq_res.get("data"):
        return groq_res

    return gem_res


def generate_with_gemini_tools(contents: list, tools: list = None, model: str = "gemini-3.5-flash-lite") -> dict:
    try:
        api_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("EMRIS_DESKTOP_GEMINI_KEY", "")
        if not api_key:
            return {"success": False, "error": "No GEMINI_API_KEY configured"}
        model_name = "gemini-3.5-flash-lite"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "contents": contents,
            "generationConfig": {"temperature": 0.2}
        }
        if tools:
            payload["tools"] = tools
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if not candidates:
                return {"success": False, "error": "Empty candidates from Gemini"}
            cand = candidates[0]
            parts = cand.get("content", {}).get("parts", [])
            tool_calls = []
            text_parts = []
            thought_parts = []
            for p in parts:
                if "functionCall" in p:
                    fc = p["functionCall"]
                    tool_calls.append({
                        "name": fc.get("name", ""),
                        "args": fc.get("args", {}),
                        "id": fc.get("id", "")
                    })
                elif p.get("thought") or p.get("thoughtProcess"):
                    thought_parts.append(p.get("text", ""))
                elif "text" in p:
                    text_parts.append(p.get("text", ""))
            raw_text = "".join(text_parts)
            raw_thought = "".join(thought_parts)
            usage = data.get("usageMetadata", {})
            tokens = {
                "total": usage.get("totalTokenCount", 0),
                "prompt": usage.get("promptTokenCount", 0),
                "completion": usage.get("candidatesTokenCount", 0)
            }
            return {
                "success": True,
                "parts": parts,
                "tool_calls": tool_calls,
                "text": raw_text,
                "thought": raw_thought,
                "tokens": tokens,
                "data": {"response": raw_text, "text": raw_text, "thought": raw_thought, "tokens": tokens}
            }
    except Exception as exc:
        print(f"[Gateway] Gemini tools error: {exc}")
        return {"success": False, "error": str(exc)}


def generate_with_groq_tools(contents: list, tools: list = None, model: str = "llama-3.3-70b-versatile") -> dict:
    try:
        groq_key = os.getenv("GROQ_API_KEY", "")
        if not groq_key:
            return {"success": False, "error": "No GROQ_API_KEY configured"}
        url = "https://api.groq.com/openai/v1/chat/completions"
        msgs = []
        for c in contents:
            role = c.get("role", "user")
            parts = c.get("parts", [])
            for p in parts:
                if "text" in p:
                    msgs.append({"role": role if role in ("user", "assistant", "system") else ("assistant" if role == "model" else "user"), "content": p["text"]})
                elif "functionCall" in p:
                    fc = p["functionCall"]
                    msgs.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [{
                            "id": fc.get("id") or "call_1",
                            "type": "function",
                            "function": {"name": fc.get("name", ""), "arguments": json.dumps(fc.get("args", {}))}
                        }]
                    })
                elif "functionResponse" in p:
                    fr = p["functionResponse"]
                    msgs.append({
                        "role": "tool",
                        "tool_call_id": fr.get("id") or "call_1",
                        "content": json.dumps(fr.get("response", {}))
                    })
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": msgs,
            "temperature": 0.2
        }
        if tools and len(tools) > 0 and "function_declarations" in tools[0]:
            groq_tools = []
            for fd in tools[0]["function_declarations"]:
                groq_tools.append({
                    "type": "function",
                    "function": {
                        "name": fd.get("name", ""),
                        "description": fd.get("description", ""),
                        "parameters": {
                            "type": "object",
                            "properties": fd.get("parameters", {}).get("properties", {}),
                            "required": fd.get("parameters", {}).get("required", [])
                        }
                    }
                })
            payload["tools"] = groq_tools
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {groq_key}"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            choice = data.get("choices", [{}])[0]
            msg = choice.get("message", {})
            raw_text = msg.get("content") or ""
            raw_tc = msg.get("tool_calls") or []
            tool_calls = []
            parts = []
            if raw_text:
                parts.append({"text": raw_text})
            for tc in raw_tc:
                fn = tc.get("function", {})
                args = {}
                try:
                    args = json.loads(fn.get("arguments", "{}"))
                except Exception:
                    pass
                tool_calls.append({
                    "name": fn.get("name", ""),
                    "args": args,
                    "id": tc.get("id", "")
                })
                parts.append({
                    "functionCall": {
                        "name": fn.get("name", ""),
                        "args": args,
                        "id": tc.get("id", "")
                    }
                })
            usage = data.get("usage", {})
            tokens = {
                "total": usage.get("total_tokens", 0),
                "prompt": usage.get("prompt_tokens", 0),
                "completion": usage.get("completion_tokens", 0)
            }
            return {
                "success": True,
                "parts": parts,
                "tool_calls": tool_calls,
                "text": raw_text,
                "tokens": tokens,
                "data": {"response": raw_text, "text": raw_text, "tokens": tokens}
            }
    except Exception as exc:
        print(f"[Gateway] Groq tools error: {exc}")
        return {"success": False, "error": str(exc)}


def request_generate_with_tools(contents: list, tools: list = None, model: str = "gemini-3.5-flash-lite") -> dict:
    gem_res = generate_with_gemini_tools(contents, tools, model)
    if gem_res.get("success"):
        return gem_res

    groq_res = generate_with_groq_tools(contents, tools, "llama-3.3-70b-versatile")
    if groq_res.get("success"):
        return groq_res

    return gem_res
