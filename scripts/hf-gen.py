"""Run Higgsfield image jobs in parallel via the CLI and download results.

Usage: python scripts/hf-gen.py jobs.json [name ...]
jobs.json: {"name": {"prompt": str, "images": [paths], "aspect_ratio": "4:5", "quality": "high"}}
Results land in assets-src/higgsfield/<name>.png (+ <name>.json with job metadata).
"""
import json, os, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

OUT = Path("assets-src/higgsfield")
# Call the CLI through node directly so prompts are not mangled by cmd.exe quoting.
HF = ["node", os.path.expandvars(r"%APPDATA%\npm\node_modules\@higgsfield\cli\bin\higgsfield.js")]


def run(name, job):
    cmd = HF + ["generate", "create", job.get("model", "gpt_image_2_5"),
           "--prompt", job["prompt"],
           "--quality", job.get("quality", "high"),
           "--resolution", job.get("resolution", "2k"),
           "--aspect_ratio", job.get("aspect_ratio", "4:5"),
           "--wait", "--wait-timeout", "15m", "--json"]
    for img in job.get("images", []):
        cmd += ["--image", img]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    try:
        data = json.loads(proc.stdout)[0]
    except Exception:
        return name, f"ERROR: {proc.stdout[-400:]} {proc.stderr[-400:]}"
    (OUT / f"{name}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    if data.get("status") != "completed":
        return name, f"status={data.get('status')}"
    urllib.request.urlretrieve(data["result_url"], OUT / f"{name}.png")
    return name, "ok"


def main():
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    names = sys.argv[2:] or list(jobs)
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=6) as ex:
        for name, status in ex.map(lambda n: run(n, jobs[n]), names):
            print(f"{name}: {status}", flush=True)


if __name__ == "__main__":
    main()
