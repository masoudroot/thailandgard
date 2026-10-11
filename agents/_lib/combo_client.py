#!/usr/bin/env python3
"""Canonical LLM client for the ThailandGard teams (Masoud's combo gateway).

Primary engine for ALL team text work (analysis + generation), per Masoud
2026-10-11: Masoud's private OpenAI-compatible gateway, model my-masoud-combo.
Gemini vault keys remain only as a fallback if the gateway is unreachable.

Auth: API key lives in ~/.config/thailandgard/combo-api-key (chmod 600,
outside the repo). This module never prints, logs, or writes the raw key.

Usage as CLI:
    combo_client.py "prompt text" [--system "..."] [--max-tokens N]
Prints the reply text to stdout. Exit 1 on failure (error on stderr).

Usage as library:
    from combo_client import combo_chat
    text = combo_chat([{"role": "user", "content": "..."}])
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

KEY_PATH = os.path.expanduser("~/.config/thailandgard/combo-api-key")
BASE_URL = "http://83.136.252.40/v1"
MODEL = "my-masoud-combo"
BACKOFFS = [2, 4, 8, 16]
TIMEOUT = 120


class ComboError(RuntimeError):
    pass


def _read_key() -> str:
    try:
        with open(KEY_PATH, "r", encoding="utf-8") as f:
            key = f.read().strip()
    except OSError as exc:
        raise ComboError(f"cannot read key file: {exc}")
    if not key:
        raise ComboError("key file is empty")
    return key


def combo_chat(messages, max_tokens=2000, system=None, timeout=TIMEOUT) -> str:
    """Call the combo gateway; return the assistant's reply text."""
    key = _read_key()
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(messages)
    payload = json.dumps(
        {"model": MODEL, "messages": msgs, "max_tokens": max_tokens, "stream": False}
    ).encode("utf-8")

    last_err = "unknown"
    for attempt, backoff in enumerate([0] + BACKOFFS):
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
            return data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as exc:
            last_err = f"HTTP {exc.code}"
            if exc.code not in (429, 500, 502, 503, 504):
                raise ComboError(last_err)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_err = f"{type(exc).__name__}: {exc}"
    raise ComboError(f"gateway unreachable after retries ({last_err})")


def main() -> int:
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("prompt", help="user prompt text")
    ap.add_argument("--system", default=None)
    ap.add_argument("--max-tokens", type=int, default=2000)
    args = ap.parse_args()
    try:
        print(combo_chat([{"role": "user", "content": args.prompt}],
                         system=args.system, max_tokens=args.max_tokens))
        return 0
    except ComboError as exc:
        print(f"combo_client error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
