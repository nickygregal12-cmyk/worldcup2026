# Stage 13F-K2 Admin Control Room Baselines

These six deterministic reference renders cover the Stage 13F-K2 owner control room at 380 × 844, 768 × 1024 and 1200 × 1000 pixels in light and dark appearance.

They are generated from the real `AdminControlRoomVisualFixture` React component and its current component structure. Because the packaging environment's managed Chromium policy blocks local navigation, the fixture is server-rendered and rasterised through WeasyPrint at 96 dpi. These images therefore prove responsive structure, content hierarchy, light/dark token intent and target dimensions; Stage 13F-K3 still requires a normal-browser visual walkthrough on the deployed development site.

The fixture is isolated under `src/testFixtures` and is absent from the production import graph. It contains deterministic staging-safe data only.
