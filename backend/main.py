import io
import os
import socket
import sys
from pathlib import Path
import webview

if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            return sock.connect_ex((host, port)) == 0
    except Exception as exc:
        print(f"[Desktop] Port check error: {exc}")
        return False


def get_base_dir() -> Path:
    try:
        if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
            base_path = Path(sys._MEIPASS)
            print(f"[Desktop] Running in frozen EXE mode. Base path: {base_path}")
            return base_path
        base_path = Path(__file__).resolve().parent.parent
        print(f"[Desktop] Running in standard Python mode. Base path: {base_path}")
        return base_path
    except Exception as exc:
        print(f"[Desktop] Error resolving base dir: {exc}")
        return Path.cwd()


def resolve_target_url(base_dir: Path) -> str:
    try:
        is_dev_flag = "--dev" in sys.argv or os.getenv("EMRIS_ENV") == "development"
        vite_active = is_port_in_use(5173)

        if is_dev_flag or vite_active:
            print("[Desktop] Live server active: targeting http://localhost:5173")
            return "http://localhost:5173"

        dist_index = base_dir / "frontend" / "dist" / "index.html"
        if dist_index.exists():
            print(f"[Desktop] Production build found: targeting {dist_index}")
            return str(dist_index)

        print("[Desktop] Defaulting to live URL: http://localhost:5173")
        return "http://localhost:5173"
    except Exception as exc:
        print(f"[Desktop] Error determining target URL: {exc}")
        return "http://localhost:5173"


def launch_desktop_window():
    try:
        base_dir = get_base_dir()
        target_url = resolve_target_url(base_dir)
        print(f"[Desktop] Opening Emris AI Desktop window with target: {target_url}")

        use_http_server = not target_url.startswith("http://") and not target_url.startswith("https://")

        webview.create_window(
            title="Emris AI — v1.9 Beta",
            url=target_url,
            width=1360,
            height=860,
            min_size=(960, 640),
            background_color="#131314"
        )
        webview.start(http_server=use_http_server)
    except Exception as exc:
        print(f"[Desktop] Critical desktop launcher error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    launch_desktop_window()
