#!/usr/bin/env python3
"""Canonical LLM client for the ThailandGard teams (iishko gateway).

Primary engine for ALL team text work (analysis + generation), per Masoud
2026-10-12: the iishko gateway (OpenAI-compatible), key provided by Masoud.
Masoud's own combo server remains only as a last-resort fallback.
Gemini is no longer used.

Model management (chosen 2026-10-12 by smoke test):
  write   (Persian copy, briefs, content) : qwen3.8-max -> glm-5.3
  analyze (SEO audit, QA, inspection, data): deepseek-v4-pro -> deepseek-v4-flash
  code    (implementation help, JSX review): kimi-k2.7-code -> deepseek-v4-pro

Auth: API key lives in ~/.config/iishko/api-key (chmod 600, outside the repo).
This module never prints, logs, or writes the raw key.

Usage as CLI:
    iishko_client.py "prompt text" [--role write|analyze|code] [--model ID]
        [--system "..."] [--max-tokens N]
Prints the reply text to stdout. Exit 1 on failure (error on stderr).

Usage as library:
    from iishko_client import iishko_chat
    text = iishko_chat([{"role": "user", "content": "..."}], role="write")
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

KEY_PATH = os.path.expanduser("~/.config/iishko/api-key")
BASE_URL = "https://api.reformboss.com/v1"

ROLE_MODELS = {
    "write": ["qwen3.8-max", "glm-5.3"],
    "analyze": ["deepseek-v4-pro", "deepseek-v4-flash"],
    "code": ["kimi-k2.7-code", "deepseek-v4-pro"],
}

BACKOFFS = [2, 4, 8, 16]
TIMEOUT = 120


class IishkoError(RuntimeError):
    pass


def _read_key() -> str:
    try:
        with open(KEY_PATH, "r", encoding="utf-8") as f:
            key = f.read().strip()
    except OSError as exc:
        raise IishkoError(f"cannot read key file: {exc}")
    if not key:
        raise IishkoError("key file is empty")
    return key


def _call_once(key: str, model: str, messages, max_tokens: int, timeout: int) -> str:
    payload = json.dumps(
        {"model": model, "messages": messages, "max_tokens": max_tokens,
         "stream": False}
    ).encode("utf-8")
    last_err = "unknown"
    for backoff in [0] + BACKOFFS:
        if backoff:
            time.sleep(backoff)
        req = urllib.request.Request(
            BASE_URL + "/chat/completions", data=payload, method="POST"
        )
        req.add_header("Authorization", "Bearer " + key)
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]
            if content and content.strip():
                return content
            last_err = "empty reply"
        except urllib.error.HTTPError as exc:
            last_err = f"HTTP {exc.code}"
            if exc.code not in (429, 500, 502, 503, 504):
                raise IishkoError(f"{model}: {last_err}")
        except (urllib.error.URLError, TimeoutError,
                json.JSONDecodeError, KeyError, IndexError) as exc:
            last_err = f"{type(exc).__name__}: {exc}"
    raise IishkoError(f"{model} unreachable after retries ({last_err})")


def _combo_fallback(messages, max_tokens: int, system) -> str:
    """Last resort: Masoud's own combo server (no Gemini anymore)."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from combo_client import combo_chat, ComboError

    try:
        return combo_chat(messages, max_tokens=max_tokens, system=system)
    except ComboError as exc:
        raise IishkoError(f"combo fallback also failed: {exc}")


def iishko_chat(messages, role="analyze", model=None, max_tokens=2000,
                system=None, timeout=TIMEOUT) -> str:
    """Call the iishko gateway; return the assistant's reply text.

    Tries each model for the role in order, then the combo fallback.
    """
    if role not in ROLE_MODELS:
        raise IishkoError(f"unknown role: {role}")
    key = _read_key()
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(messages)

    models = [model] if model else list(ROLE_MODELS[role])
    last_err = "no models tried"
    for m in models:
        try:
            return _call_once(key, m, msgs, max_tokens, timeout)
        except IishkoError as exc:
            last_err = str(exc)
    # Every gateway model failed: last-resort fallback to Masoud's server.
    try:
        return _combo_fallback(messages, max_tokens, system)
    except IishkoError as exc:
        raise IishkoError(f"iishko failed ({last_err}); {exc}")


def main() -> int:
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("prompt", help="user prompt text")
    ap.add_argument("--role", default="analyze",
                    choices=sorted(ROLE_MODELS))
    ap.add_argument("--model", default=None,
                    help="explicit model id (overrides role)")
    ap.add_argument("--system", default=None)
    ap.add_argument("--max-tokens", type=int, default=2000)
    args = ap.parse_args()
    try:
        print(iishko_chat([{"role": "user", "content": args.prompt}],
                          role=args.role, model=args.model,
                          system=args.system, max_tokens=args.max_tokens))
        return 0
    except IishkoError as exc:
        print(f"iishko_client error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
