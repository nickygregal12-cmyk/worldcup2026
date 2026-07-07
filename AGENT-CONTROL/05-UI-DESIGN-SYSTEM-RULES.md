# UI And Design-System Rules

## Icons And Flags

- Do not use emoji as functional UI icons.
- Do not use emoji flags as team/country flags.
- Use `src/design-system/Icon.jsx`.
- Lucide icons must be added to the `ICONS` map and used through `<Icon name="..." />`.
- Do not scatter direct `lucide-react` imports in page components unless explicitly approved.
- Use controlled flag assets or a central `Flag.jsx` / `TeamFlag.jsx`.
- Render flags by team ID or team code.
- Flag alt text must be descriptive, for example `France flag` or `Scotland flag`.
- Do not scatter flag image paths or country-code-to-emoji logic.

Allowed exceptions: docs, comments, test fixtures, archived/dead WC26 files and user-generated content if applicable.

Do not apply these rules retroactively in unrelated stages; enforce them for touched UI.

## Design-System Principles

- Use semantic tokens.
- Use shared primitives.
- Use scoped CSS Modules.
- Respect file-size caps.
- Preserve visual contracts.
- Avoid raw colour/style drift.
- Predicted and live contexts must stay visually distinct.
- Original Predictor and KO Predictor must not be visually or functionally blended.
