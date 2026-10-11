import json, urllib.request, time, os, shutil

QUERIES = [
    "نیم‌فاصله در می‌شود",
    "حذف حشو اداری",
    "تفاوت ویرگول و نقطه‌ویرگول",
    "قانون را در جمله",
    "کلیشه‌های آغازین متن",
    "فاصله‌گذاری ها و می در واژه‌ها",
    "کاربرد تنوین در فارسی",
    "جمله‌های طولانی و پیچیده",
    "نشانه‌گذاری نقل‌قول مستقیم",
    "تفاوت که و چه",
]
OUT = os.path.expanduser("~/workspace/thailandgard/agents/dev/hidden_files/p3p4")

def post(url, text):
    req = urllib.request.Request(url, data=json.dumps({"text": text}).encode("utf-8"),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)

def compact_search(q, d):
    res = []
    for r in (d.get("results") or [])[:8]:
        c = (r.get("content") or "")[:600]
        res.append({"note_path": r.get("note_path"), "title": r.get("title"),
                    "domain": r.get("domain"), "distance": r.get("distance"),
                    "source": r.get("source"), "excerpt": c})
    return {"query": q, "ok": d.get("ok"), "error": d.get("error"),
            "warnings": d.get("warnings"), "results": res}

def compact_retrieve(q, d):
    chs = []
    for ch in (d.get("chunks") or []):
        chs.append({"index": ch.get("index"), "text": (ch.get("text") or "")[:300],
                    "search_ok": ch.get("search_ok"), "judge_ok": ch.get("judge_ok"),
                    "judge_error": ch.get("judge_error"), "warnings": ch.get("warnings"),
                    "notes": [{"note_path": n.get("note_path"), "title": n.get("title"),
                               "distance": n.get("distance"), "source": n.get("source")}
                              for n in (ch.get("notes") or [])]})
    return {"query": q, "ok": d.get("ok"), "error": d.get("error"),
            "warnings": d.get("warnings"), "chunks": chs}

# queries already done (valid in /tmp/p3p4): search 1,2 ; retrieve 1. retrieve 2 corrupt -> redo.
base = "https://n8n.masoudakbari.ccwu.cc/webhook"
todo_search = list(range(3, 11))
todo_retrieve = [2, 3, 4, 5, 6, 7, 8, 9, 10]

# migrate valid ones to compact
for i in [1, 2]:
    d = json.load(open(f"/tmp/p3p4/search_{i:02d}.json"))
    json.dump(compact_search(QUERIES[i-1], d), open(f"{OUT}/search_{i:02d}.json", "w"), ensure_ascii=False)
d = json.load(open("/tmp/p3p4/retrieve_01.json"))
json.dump(compact_retrieve(QUERIES[0], d), open(f"{OUT}/retrieve_01.json", "w"), ensure_ascii=False)
print("migrated 1,2 search + 1 retrieve", flush=True)
shutil.rmtree("/tmp/p3p4", ignore_errors=True)

for i in todo_search:
    q = QUERIES[i-1]
    try:
        s = post(base + "/p3p4-search-x7k2", q)
        json.dump(compact_search(q, s), open(f"{OUT}/search_{i:02d}.json", "w"), ensure_ascii=False)
        print(f"[{i}/10] SEARCH ok={s.get('ok')} n={len(s.get('results', []))} warn={s.get('warnings')}", flush=True)
    except Exception as e:
        print(f"[{i}/10] SEARCH FAILED: {str(e)[:120]}", flush=True)
    time.sleep(2)

for i in todo_retrieve:
    q = QUERIES[i-1]
    try:
        r = post(base + "/p3p4-retrieve-x7k2", q)
        c = compact_retrieve(q, r)
        json.dump(c, open(f"{OUT}/retrieve_{i:02d}.json", "w"), ensure_ascii=False)
        ch = c["chunks"][0] if c["chunks"] else {}
        print(f"[{i}/10] RETRIEVE ok={r.get('ok')} kept={len(ch.get('notes', []))} judge_ok={ch.get('judge_ok')} jerr={ch.get('judge_error')} warn={r.get('warnings')}", flush=True)
    except Exception as e:
        print(f"[{i}/10] RETRIEVE FAILED: {str(e)[:120]}", flush=True)
    time.sleep(2)
print("DONE")
