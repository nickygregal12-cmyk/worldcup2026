# Read First

This folder contains durable rules for agents. It exists so future work starts from repo-controlled instructions instead of long repeated prompts or unreliable chat memory.

## Authority Order

Repo/runtime/tests/audits/build/visual review/deployment/Supabase outrank chat memory. Docs report proven reality; docs are not proof alone.

Stage docs are historical evidence unless promoted by `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Source documents may still be required for task-specific detail, but do not treat every old stage file as current instruction.

## Working Rule

Do not broaden scope. Do only the current task, with the smallest safe change set.

If documents conflict, record the conflict instead of silently choosing one. If something cannot be proved from the repo/docs, write `Unknown — verify before relying on this`.

## Stop Conditions

Stop and report before continuing if any of these appear:

- instructions conflict
- the worktree is dirty before a task that requires a clean start
- checksum, package, export or handover contents do not match their manifest
- a migration appears necessary but has not been explicitly approved or proved by a real schema/read-contract gap
- production config or production data could be affected
- completion is being claimed without proof from repo/runtime/tests/audits/build/visual review/deployment/Supabase as applicable
