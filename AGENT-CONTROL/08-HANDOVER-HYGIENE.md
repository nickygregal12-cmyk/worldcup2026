# Handover Hygiene

Handover/export packages must exclude:

- `.env*`
- `supabase/.temp/`
- `supabase/.branches/`
- `node_modules/`
- `coverage/`
- `.DS_Store`

Do not share secrets.

Include checksums and manifests for packages. Do not rely on stale zip contents.

Superseded docs/packages should be archived with an index, not deleted silently.
