# Historical Source Atlas source-location renderer comparison (#63)

- **Consumer:** [source-location map](../src/atlas/features/source-detail/SourceLocationMapClient.tsx)
- **Upstream comparison:** [Maps #232](https://github.com/moritzbrantner/maps/issues/232)
- **Fixture:** `dead-sea-scrolls`, source point `[35.458, 31.741]`, zoom 5, expected popup `Found: 1947-1956`
- **Reference renderer:** MapLibre, the default on production and when `mapBackend` is invalid.
- **Experimental renderer:** first-party `flatRuntime="maps"` through the public `@moritzbrantner/maps/layers` entrypoint.
- **Maps candidate revision:** [`de39696953559f46a2baf5fdd04736b75beca381`](https://github.com/moritzbrantner/maps/commit/de39696953559f46a2baf5fdd04736b75beca381).
- **Consumer baseline:** [`48822947a19654e1ae2eb3ddf1c65ab1a5856aa0`](https://github.com/moritzbrantner/historical-source-atlas/commit/48822947a19654e1ae2eb3ddf1c65ab1a5856aa0).

## Dependency verification / current limitation

At the consumer baseline, `bun.lock` resolves `@moritzbrantner/maps@0.1.4`. The source of Maps at `v0.1.4` does **not** expose the first-party `flatRuntime="maps"`. Maps main reports `0.1.5` in its manifest, but public runtime routing was introduced after that package generation.

The candidate branch experiments with a SHA-pinned Git dependency. Upstream's `scripts/prepare-git-install.ts` builds the public JS/CSS entrypoints *and Rust/WASM* when the dependency is installed under `node_modules`, requiring Bun, Rust WASM target, `wasm-bindgen`, and `wasm-opt`. The Atlas repository does not currently provision that toolchain. Its `bun.lock` is **not updated**: repository instructions prohibit hand-editing the generated lockfile. Therefore the branch is an **unvalidated draft**, not a releasable integration. Reproduce the full installation with Bun 1.4.2, update the lock with Bun, verify the built exported layers package, and make CI capable of consuming a supported prebuilt/published release (prefer this) or the documented Git dependency preparation before publishing the option.

## Independent acceptance contract

`src/atlas/features/source-detail/SourceMapRenderer.e2e.spec.ts` uses the **same** source fixture for each renderer, in desktop and touch/mobile mode. It checks visible source identity, marker popup content, pointer/touch pan, wheel/pinch zoom, viewport resize, page reload, URL history and navigation to another source. The first-party case requires both `data-map-runtime="maps"` and `canvas[data-flat-runtime="maps"]`, while the MapLibre case requires a MapLibre canvas; neither is allowed to pass through a silent surrogate. The Maps base renderer is recorded as `wgpu`, `canvas2d`, `pending`, or absent, independently of top-level engine selection.

The test measures wall-clock startup-to-ready, popup presentation, pan and zoom interaction times. Each run emits `renderer-comparison-{backend}-{desktop|mobile}.png` and `.json` with page errors, console errors, user agent, WebGPU capability, source fixture, chosen base renderer and camera state. On successful CI, the `source-map-renderer-comparison` artifact retains these files for the two-engine comparison.

## Observed results

| Journey | MapLibre (reference) | Maps (experimental) |
| --- | --- | --- |
| Dependency installed from candidate lockfile | **Not verified** | **Not verified** |
| Source and popup/selection | **Not exercised in browser** | **Not exercised in browser** |
| Desktop pan / zoom / resize / reload | **Not exercised in browser** | **Not exercised in browser** |
| Mobile touch pan / pinch zoom / resize / reload | **Not exercised in browser** | **Not exercised in browser** |
| Startup / interaction latency and memory | **No measurements** | **No measurements** |
| Screenshots and errors | **No captures** | **No captures** |

**Disposition:** Inconclusive; do not merge or switch defaults until both browsers and the reproducible packaged dependency pass. Screenshots, differences and timings must come from actual CI/browser evidence, not source inspection. Keep permissions, provenance, historical identity, routes and data projections unchanged.
