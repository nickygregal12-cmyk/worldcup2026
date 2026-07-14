> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Create the fresh handover zip for the next chat

Run this from Terminal after the handover-docs package is committed and pushed.

```bash
cd ~/Desktop

STAMP=$(date +%Y%m%d-%H%M)
ZIP="euro28predictor-handover-${STAMP}.zip"

rm -f "$ZIP"

zip -r "$ZIP" euro28predictor \
  -x "euro28predictor/node_modules/*" \
     "euro28predictor/dist/*" \
     "euro28predictor/.git/*" \
     "euro28predictor/coverage/*" \
     "euro28predictor/.netlify/*" \
     "euro28predictor/.DS_Store" \
     "euro28predictor/**/.DS_Store" \
     "euro28predictor/.env" \
     "euro28predictor/.env.*" \
     "euro28predictor/supabase/.temp/*"

shasum -a 256 "$ZIP"
ls -lh "$ZIP"
```

Upload the generated zip to the next chat together with this prompt:

```text
Use the attached Euro 2028 Predictor repo zip. Start by reading docs/NEXT-CHAT-PROMPT-STAGE-13G-CONTINUATION.md and docs/STAGE-13G-HANDOVER-20260705.md. Verify the branch/history, then continue only with the next scoped stage. Do not create Migration 019 unless a genuine schema/read-contract gap is proved and explicitly approved.
```
