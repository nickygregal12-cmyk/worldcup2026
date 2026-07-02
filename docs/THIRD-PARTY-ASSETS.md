# Third-party visual assets

## Circle Flags

Stage 13B uses the `circle-flags` npm package for locally bundled national and association flag SVGs.

- Runtime CDN requests: none.
- Lookup key: the centrally stored three-letter team/association code.
- Application wrapper: `src/design-system/teamFlagRegistry.js` and `<TeamLabel>`.
- Placeholder behaviour: an unresolved slot renders a neutral dashed identity instead of a flag.
- Licence: MIT; the installed package licence remains in `node_modules/circle-flags/LICENSE` after dependency installation.

The application does not claim ownership of flag designs. The package is an implementation asset, not official UEFA branding.
