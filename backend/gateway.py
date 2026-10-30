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
        from backend.database import db
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
            if text:
                return {"success": True, "data": {"response": text, "text": text}}
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
            if text:
                return {"success": True, "data": {"response": text, "text": text}}
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
