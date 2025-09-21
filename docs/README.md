# Wireframes and Mock Diagrams

This folder contains the sources you need for PPT slides:

- Wireframe mode (for screenshots)
- Mermaid diagrams (sitemap, buyer flow, AI Studio data flow)

## Wireframe Mode

Purpose: capture low‑fidelity wireframe screenshots of the existing UI without rebuilding pages.

How to use:
1. Start the app.
2. Open `http://localhost:5173/?wireframe=1` to enable wireframe mode automatically.
3. Or click the `WF` button in the navbar (desktop) to toggle.
4. Take screenshots (Windows: `Win+Shift+S` or Chrome DevTools Command Menu > "Capture full size screenshot").

Notes:
- Images/videos/iframes are hidden; layout shows dashed outlines.
- Text and gradients are flattened to simplify the look.

## Mermaid Diagrams

Sources (edit these `.mmd` files):
- `docs/diagrams/sitemap.mmd`
- `docs/diagrams/buyer-flow.mmd`
- `docs/diagrams/ai-dataflow.mmd`

Export to PNG (first time installs the CLI automatically if not present):

```powershell
# Install once (dev dependency is already declared)
pm i

# Export diagrams to PNGs
npm run diagrams:build
```

The PNGs will be created beside each `.mmd` file:
- `docs/diagrams/sitemap.png`
- `docs/diagrams/buyer-flow.png`
- `docs/diagrams/ai-dataflow.png`

## What to show in PPT
- Wireframes: Home, Marketplace, Product Detail, Cart, AI Studio, Workshops (list + detail), Upload (product/workshop), Profile/Orders.
- Mock diagrams: the above PNGs (sitemap, buyer journey, AI Studio dataflow).

## Tips
- If geolocation prompts appear during screenshots, toggle WF first, then skip the location feature for clean shots.
- Keep screenshots focused on structure (avoid long scrolling); take multiple sectional images if needed.
