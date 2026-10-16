import hashlib
import hmac
import json
import os
import time
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

ACTIVE_CREDENTIALS = {
    "gemini": os.getenv("GEMINI_API_KEY", ""),
    "kilo": os.getenv("KILO_API_KEY", ""),
    "models": {}
}


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
    except Exception as exc:
        print(f"[Gateway] Registry MachineGuid read fallback: {exc}")

    try:
        from backend.database import db
        saved_id = db.get_setting("device_id", "")
        if saved_id:
            return saved_id
        new_id = uuid.uuid4().hex
        db.set_setting("device_id", new_id)
        return new_id
    except Exception as exc:
        print(f"[Gateway] Database device_id fallback: {exc}")
        return "device_" + uuid.uuid4().hex[:12]


def get_desktop_secret() -> str:
    return os.getenv("EMRIS_DESKTOP_SECRET", "emris_desktop_secret_2026")


def get_base_gateway_url() -> str:
    return os.getenv(
        "EMRIS_GATEWAY_URL",
        "https://www.suniyintellekt.uz/api/desktop"
    ).rstrip("/")


def compute_signature(device_id: str, timestamp: int, body_json: str, secret_key: str) -> str:
    try:
        raw_message = f"{device_id}:{timestamp}:{body_json}"
        signature = hmac.new(
            secret_key.encode("utf-8"),
            raw_message.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        return signature
    except Exception as exc:
        print(f"[Gateway] Error computing HMAC signature: {exc}")
        return ""


def update_credentials_cache(data: dict):
    try:
        if not isinstance(data, dict):
            return
        keys = data.get("keys") or data.get("credentials") or {}
        if isinstance(keys, dict):
            if keys.get("gemini"):
                ACTIVE_CREDENTIALS["gemini"] = str(keys["gemini"]).strip()
            if keys.get("kilo"):
                ACTIVE_CREDENTIALS["kilo"] = str(keys["kilo"]).strip()
            if keys.get("models"):
                ACTIVE_CREDENTIALS["models"] = keys["models"]
            print("[Gateway] Remote credentials updated successfully.")
    except Exception as exc:
        print(f"[Gateway] Error caching credentials: {exc}")


def get_active_credentials() -> dict:
    return {
        "gemini": ACTIVE_CREDENTIALS.get("gemini") or os.getenv("GEMINI_API_KEY", ""),
        "kilo": ACTIVE_CREDENTIALS.get("kilo") or os.getenv("KILO_API_KEY", ""),
        "models": ACTIVE_CREDENTIALS.get("models") or {}
    }


def fetch_remote_keys() -> dict:
    try:
        base_url = get_base_gateway_url()
        url = f"{base_url}/keys"
        device_id = get_persistent_device_id()
        timestamp = int(time.time())
        secret_key = get_desktop_secret()
        body_json = "{}"
        signature = compute_signature(device_id, timestamp, body_json, secret_key)

        headers = {
            "Content-Type": "application/json",
            "X-Device-ID": device_id,
            "X-Timestamp": str(timestamp),
            "X-Signature": signature,
            "User-Agent": "EmrisAIDesktop/1.1"
        }

        print(f"[Gateway] Fetching remote keys from: {url}")
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            update_credentials_cache(data)
            return {"success": True, "data": data}
    except Exception as exc:
        print(f"[Gateway] Key fetch note: {exc}")
        return {"success": False, "error": str(exc)}


def check_gateway_health() -> dict:
    try:
        base_url = get_base_gateway_url()
        url = f"{base_url}/health"
        print(f"[Gateway] Checking health at: {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "EmrisAIDesktop/1.1"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {"online": True, "data": data}
    except Exception as exc:
        print(f"[Gateway] Health check failed: {exc}")
        return {"online": False, "error": str(exc)}


def get_device_quota() -> dict:
    try:
        base_url = get_base_gateway_url()
        url = f"{base_url}/quota"
        device_id = get_persistent_device_id()
        timestamp = int(time.time())
        secret_key = get_desktop_secret()
        body_json = "{}"
        signature = compute_signature(device_id, timestamp, body_json, secret_key)

        headers = {
            "Content-Type": "application/json",
            "X-Device-ID": device_id,
            "X-Timestamp": str(timestamp),
            "X-Signature": signature,
            "User-Agent": "EmrisAIDesktop/1.1"
        }

        req = urllib.request.Request(url, data=body_json.encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            update_credentials_cache(data)
            return data
    except urllib.error.HTTPError as err:
        err_msg = err.read().decode("utf-8", errors="ignore")
        print(f"[Gateway] Quota HTTP error {err.code}: {err_msg}")
        return {"error": f"HTTP {err.code}: {err_msg}", "code": err.code}
    except Exception as exc:
        print(f"[Gateway] Quota error: {exc}")
        return {"error": str(exc)}


def generate_with_gemini_direct(prompt: str, model: str = "gemini-3.5-flash-lite", history: list = None) -> dict:
    try:
        api_key = os.getenv("GEMINI_API_KEY", "")
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
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidate = data.get("candidates", [{}])[0]
            text = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
            return {"success": True, "data": {"response": text, "text": text}}
    except Exception as exc:
        print(f"[Gateway] Gemini direct error: {exc}")
        return {"success": False, "error": str(exc)}


def request_generate(prompt: str, model: str = "gemini-3.5-flash-lite", history: list = None) -> dict:
    try:
        direct_res = generate_with_gemini_direct(prompt, model, history)
        if direct_res.get("success") and direct_res.get("data"):
            return direct_res
    except Exception as exc:
        print(f"[Gateway] Direct generation attempt notice: {exc}")

    try:
        base_url = get_base_gateway_url()
        url = f"{base_url}/generate"
        device_id = get_persistent_device_id()
        timestamp = int(time.time())
        secret_key = get_desktop_secret()

        payload = {
            "prompt": prompt,
            "model": model,
            "history": history or []
        }
        body_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        signature = compute_signature(device_id, timestamp, body_json, secret_key)

        headers = {
            "Content-Type": "application/json; charset=utf-8",
            "X-Device-ID": device_id,
            "X-Timestamp": str(timestamp),
            "X-Signature": signature,
            "User-Agent": "EmrisAIDesktop/1.1"
        }

        req = urllib.request.Request(
            url,
            data=body_json.encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            resp_body = resp.read().decode("utf-8")
            data = json.loads(resp_body)
            update_credentials_cache(data)
            return {"success": True, "data": data}
    except urllib.error.HTTPError as err:
        err_msg = err.read().decode("utf-8", errors="ignore")
        print(f"[Gateway] Generate HTTP Error {err.code}: {err_msg}")
        try:
            parsed = json.loads(err_msg)
            return {"success": False, "code": err.code, "error": parsed}
        except:
            return {"success": False, "code": err.code, "error": err_msg}
    except Exception as exc:
        print(f"[Gateway] Generate request failed: {exc}")
        return {"success": False, "error": str(exc)}
