#!/usr/bin/env bash
#
# Render narration for one case with Piper (offline neural TTS) and embed it
# (base64) into cases.js, so "Narrate aloud" plays natural speech offline.
# OPTIONAL — the browser's built-in voice works everywhere with zero setup.
#
#   scripts/render-narration.sh <caseid> [voice-model]
#
# Spoken text lives in narration/<caseid>.txt, one line per step (cleaned for
# the ear; may differ from the on-screen narr). Default voice en_US-lessac-medium.
#
# One-time setup (macOS or Linux):
#   python3 -m venv .tts-venv && source .tts-venv/bin/activate
#   pip install piper-tts
#   python3 -m piper.download_voices en_US-lessac-medium --download-dir voices
# Audio conversion uses afconvert (macOS) or ffmpeg (Linux) — whichever is found.
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
CID="${1:?usage: render-narration.sh <caseid> [voice-model]}"
VOICE="${2:-en_US-lessac-medium}"
TXT="$HERE/narration/$CID.txt"
CASES="$HERE/cases.js"
MODEL="$HERE/voices/$VOICE.onnx"
[ -f "$TXT" ]   || { echo "missing narration file: $TXT"; exit 1; }
[ -f "$MODEL" ] || { echo "missing voice model: $MODEL  (see header for setup)"; exit 1; }
[ -d "$HERE/.tts-venv" ] && source "$HERE/.tts-venv/bin/activate"

conv(){ if command -v afconvert >/dev/null 2>&1; then afconvert -f m4af -d aac -b 48000 "$1" "$2";
        elif command -v ffmpeg >/dev/null 2>&1; then ffmpeg -y -i "$1" -c:a aac -b:a 48k "$2" >/dev/null 2>&1;
        else echo "need afconvert (macOS) or ffmpeg (Linux)"; exit 1; fi; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
i=0
while IFS= read -r line; do
   [ -z "$line" ] && continue
   printf '%s\n' "$line" | python3 -m piper -m "$MODEL" -f "$TMP/$i.wav" 2>/dev/null
   conv "$TMP/$i.wav" "$TMP/$i.m4a"
   i=$((i+1))
done < "$TXT"
echo "rendered $i clips with '$VOICE'"

python3 - "$CASES" "$TMP" "$CID" "$i" <<'PY'
import sys, re, base64, os
cases, tmp, cid, n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
uris = ["data:audio/mp4;base64," +
        base64.b64encode(open(os.path.join(tmp, f"{k}.m4a"), "rb").read()).decode()
        for k in range(n)]
arr = "[" + ",".join('"%s"' % u for u in uris) + "]"
s = open(cases).read()
pat = r"/\*AUDIO_" + re.escape(cid) + r"_START\*/.*?/\*AUDIO_" + re.escape(cid) + r"_END\*/"
s, k = re.subn(pat, lambda m: "/*AUDIO_" + cid + "_START*/" + arr + "/*AUDIO_" + cid + "_END*/",
               s, count=1, flags=re.S)
assert k == 1, f"AUDIO_{cid} markers not found in cases.js"
open(cases, "w").write(s)
print(f"embedded {n} clips into AUDIO_{cid} ({len(arr)//1024} KB)")
PY
echo "done."
