# 诗境 · 山居秋暝

A playable Chinese poetry landscape inspired by the supplied interaction reference. One complete scene is implemented: 王维《山居秋暝》.

## Run locally

Use Node.js 22.12+ or 24 and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).

## Explore

- **观景**: drag to orbit, scroll or pinch to zoom.
- **入境漫游 / 漫游**: walk in first person at 1.65m above the terrain with WASD / arrow keys. On narrow screens, use the onscreen joystick. Drag to turn your head; walking mode cannot orbit or zoom into the sky. The overview remains available through the back arrow.
- **循诗而行**: follow the four-landmark route automatically. Movement keys or joystick input cancel the guide.
- Walking opens a quiet icon dock. Use its compass to reveal the optional landmark strip, then select a scene to travel there and read its verse. Approaching landmarks records discoveries silently, without pop-up notes. The book icon opens the full poem.
- Discovered verses persist in localStorage on the current browser.
- Read the complete poem, enable optional synthesized environmental sound, or use the device's Chinese speech voice to hear the poem. Voice availability depends on the device.
- **天色与天气** (the sun/cloud icon): choose dawn, day, dusk, or moonlit night; scrub the time slider; select clear, overcast, mist, or gentle rain. Lighting, foliage, water, sky, fog, sun/moon, and stars follow the selected atmosphere. Rain has animated streaks and a synthesized audio layer when sound is enabled.
- **光阴流转**: an optional eight-minute day–night cycle. It pauses while the page is hidden, a reading dialog is open, or reduced motion is enabled. Manual time selection pauses the cycle. Reduced motion also hides moving rain streaks while retaining the rainy lighting and sound. Weather and selected time preferences are remembered on this device.
- Settings offer reduced motion and lower rendering resolution. A readable poem and retry button remain available when WebGL cannot initialize.

## Build and test

```sh
npm run build
npx playwright install chromium
npm test
```

The tests cover desktop rendering, actual camera-relative keyboard movement, all four landmark arrivals, persistence after reload, poem/library dialogs, guide cancellation, a 390px mobile layout with joystick input, a simulated WebGL failure, visible environmental animation that freezes when reduced motion is enabled, first-person look controls without zoom, location-dependent audio balance, actual audio output/muting, time rollover, weather lighting profiles, rain sound, day/night rendering, and persisted environment preferences on desktop and mobile.

Tests save desktop and mobile screenshots under `test-results/`. Those files are local verification artifacts, not production assets. The test browser requests reduced motion to stabilize visual capture. Headless rendering is not a benchmark for physical phone performance.

## Vercel

The app is configured for Vercel in `vercel.json`:

- Framework: Vite
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: none

Import this project through a Git repository in Vercel, or run `npx vercel` from an authenticated terminal to create a preview. The Vercel project is named `poemtoscene-gpt`. Deployment status and the public URL are reported after the production deployment is verified. It uses a single page with no path-based client routing, so no catch-all rewrite is necessary.

## Implementation

- React and TypeScript manage the reading interface and experience state.
- Three.js directly manages the scene, camera, instanced vegetation, water, and movement inside a React-owned lifecycle. The initial plan suggested React Three Fiber; direct Three.js keeps this procedural first scene in a single independently disposable renderer.
- Terrain, connected mountain ridges, branches, rocks, and character meshes are generated in code. Watercolor materials sample pigment noise in world space. Painted pine foliage uses an original transparent image generated with the built-in image-generation tool; its prompt history is in `public/art/ASSET-NOTES.md`. There are no remote font requests, runtime API calls, or required service keys.
- Repeated vegetation and rocks use instanced geometry. Rendering pauses while the document is hidden or a reading/settings dialog is open. Reduced-motion mode skips unchanged frames. Device pixel ratio is capped, and renderer resources are disposed when the scene unmounts.
- The source poem is public-domain text; scene interpretation and explanatory copy were created for this prototype. The reference video is not shipped with the application.

Key files: `src/world.ts` (scene and navigation), `src/App.tsx` (interface), `src/poem.ts` (poem and landmarks), `src/style.css` (responsive design), and `tests/experience.spec.ts` (browser verification).

## Current scope and limits

The scene now uses a watercolor illustration treatment: continuous irregular ridges, pigment washes, smooth stones, wind-blown grass and fern colonies, bank reeds, curved pine branches, and painted foliage. Jade water carries drifting highlights and animated currents; soft river mist, falling leaves, and a gently rocking boat bring the landscape to life. These effects all respect reduced motion. The foliage is arranged on intersecting textured planes, while terrain and branches retain true 3D depth. Close-up character animation and some architectural details remain deliberately simple. This is a watercolor-inspired browser scene, not a physical pigment simulation.

Walking is deliberately bounded to the east-bank route; terrain grounding and basic trunk avoidance are implemented. The bridge and pavilion are scenic objects, not additional accessible routes. The walking camera stays at eye height without head bob or a visible avatar. Dragging looks around from that fixed position; the guided route turns gently toward its next destination. Full mesh-based collision is not implemented. Guided motion and landmark travel work within this bounded route.

Only《山居秋暝》is playable. The library labels《江雪》and《枫桥夜泊》as future concepts. There is no scene editor, account system, multiplayer, or AI scene generation. Audio is procedural sound design, not recorded nature: independently filtered river, wind, bamboo-rustle, and rain layers fade with distance, and stereo placement follows the viewing direction. Audio requires an explicit user click and suspends in hidden tabs. Optional device speech reads the poem.

The supplied video analysis, original proposal, and reference screenshots remain in the local `reference-review/` folder, excluded from Git and deployment uploads.
