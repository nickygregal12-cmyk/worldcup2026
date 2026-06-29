# Testing

## Unit tests

Vitest protects pure tournament logic. Initial coverage includes group match scoring, joker behaviour, tournament configuration and the controllable application clock.

```bash
npm test
```

For watch mode:

```bash
npm run test:watch
```

## Linting

```bash
npm run lint:foundation
```

The inherited WC26 project currently has thousands of full-project lint errors. The strict foundation lint scope prevents new code from adding to that backlog. Full lint remains available with `npm run lint` and will be reduced in planned cleanup batches.

## Build

```bash
npm run build
```

## Continuous integration

GitHub Actions runs foundation lint, unit tests and the production build on pull requests and pushes to `euro28-development`.
