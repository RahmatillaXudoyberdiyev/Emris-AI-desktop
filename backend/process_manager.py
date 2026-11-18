import os
import re
import socket
import subprocess
import threading
import time
from pathlib import Path
import psutil
from tenacity import retry, stop_after_delay, wait_fixed, retry_if_result


class ProcessManager:
    def __init__(self):
        self.active_processes = {}
        self.user_stopped_pids = set()
        self.background_errors = {}
        self._lock = threading.Lock()

    def check_port_active(self, port: int, host: str = "127.0.0.1") -> bool:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.15)
                return s.connect_ex((host, port)) == 0
        except Exception:
            return False

    def wait_for_port(self, port: int, host: str = "127.0.0.1", timeout: float = 6.0) -> bool:
        start_time = time.time()
        while time.time() - start_time < timeout:
            if self.check_port_active(port, host):
                return True
            time.sleep(0.25)
        return False

    def terminate_tree(self, pid: int) -> bool:
        try:
            if not psutil.pid_exists(pid):
                return True
            parent = psutil.Process(pid)
            children = parent.children(recursive=True)
            for child in children:
                try:
                    child.terminate()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            gone, alive = psutil.wait_procs(children, timeout=1.5)
            for p in alive:
                try:
                    p.kill()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            try:
                parent.terminate()
                parent.wait(timeout=1.5)
            except (psutil.TimeoutExpired, psutil.NoSuchProcess):
                try:
                    parent.kill()
                except Exception:
                    pass
            return True
        except Exception as exc:
            print(f"[ProcessManager] terminate_tree error for PID {pid}: {exc}")
            if os.name == "nt":
                try:
                    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
                    subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, capture_output=True, creationflags=flags)
                    return True
                except Exception:
                    pass
            return False

    def _start_stream_readers(self, process, pid_key: str):
        def read_stream(stream, target_list):
            try:
                for line in iter(stream.readline, ""):
                    if not line:
                        break
                    clean_line = line.rstrip()
                    target_list.append(clean_line)
                    if len(target_list) > 300:
                        del target_list[0:50]
            except Exception:
                pass
            finally:
                try:
                    stream.close()
                except Exception:
                    pass

        process._stdout_lines = []
        process._stderr_lines = []
        t1 = threading.Thread(target=read_stream, args=(process.stdout, process._stdout_lines), daemon=True)
        t2 = threading.Thread(target=read_stream, args=(process.stderr, process._stderr_lines), daemon=True)
        t1.start()
        t2.start()

        def monitor_crash():
            try:
                process.wait()
                with self._lock:
                    self.active_processes.pop(pid_key, None)
                is_user_stopped = (
                    getattr(process, "_stopped_by_user", False)
                    or str(process.pid) in self.user_stopped_pids
                    or pid_key in self.user_stopped_pids
                )
                if not is_user_stopped:
                    rc = process.returncode
                    if rc is not None and rc != 0:
                        err_text = "\n".join(process._stderr_lines[-30:]) or "\n".join(process._stdout_lines[-30:])
                        print(f"[ProcessManager] Background task PID {process.pid} exited with code {rc}")
                        with self._lock:
                            self.background_errors[pid_key] = {
                                "pid": process.pid,
                                "command": getattr(process, "_raw_cmd", ""),
                                "cwd": getattr(process, "_raw_cwd", ""),
                                "exit_code": rc,
                                "error": err_text or f"Process exited unexpectedly with code {rc}",
                                "timestamp": time.time()
                            }
            except Exception as exc:
                print(f"[ProcessManager] monitor_crash error: {exc}")

        m_thread = threading.Thread(target=monitor_crash, daemon=True)
        m_thread.start()

    def execute_supervised(self, cmd_to_run: str, cwd: str, env: dict, raw_cmd: str, timeout: int = 120) -> dict:
        creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        process = subprocess.Popen(
            cmd_to_run,
            shell=True,
            cwd=cwd,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=creationflags
        )
        process._raw_cmd = raw_cmd
        process._raw_cwd = cwd
        process._start_time = time.time()
        process._is_daemon = False
        process._requires_supervision = True
        process._stopped_by_user = False
        pid_key = str(process.pid)

        with self._lock:
            self.active_processes[pid_key] = process

        stdout_lines = []
        stderr_lines = []

        def collect_stream(stream, buffer):
            try:
                for line in iter(stream.readline, ""):
                    if not line:
                        break
                    buffer.append(line)
            except Exception:
                pass
            finally:
                try:
                    stream.close()
                except Exception:
                    pass

        t_out = threading.Thread(target=collect_stream, args=(process.stdout, stdout_lines), daemon=True)
        t_err = threading.Thread(target=collect_stream, args=(process.stderr, stderr_lines), daemon=True)
        t_out.start()
        t_err.start()

        start_time = time.time()
        poll_interval = 0.15

        while True:
            rc = process.poll()
            if rc is not None:
                break
            if time.time() - start_time > timeout:
                self.terminate_tree(process.pid)
                with self._lock:
                    self.active_processes.pop(pid_key, None)
                print(f"[ProcessManager] Supervised command timed out after {timeout}s: {raw_cmd}")
                return {
                    "success": False,
                    "stdout": "".join(stdout_lines),
                    "stderr": f"Execution timed out ({timeout}s)",
                    "exit_code": 124,
                    "process_id": pid_key,
                    "is_running": False,
                    "is_daemon": False,
                    "requires_supervision": True,
                    "stopped_by_user": False
                }
            time.sleep(poll_interval)

        t_out.join(timeout=1.0)
        t_err.join(timeout=1.0)

        with self._lock:
            self.active_processes.pop(pid_key, None)

        was_stopped = (
            getattr(process, "_stopped_by_user", False)
            or pid_key in self.user_stopped_pids
            or str(process.pid) in self.user_stopped_pids
        )
        if was_stopped:
            return {
                "success": True,
                "stdout": "Process stopped by user.",
                "stderr": "",
                "exit_code": 0,
                "process_id": pid_key,
                "is_running": False,
                "is_daemon": False,
                "requires_supervision": True,
                "stopped_by_user": True
            }

        stdout_text = "".join(stdout_lines)
        stderr_text = "".join(stderr_lines)
        print(f"[ProcessManager] Supervised command completed with exit code: {process.returncode}")

        return {
            "success": process.returncode == 0,
            "stdout": stdout_text,
            "stderr": stderr_text,
            "exit_code": process.returncode,
            "process_id": pid_key,
            "is_running": False,
            "is_daemon": False,
            "requires_supervision": True,
            "stopped_by_user": False
        }

    def start_daemon(self, cmd_to_run: str, cwd: str, env: dict, raw_cmd: str, target_port: int = None) -> dict:
        for existing_pid in list(self.active_processes.keys()):
            old_proc = self.active_processes.get(existing_pid)
            if old_proc and old_proc.poll() is None:
                old_cwd = getattr(old_proc, "_raw_cwd", "")
                if cwd and old_cwd and os.path.abspath(old_cwd) == os.path.abspath(cwd):
                    print(f"[ProcessManager] Terminating prior daemon PID {old_proc.pid} in [{cwd}]")
                    self.stop_process(existing_pid)

        creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        process = subprocess.Popen(
            cmd_to_run,
            shell=True,
            cwd=cwd,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=creationflags
        )
        process._raw_cmd = raw_cmd
        process._raw_cwd = cwd
        process._start_time = time.time()
        process._is_daemon = True
        process._requires_supervision = False
        process._stopped_by_user = False
        pid_key = str(process.pid)

        with self._lock:
            self.active_processes[pid_key] = process

        self._start_stream_readers(process, pid_key)
        time.sleep(1.8)

        poll_res = process.poll()
        if poll_res is None:
            port_active = False
            if target_port:
                port_active = self.wait_for_port(target_port, timeout=4.0)

            initial_out = "\n".join(process._stdout_lines[-10:])
            return {
                "success": True,
                "stdout": (f"Background process active (PID: {process.pid})\nCommand: {cmd_to_run}\n" + (f"\n{initial_out}" if initial_out else "")).strip(),
                "stderr": "",
                "exit_code": 0,
                "process_id": pid_key,
                "is_running": True,
                "is_daemon": True,
                "requires_supervision": False,
                "port_active": port_active,
                "stopped_by_user": False
            }
        else:
            with self._lock:
                self.active_processes.pop(pid_key, None)
            out = "\n".join(process._stdout_lines)
            err = "\n".join(process._stderr_lines)
            was_stopped = (
                getattr(process, "_stopped_by_user", False)
                or pid_key in self.user_stopped_pids
                or str(process.pid) in self.user_stopped_pids
            )
            if was_stopped:
                return {
                    "success": True,
                    "stdout": "Process stopped by user.",
                    "stderr": "",
                    "exit_code": 0,
                    "process_id": pid_key,
                    "is_running": False,
                    "is_daemon": True,
                    "requires_supervision": False,
                    "stopped_by_user": True
                }
            return {
                "success": process.returncode == 0,
                "stdout": out.strip(),
                "stderr": err.strip(),
                "exit_code": process.returncode,
                "process_id": pid_key,
                "is_running": False,
                "is_daemon": True,
                "requires_supervision": False,
                "stopped_by_user": False
            }

    def stop_process(self, process_id: str = None) -> dict:
        stopped = []
        with self._lock:
            target_keys = [str(process_id)] if process_id and str(process_id) in self.active_processes else list(self.active_processes.keys())
        for pid_key in target_keys:
            proc = self.active_processes.get(pid_key)
            if proc:
                try:
                    proc._stopped_by_user = True
                    self.user_stopped_pids.add(str(proc.pid))
                    self.user_stopped_pids.add(str(pid_key))
                    self.terminate_tree(proc.pid)
                    stopped.append(pid_key)
                except Exception as k_err:
                    print(f"[ProcessManager] Stop error on PID {proc.pid}: {k_err}")
                with self._lock:
                    self.active_processes.pop(pid_key, None)
                    self.background_errors.pop(pid_key, None)
        print(f"[ProcessManager] Stopped processes: {stopped}")
        return {"success": True, "stopped": stopped, "stopped_by_user": True}

    def get_active_processes(self) -> list:
        active = []
        with self._lock:
            current_keys = list(self.active_processes.keys())
        for pid_key in current_keys:
            proc = self.active_processes.get(pid_key)
            if proc and proc.poll() is None:
                active.append({
                    "process_id": pid_key,
                    "pid": proc.pid,
                    "command": getattr(proc, "_raw_cmd", f"PID {proc.pid}"),
                    "cwd": getattr(proc, "_raw_cwd", ""),
                    "start_time": getattr(proc, "_start_time", time.time()),
                    "is_daemon": getattr(proc, "_is_daemon", False),
                    "requires_supervision": getattr(proc, "_requires_supervision", False)
                })
            elif proc:
                with self._lock:
                    self.active_processes.pop(pid_key, None)
        return active

    def get_background_errors(self) -> list:
        with self._lock:
            return list(self.background_errors.values())

    def clear_background_error(self, process_id: str = None) -> bool:
        with self._lock:
            if process_id:
                self.background_errors.pop(str(process_id), None)
            else:
                self.background_errors.clear()
        return True


default_process_manager = ProcessManager()
