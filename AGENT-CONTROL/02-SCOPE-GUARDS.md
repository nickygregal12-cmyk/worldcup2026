# Scope Guards

Do not cross these boundaries unless the current user task explicitly scopes the work and the repo evidence supports it.

- Do not touch scoring logic unless explicitly scoped.
- Do not touch resolver logic unless explicitly scoped.
- Do not touch Supabase Auth unless explicitly approved.
- Do not create migrations unless approved or a genuine schema/read-contract gap is proved.
- Do not touch production data.
- Do not mix Original and KO Predictor logic.
- Do not open public signup.
- Do not invent unresolved product decisions.
- Do not hard-code volatile football facts without source/provenance.
- Do not import or revive WC26 legacy files.
- Do not use service-role credentials casually.
- Do not commit secrets or local Supabase metadata.
- Record unrelated findings as deferred findings.
