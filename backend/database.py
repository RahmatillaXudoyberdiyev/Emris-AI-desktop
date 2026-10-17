import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path


def get_db_path() -> Path:
    try:
        ws_data = Path(__file__).resolve().parent.parent / "data"
        ws_data.mkdir(parents=True, exist_ok=True)
        return ws_data / "emris.db"
    except Exception:
        pass
    try:
        app_data = os.getenv("APPDATA")
        base_dir = Path(app_data) / "EmrisAI" if app_data else Path.home() / ".emris_ai"
        base_dir.mkdir(parents=True, exist_ok=True)
        return base_dir / "emris.db"
    except Exception as exc:
        print(f"[DB] Error resolving DB path: {exc}")
        return Path("emris.db")


class DatabaseManager:
    def __init__(self):
        try:
            self.db_path = get_db_path()
            print(f"[DB] Initializing SQLite database at: {self.db_path}")
            self._init_tables()
        except Exception as exc:
            print(f"[DB] Initialization failed: {exc}")

    def _get_connection(self):
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL;")
            return conn
        except Exception as exc:
            print(f"[DB] Connection error: {exc}")
            raise

    def _init_tables(self):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS projects (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        path TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id TEXT PRIMARY KEY,
                        project_id TEXT,
                        title TEXT NOT NULL,
                        model TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
                    );
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS messages (
                        id TEXT PRIMARY KEY,
                        conversation_id TEXT NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                    );
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL
                    );
                """)
                conn.commit()
                print("[DB] Tables verified successfully.")
        except Exception as exc:
            print(f"[DB] Error creating tables: {exc}")

    def get_projects(self):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, name, path, created_at FROM projects ORDER BY created_at DESC;")
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as exc:
            print(f"[DB] Error fetching projects: {exc}")
            return []

    def create_project(self, name: str, path: str):
        try:
            trimmed_name = name.strip()
            trimmed_path = path.strip()
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id, name, path FROM projects WHERE LOWER(name) = LOWER(?) OR LOWER(path) = LOWER(?);",
                    (trimmed_name, trimmed_path)
                )
                existing = cursor.fetchone()
                if existing:
                    print(f"[DB] Duplicate project rejected: {trimmed_name}")
                    return {"error": "duplicate", "message": "Project already exists", "name": trimmed_name}

                project_id = str(uuid.uuid4())[:8]
                created_at = datetime.utcnow().isoformat()
                cursor.execute(
                    "INSERT INTO projects (id, name, path, created_at) VALUES (?, ?, ?, ?);",
                    (project_id, trimmed_name, trimmed_path, created_at)
                )
                conn.commit()
                print(f"[DB] Project created: {trimmed_name} ({project_id})")
                return {"id": project_id, "name": trimmed_name, "path": trimmed_path, "created_at": created_at}
        except Exception as exc:
            print(f"[DB] Error creating project: {exc}")
            return None

    def delete_project(self, project_id: str):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM projects WHERE id = ?;", (project_id,))
                conn.commit()
                print(f"[DB] Project deleted: {project_id}")
                return True
        except Exception as exc:
            print(f"[DB] Error deleting project: {exc}")
            return False

    def get_conversations(self, project_id: str = None):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                if project_id:
                    cursor.execute(
                        "SELECT id, project_id, title, model, created_at, updated_at FROM conversations WHERE project_id = ? ORDER BY updated_at DESC;",
                        (project_id,)
                    )
                else:
                    cursor.execute(
                        "SELECT id, project_id, title, model, created_at, updated_at FROM conversations ORDER BY updated_at DESC;"
                    )
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as exc:
            print(f"[DB] Error fetching conversations: {exc}")
            return []

    def create_conversation(self, title: str, project_id: str = None, model: str = "Gemini 3.5 Flash Lite"):
        try:
            conv_id = str(uuid.uuid4())[:8]
            now = datetime.utcnow().isoformat()
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO conversations (id, project_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);",
                    (conv_id, project_id, title.strip(), model, now, now)
                )
                conn.commit()
                print(f"[DB] Conversation created: {title} ({conv_id})")
                return {
                    "id": conv_id,
                    "project_id": project_id,
                    "title": title,
                    "model": model,
                    "created_at": now,
                    "updated_at": now
                }
        except Exception as exc:
            print(f"[DB] Error creating conversation: {exc}")
            return None

    def delete_conversation(self, conversation_id: str):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM conversations WHERE id = ?;", (conversation_id,))
                conn.commit()
                print(f"[DB] Conversation deleted: {conversation_id}")
                return True
        except Exception as exc:
            print(f"[DB] Error deleting conversation: {exc}")
            return False

    def update_conversation_title(self, conversation_id: str, title: str):
        try:
            now = datetime.utcnow().isoformat()
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?;",
                    (title.strip(), now, conversation_id)
                )
                conn.commit()
                return True
        except Exception as exc:
            print(f"[DB] update_conversation_title error: {exc}")
            return False

    def get_messages(self, conversation_id: str):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC;",
                    (conversation_id,)
                )
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as exc:
            print(f"[DB] Error fetching messages: {exc}")
            return []

    def add_message(self, conversation_id: str, role: str, content: str):
        try:
            msg_id = str(uuid.uuid4())[:8]
            now = datetime.utcnow().isoformat()
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?);",
                    (msg_id, conversation_id, role, content, now)
                )
                cursor.execute(
                    "UPDATE conversations SET updated_at = ? WHERE id = ?;",
                    (now, conversation_id)
                )
                conn.commit()
                return {"id": msg_id, "conversation_id": conversation_id, "role": role, "content": content, "created_at": now}
        except Exception as exc:
            print(f"[DB] Error adding message: {exc}")
            return None

    def get_setting(self, key: str, default: str = ""):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM settings WHERE key = ?;", (key,))
                row = cursor.fetchone()
                return row["value"] if row else default
        except Exception as exc:
            print(f"[DB] Error getting setting {key}: {exc}")
            return default

    def set_setting(self, key: str, value: str):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;",
                    (key, value)
                )
                conn.commit()
                return True
        except Exception as exc:
            print(f"[DB] Error setting {key}: {exc}")
            return False


db = DatabaseManager()
