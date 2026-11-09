import os
import re
import json
import time
import shutil
import hashlib
from pathlib import Path

def _get_snapshots_base_dir() -> Path:
    app_data = os.getenv("APPDATA") or os.path.expanduser("~")
    base = Path(app_data) / "EmrisAI" / "snapshots"
    base.mkdir(parents=True, exist_ok=True)
    return base

def _get_project_slug(workspace_root: str) -> str:
    if not workspace_root:
        return "default"
    norm = os.path.abspath(workspace_root).lower().replace("\\", "/")
    h = hashlib.sha256(norm.encode("utf-8")).hexdigest()[:12]
    name = re.sub(r"[^a-zA-Z0-9_\-]", "_", Path(workspace_root).name or "project")
    return f"{name}_{h}"

def _get_project_snapshots_dir(workspace_root: str) -> Path:
    slug = _get_project_slug(workspace_root)
    proj_dir = _get_snapshots_base_dir() / slug
    proj_dir.mkdir(parents=True, exist_ok=True)
    return proj_dir

def list_checkpoints(workspace_root: str, limit: int = 10) -> list:
    try:
        if not workspace_root or not os.path.exists(workspace_root):
            return []
        proj_dir = _get_project_snapshots_dir(workspace_root)
        checkpoints = []
        for entry in os.scandir(proj_dir):
            if entry.is_dir():
                manifest_file = Path(entry.path) / "manifest.json"
                if manifest_file.exists():
                    try:
                        with open(manifest_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            checkpoints.append(data)
                    except Exception as err:
                        print(f"[Snapshots] Read manifest error: {err}")
        checkpoints.sort(key=lambda c: c.get("timestamp", 0), reverse=True)
        return checkpoints[:limit]
    except Exception as exc:
        print(f"[Snapshots] list_checkpoints error: {exc}")
        return []

def init_checkpoint(workspace_root: str, prompt: str, message_id: str = None) -> dict:
    try:
        if not workspace_root or not os.path.exists(workspace_root):
            return None
        proj_dir = _get_project_snapshots_dir(workspace_root)
        ts = int(time.time() * 1000)
        chk_id = f"chk_{ts}"
        chk_dir = proj_dir / chk_id
        chk_dir.mkdir(parents=True, exist_ok=True)

        manifest = {
            "id": chk_id,
            "timestamp": ts,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts / 1000)),
            "workspace_root": os.path.abspath(workspace_root),
            "prompt": prompt[:300] if prompt else "Prompt execution",
            "message_id": message_id,
            "files": {},
            "redo_state": None,
            "is_reverted": False
        }
        with open(chk_dir / "manifest.json", "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        print(f"[Snapshots] Initialized checkpoint {chk_id} for {workspace_root}")
        return manifest
    except Exception as exc:
        print(f"[Snapshots] init_checkpoint error: {exc}")
        return None

def record_pre_mutation(workspace_root: str, rel_path: str, checkpoint_id: str = None) -> bool:
    try:
        if not workspace_root or not rel_path:
            return False
        proj_dir = _get_project_snapshots_dir(workspace_root)
        target_chk = checkpoint_id
        if not target_chk:
            subdirs = [d for d in os.scandir(proj_dir) if d.is_dir()]
            if not subdirs:
                return False
            subdirs.sort(key=lambda d: d.name, reverse=True)
            target_chk = subdirs[0].name

        chk_dir = proj_dir / target_chk
        manifest_file = chk_dir / "manifest.json"
        if not manifest_file.exists():
            return False

        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        clean_rel = os.path.normpath(rel_path).replace("\\", "/")
        if clean_rel in manifest.get("files", {}):
            return True

        full_path = Path(workspace_root) / clean_rel
        file_store_dir = chk_dir / "pre_files"
        file_store_dir.mkdir(parents=True, exist_ok=True)

        if full_path.exists() and full_path.is_file():
            dest = file_store_dir / clean_rel.replace("/", "__")
            shutil.copy2(full_path, dest)
            manifest["files"][clean_rel] = {
                "action": "modify",
                "exists_before": True,
                "shadow_file": dest.name,
                "original_lines": len(full_path.read_text(encoding="utf-8", errors="replace").splitlines())
            }
        else:
            manifest["files"][clean_rel] = {
                "action": "create",
                "exists_before": False,
                "shadow_file": None,
                "original_lines": 0
            }

        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        return True
    except Exception as exc:
        print(f"[Snapshots] record_pre_mutation error: {exc}")
        return False

def finalize_checkpoint(workspace_root: str, checkpoint_id: str = None, diff_summary: dict = None) -> bool:
    try:
        if not workspace_root or not os.path.exists(workspace_root):
            return False
        proj_dir = _get_project_snapshots_dir(workspace_root)
        target_chk = checkpoint_id
        if not target_chk:
            subdirs = [d for d in os.scandir(proj_dir) if d.is_dir()]
            if not subdirs:
                return False
            subdirs.sort(key=lambda d: d.name, reverse=True)
            target_chk = subdirs[0].name

        chk_dir = proj_dir / target_chk
        manifest_file = chk_dir / "manifest.json"
        if manifest_file.exists():
            with open(manifest_file, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if diff_summary:
                manifest["diff_summary"] = diff_summary
            with open(manifest_file, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)

        all_dirs = [d for d in os.scandir(proj_dir) if d.is_dir()]
        all_dirs.sort(key=lambda d: d.name, reverse=True)
        if len(all_dirs) > 10:
            for old_dir in all_dirs[10:]:
                try:
                    shutil.rmtree(old_dir.path, ignore_errors=True)
                    print(f"[Snapshots] Pruned older checkpoint {old_dir.name}")
                except Exception as p_err:
                    print(f"[Snapshots] Prune notice: {p_err}")
        return True
    except Exception as exc:
        print(f"[Snapshots] finalize_checkpoint error: {exc}")
        return False

def revert_checkpoint(workspace_root: str, checkpoint_id: str) -> dict:
    try:
        if not workspace_root or not checkpoint_id:
            return {"success": False, "error": "Invalid workspace or checkpoint ID"}
        proj_dir = _get_project_snapshots_dir(workspace_root)
        chk_dir = proj_dir / checkpoint_id
        manifest_file = chk_dir / "manifest.json"
        if not manifest_file.exists():
            return {"success": False, "error": f"Checkpoint {checkpoint_id} not found"}

        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        redo_dir = chk_dir / "redo_files"
        redo_dir.mkdir(parents=True, exist_ok=True)
        redo_files = {}

        for rel_path, meta in manifest.get("files", {}).items():
            full_path = Path(workspace_root) / rel_path
            if full_path.exists() and full_path.is_file():
                dest = redo_dir / rel_path.replace("/", "__")
                shutil.copy2(full_path, dest)
                redo_files[rel_path] = {
                    "action": "restore",
                    "shadow_file": dest.name
                }
            else:
                redo_files[rel_path] = {
                    "action": "delete",
                    "shadow_file": None
                }

        reverted_items = []
        for rel_path, meta in manifest.get("files", {}).items():
            full_path = Path(workspace_root) / rel_path
            if meta.get("exists_before"):
                shadow_name = meta.get("shadow_file")
                source_file = chk_dir / "pre_files" / shadow_name
                if source_file.exists():
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_file, full_path)
                    reverted_items.append({"file": rel_path, "action": "reverted_to_original"})
            else:
                if full_path.exists():
                    try:
                        if full_path.is_file():
                            full_path.unlink()
                        elif full_path.is_dir():
                            shutil.rmtree(full_path, ignore_errors=True)
                        reverted_items.append({"file": rel_path, "action": "removed_new_file"})
                    except Exception as del_err:
                        print(f"[Snapshots] File remove error: {del_err}")

        manifest["redo_state"] = {
            "timestamp": int(time.time() * 1000),
            "files": redo_files
        }
        manifest["is_reverted"] = True
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        print(f"[Snapshots] Successfully reverted checkpoint {checkpoint_id}: {len(reverted_items)} files updated")
        return {"success": True, "checkpoint_id": checkpoint_id, "reverted_files": reverted_items}
    except Exception as exc:
        print(f"[Snapshots] revert_checkpoint error: {exc}")
        return {"success": False, "error": str(exc)}

def redo_checkpoint(workspace_root: str, checkpoint_id: str) -> dict:
    try:
        if not workspace_root or not checkpoint_id:
            return {"success": False, "error": "Invalid workspace or checkpoint ID"}
        proj_dir = _get_project_snapshots_dir(workspace_root)
        chk_dir = proj_dir / checkpoint_id
        manifest_file = chk_dir / "manifest.json"
        if not manifest_file.exists():
            return {"success": False, "error": f"Checkpoint {checkpoint_id} not found"}

        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        redo_state = manifest.get("redo_state")
        if not redo_state or not redo_state.get("files"):
            return {"success": False, "error": "No redo state recorded for this checkpoint"}

        redo_items = []
        for rel_path, meta in redo_state.get("files", {}).items():
            full_path = Path(workspace_root) / rel_path
            if meta.get("action") == "restore":
                shadow_name = meta.get("shadow_file")
                source_file = chk_dir / "redo_files" / shadow_name
                if source_file.exists():
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_file, full_path)
                    redo_items.append({"file": rel_path, "action": "restored_redo"})
            elif meta.get("action") == "delete":
                if full_path.exists():
                    full_path.unlink()
                    redo_items.append({"file": rel_path, "action": "removed_redo"})

        manifest["is_reverted"] = False
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        print(f"[Snapshots] Successfully applied redo for {checkpoint_id}: {len(redo_items)} files updated")
        return {"success": True, "checkpoint_id": checkpoint_id, "redo_files": redo_items}
    except Exception as exc:
        print(f"[Snapshots] redo_checkpoint error: {exc}")
        return {"success": False, "error": str(exc)}
