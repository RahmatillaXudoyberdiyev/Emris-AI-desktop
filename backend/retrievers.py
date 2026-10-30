import math
import os
import re
from pathlib import Path
from collections import Counter, defaultdict


def tokenize_code(text: str) -> list:
    try:
        raw_tokens = re.findall(r"[A-Za-z0-9_]+|[^\s\w]", text)
        tokens = []
        for t in raw_tokens:
            low = t.lower()
            tokens.append(low)
            camel_parts = re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\W|$)|\d+", t)
            if len(camel_parts) > 1:
                for cp in camel_parts:
                    tokens.append(cp.lower())
            if "_" in t:
                for sp in t.split("_"):
                    if sp:
                        tokens.append(sp.lower())
        return tokens
    except Exception as exc:
        print(f"[Retriever] Tokenize error: {exc}")
        return text.lower().split()


class BM25Retriever:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.docs = []
        self.doc_lengths = []
        self.avg_doc_len = 0.0
        self.doc_freqs = defaultdict(int)
        self.idf = {}
        self.term_freqs = []

    def fit(self, docs: list):
        try:
            self.docs = docs
            self.doc_lengths = []
            self.doc_freqs = defaultdict(int)
            self.term_freqs = []
            n_docs = len(docs)
            if n_docs == 0:
                return

            total_len = 0
            for doc in docs:
                tokens = tokenize_code(doc.get("text", ""))
                tf = Counter(tokens)
                self.term_freqs.append(tf)
                dlen = len(tokens)
                self.doc_lengths.append(dlen)
                total_len += dlen
                for t in tf.keys():
                    self.doc_freqs[t] += 1

            self.avg_doc_len = total_len / n_docs if n_docs > 0 else 1.0
            self.idf = {}
            for t, df in self.doc_freqs.items():
                self.idf[t] = math.log(((n_docs - df + 0.5) / (df + 0.5)) + 1.0)
        except Exception as exc:
            print(f"[BM25] Fit error: {exc}")

    def score(self, query: str) -> list:
        try:
            q_tokens = tokenize_code(query)
            scores = []
            for i, doc in enumerate(self.docs):
                score = 0.0
                tf = self.term_freqs[i]
                dlen = self.doc_lengths[i]
                for qt in q_tokens:
                    if qt in tf:
                        freq = tf[qt]
                        idf = self.idf.get(qt, 0.0)
                        denom = freq + self.k1 * (1.0 - self.b + self.b * (dlen / self.avg_doc_len))
                        score += idf * ((freq * (self.k1 + 1.0)) / denom)
                scores.append((score, doc))
            scores.sort(key=lambda x: x[0], reverse=True)
            return scores
        except Exception as exc:
            print(f"[BM25] Score error: {exc}")
            return [(0.0, d) for d in self.docs]


class SemanticRetriever:
    def __init__(self):
        self.docs = []
        self.doc_vectors = []

    def fit(self, docs: list):
        try:
            self.docs = docs
            self.doc_vectors = []
            for doc in docs:
                tokens = tokenize_code(doc.get("text", ""))
                vec = Counter(tokens)
                mag = math.sqrt(sum(v * v for v in vec.values()))
                self.doc_vectors.append((vec, mag if mag > 0 else 1.0))
        except Exception as exc:
            print(f"[Semantic] Fit error: {exc}")

    def score(self, query: str) -> list:
        try:
            q_tokens = tokenize_code(query)
            q_vec = Counter(q_tokens)
            q_mag = math.sqrt(sum(v * v for v in q_vec.values()))
            if q_mag == 0:
                q_mag = 1.0

            scores = []
            for i, doc in enumerate(self.docs):
                d_vec, d_mag = self.doc_vectors[i]
                dot = sum(cnt * d_vec.get(w, 0) for w, cnt in q_vec.items())
                cosine = dot / (q_mag * d_mag)
                scores.append((cosine, doc))
            scores.sort(key=lambda x: x[0], reverse=True)
            return scores
        except Exception as exc:
            print(f"[Semantic] Score error: {exc}")
            return [(0.0, d) for d in self.docs]


class QueryFusionRetriever:
    def __init__(self, bm25: BM25Retriever, semantic: SemanticRetriever, rrf_k: int = 60):
        self.bm25 = bm25
        self.semantic = semantic
        self.rrf_k = rrf_k

    def fuse(self, query: str, top_n: int = 8) -> list:
        try:
            bm25_ranked = self.bm25.score(query)
            semantic_ranked = self.semantic.score(query)

            rrf_scores = defaultdict(float)
            doc_map = {}

            for rank, (score, doc) in enumerate(bm25_ranked):
                doc_id = doc.get("id")
                doc_map[doc_id] = doc
                rrf_scores[doc_id] += 1.0 / (self.rrf_k + rank + 1)

            for rank, (score, doc) in enumerate(semantic_ranked):
                doc_id = doc.get("id")
                doc_map[doc_id] = doc
                rrf_scores[doc_id] += 1.0 / (self.rrf_k + rank + 1)

            sorted_ids = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
            results = [doc_map[did] for did, sc in sorted_ids[:top_n] if sc > 0]
            return results
        except Exception as exc:
            print(f"[QueryFusion] Fuse error: {exc}")
            return []


