# Third-party visual assets

## Self-hosted fonts

Stage DP-0 self-hosts the Design Programme typefaces via `@fontsource`, replacing the retired Space Grotesk / Inter faces. No runtime CDN or Google Fonts request is made in product code.

- Display / headings: `@fontsource/big-shoulders-display` (weights 700/800/900).
- Body / interface: `@fontsource/public-sans` (weights 400/600/700/800).
- Runtime CDN requests: none. The `latin-*.css` faces reference package-local `woff2`/`woff` files that Vite bundles as hashed assets.
- Licence: SIL Open Font License 1.1 for both; the installed licences remain in `node_modules/@fontsource/big-shoulders-display/LICENSE` and `node_modules/@fontsource/public-sans/LICENSE` after dependency installation.
- Prototypes and design artifacts under `docs/` may keep their CDN font links; that constraint applies to product code only.

## Circle Flags

Stage 13B uses the `circle-flags` npm package for locally bundled national and association flag SVGs.

- Runtime CDN requests: none.
- Lookup key: the centrally stored three-letter team/association code.
- Application wrapper: `src/design-system/teamFlagRegistry.js` and `<TeamLabel>`.
- Placeholder behaviour: an unresolved slot renders a neutral dashed identity instead of a flag.
- Licence: MIT; the installed package licence remains in `node_modules/circle-flags/LICENSE` after dependency installation.

The application does not claim ownership of flag designs. The package is an implementation asset, not official UEFA branding.

## Official UEFA EURO 2028 logo and tournament identity

The official UEFA EURO 2028 logo, trophy rendering, tournament wordmark and wider UEFA competition identity are not approved as deployable application assets unless explicit usage permission/licence is obtained and recorded in a later accepted batch. This also applies to copies labelled as public domain, open licence, free download or unofficial web image, because the underlying tournament marks can still create trademark/affiliation risk.

Do not add the official logo to `public/`, `src/assets/`, favicons, Open Graph images, app headers or loading states. The project may create a future independent app mark, but it must not trace, crop, recolour, darken, simplify or restyle the official UEFA logo into a near-copy.

The product should use the Euro design system tokens and plain descriptive copy. It must not imply official UEFA affiliation.