class AutoMergingRetriever:
    def __init__(self, merge_threshold: int = 2):
        self.merge_threshold = merge_threshold

    def merge(self, retrieved_chunks: list) -> list:
        try:
            parent_groups = defaultdict(list)
            for chunk in retrieved_chunks:
                parent_id = chunk.get("parent_id", chunk.get("file_path"))
                parent_groups[parent_id].append(chunk)

            merged_output = []
            for parent_id, chunks in parent_groups.items():
                if len(chunks) >= self.merge_threshold and chunks[0].get("parent_text"):
                    p_doc = {
                        "id": f"parent_{parent_id}",
                        "file_path": chunks[0].get("file_path"),
                        "text": chunks[0].get("parent_text"),
                        "start_line": 1,
                        "end_line": chunks[0].get("parent_lines", 100),
                        "merged": True
                    }
                    merged_output.append(p_doc)
                else:
                    merged_output.extend(chunks)

            return merged_output
        except Exception as exc:
            print(f"[AutoMerging] Merge error: {exc}")
            return retrieved_chunks


class HybridCodeRetrieverEngine:
    def __init__(self, workspace_root: str = None):
        self.workspace_root = workspace_root
        self.bm25 = BM25Retriever()
        self.semantic = SemanticRetriever()
        self.fusion = QueryFusionRetriever(self.bm25, self.semantic)
        self.auto_merger = AutoMergingRetriever(merge_threshold=2)
        self.chunks = []

    def index_workspace(self, workspace_root: str):
        try:
            self.workspace_root = workspace_root
            self.chunks = []
            if not workspace_root or not os.path.exists(workspace_root):
                return

            ignore_dirs = {".git", "node_modules", ".venv", "__pycache__", "dist", "build"}
            valid_exts = {".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".md"}

            chunk_id = 0
            for dirpath, dirnames, filenames in os.walk(workspace_root):
                dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith(".")]
                for fname in sorted(filenames):
                    ext = os.path.splitext(fname)[1].lower()
                    if ext not in valid_exts:
                        continue
                    if fname in ("package-lock.json", "yarn.lock", "pnpm-lock.yaml"):
                        continue

                    full_path = Path(dirpath) / fname
                    rel_path = os.path.relpath(full_path, workspace_root).replace("\\", "/")

                    try:
                        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                            lines = f.readlines()
                    except Exception as fe:
                        print(f"[RetrieverEngine] File read error on {fname}: {fe}")
                        continue

                    parent_text = "".join(lines[:200])
                    parent_lines = len(lines)
                    chunk_size = 25
                    stride = 20

                    for s_idx in range(0, len(lines), stride):
                        chunk_lines = lines[s_idx:s_idx + chunk_size]
                        if not chunk_lines:
                            break
                        ctext = "".join(chunk_lines)
                        if len(ctext.strip()) < 10:
                            continue

                        self.chunks.append({
                            "id": f"chk_{chunk_id}",
                            "file_path": rel_path,
                            "parent_id": rel_path,
                            "text": ctext,
                            "parent_text": parent_text,
                            "parent_lines": parent_lines,
                            "start_line": s_idx + 1,
                            "end_line": s_idx + len(chunk_lines),
                            "merged": False
                        })
                        chunk_id += 1

            if self.chunks:
                self.bm25.fit(self.chunks)
                self.semantic.fit(self.chunks)
                print(f"[RetrieverEngine] Indexed {len(self.chunks)} code chunks across workspace.")
        except Exception as exc:
            print(f"[RetrieverEngine] Index workspace error: {exc}")

    def retrieve(self, query: str, top_k: int = 5) -> list:
        try:
            if not self.chunks:
                return []
            fused = self.fusion.fuse(query, top_n=top_k * 2)
            merged = self.auto_merger.merge(fused)
            return merged[:top_k]
        except Exception as exc:
            print(f"[RetrieverEngine] Retrieve error: {exc}")
            return []

    def format_context_for_prompt(self, query: str, top_k: int = 4) -> str:
        try:
            results = self.retrieve(query, top_k=top_k)
            if not results:
                return ""

            lines = ["RELEVANT CODE CONTEXT (RETRIEVED VIA HYBRID RAG):"]
            seen_files = set()
            for r in results:
                fp = r.get("file_path", "")
                s_l = r.get("start_line", 1)
                e_l = r.get("end_line", "")
                merged_badge = " [Full Component Context]" if r.get("merged") else ""
                lines.append(f"--- File: `{fp}` (Lines {s_l}-{e_l}){merged_badge} ---")
                lines.append(r.get("text", "").strip())
                seen_files.add(fp)

            return "\n".join(lines)
        except Exception as exc:
            print(f"[RetrieverEngine] Format context error: {exc}")
            return ""
