# 诗境 · 山水长卷

A playable collection of three poems and two classical prose works. First-time visitors choose from five watercolor panels before 3D loads; later visits resume their saved scene. Open **诗境长卷** to move between five landscapes; each has four discoverable passages, its full original text, optional narration, its own weather/time preferences and separately saved discoveries.

| Work | Landscape and mood | Sound design |
| --- | --- | --- |
| 王维《山居秋暝》 | Green pine valley after rain; quiet, inhabited nature | Stream, wind, nearby bamboo |
| 柳宗元《江雪》 | Broad empty river, low distant ridges, sparse bare branches and one fisherman | Restrained cold wind and water; deliberately no birds |
| 张继《枫桥夜泊》 | Low night waterfront, stone arch bridge, red maples, fishing lights and a temple | Water against the bank, sparse crow calls, decaying temple bells |
| 陶渊明《桃花源记》 | Painted blossom canopy, low mossy cleft, sheltered basin with fields, ponds and homes | Spring birds and stream give way to distant village rooster/dog cues |
| 王安石《游褒禅山记》 | Close limestone massif, ascending stone steps, mountain temple, stele, side spring and an elevated torchlit cave | Outdoor wind/water recede into dripping echoes and fire |

All five share eye-level walking, the quiet dock, watercolor materials, and time/weather controls. The prose landscapes follow the movement and mood of their texts, not an archaeological reconstruction. The designed cave route stops without claiming to reach the original cave's end. Sources are linked in each reading panel: [江雪](https://zh.wikisource.org/zh-hans/江雪), [枫桥夜泊](https://zh.wikisource.org/zh-hans/楓橋夜泊), [桃花源记](https://zh.wikisource.org/zh-hans/桃花源記), [游褒禅山记](https://zh.wikisource.org/zh-hans/遊褒禪山記). Public-domain originals are displayed in simplified Chinese; explanatory copy is original interpretation.

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
- **天色与天气** (the sun/cloud icon): choose dawn, day, dusk, or moonlit night; scrub the time slider; select clear, overcast, mist, gentle rain, or drifting snow. Lighting, foliage, water, sky, fog, sun/moon, and stars follow the selected atmosphere. Rain has animated streaks and a synthesized audio layer when sound is enabled. Weather remains outside rock shelters. Snowfall does not progressively accumulate or melt the winter landscape.
- **光阴流转**: an optional eight-minute day–night cycle. It pauses while the page is hidden, a reading dialog is open, or reduced motion is enabled. Manual time selection pauses the cycle. Reduced motion also hides moving rain streaks while retaining the rainy lighting and sound. Weather and selected time preferences are remembered on this device.
- Settings offer reduced motion and lower rendering resolution. A readable poem and retry button remain available when WebGL cannot initialize.

## Build and test

```sh
npm run build
npx playwright install chromium
npm test
```

The tests cover desktop rendering, actual camera-relative keyboard movement, all four landmark arrivals, persistence after reload, poem/library dialogs, guide cancellation, a 390px mobile layout with joystick input, a simulated WebGL failure, visible environmental animation that freezes when reduced motion is enabled, first-person look controls without zoom, location-dependent audio balance, actual audio output/muting, time rollover, weather lighting profiles, rain sound, day/night rendering, persisted environment preferences on desktop and mobile, switching among all five works, independent discoveries, continuous passage traversal, long prose layout, retained sound enablement, and non-silent unclipped offline output for each new soundscape.

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
- Three.js directly manages the scene, camera, instanced vegetation, water, and movement inside a React-owned lifecycle. The initial plan suggested React Three Fiber; direct Three.js keeps the shared procedural world and scene-specific details in an independently disposable renderer. Changing works releases the previous renderer, textures, input listeners, and audio graph.
- Terrain, connected mountain ridges, branches, rocks, and character meshes are generated in code. Watercolor materials sample pigment noise in world space. Painted pine and peach blossom foliage use original transparent images generated with the built-in image-generation tool; prompts are in `public/art/ASSET-NOTES.md` and `public/art/PEACH-ART.md`. The five-scene concept board and implementation direction are in `design/LANDSCAPE-DIRECTIONS.md`. There are no remote font requests, runtime API calls, or required service keys.
- Repeated vegetation and rocks use instanced geometry. Rendering pauses while the document is hidden or a reading/settings dialog is open. Reduced-motion mode skips unchanged frames. Device pixel ratio is capped, and renderer resources are disposed when the scene unmounts.
- The source poems and prose are public-domain texts; scene interpretation and explanatory copy were created for this prototype. The reference video is not shipped with the application.

Key files: `src/landscape.ts` (shore widths, terrain elevation and camera profiles), `src/massif.ts` (continuous rock shells with open cave mouths), `src/world.ts` (scene and navigation), `src/App.tsx` (interface), `src/scenes.ts` (five works, landmarks, defaults and sources), `src/sceneDetails.ts` (blossoms, winter fisherman, temple, village and cave), `src/environment.ts` (weather, time and shelter), `src/audio.ts` (spatial sound), `src/poem.ts` (original scene text), `src/style.css` (responsive design), and `tests/experience.spec.ts` (browser verification).

## Current scope and limits

The scene now uses a watercolor illustration treatment: continuous irregular ridges, pigment washes, smooth stones, wind-blown grass and fern colonies, bank reeds, curved pine branches, and painted foliage. Jade water carries drifting highlights and animated currents; soft river mist, falling leaves, and a gently rocking boat bring the landscape to life. These effects all respect reduced motion. The foliage is arranged on intersecting textured planes, while terrain and branches retain true 3D depth. Close-up character animation and some architectural details remain deliberately simple. This is a watercolor-inspired browser scene, not a physical pigment simulation.

Walking is deliberately bounded to the east-bank route and, in the prose works, their rock passages; terrain grounding and basic trunk avoidance are implemented. The bridge and pavilion are scenic objects, not additional accessible routes. The walking camera stays at eye height without head bob or a visible avatar. Dragging looks around from that fixed position; the guided route turns gently toward its next destination. Full mesh-based collision is not implemented. Guided motion and landmark travel work within this bounded route.

All five works in the library are playable. There is no scene editor, account system, multiplayer, or AI scene generation. Audio is procedural sound design, not recorded nature: filtered river/wind/leaf/rain layers, sparse synthesized bird and village calls, inharmonic bell partials, and cave drops with a decaying echo. Location, shelter, viewing direction, weather, and (for spring birds) time influence the mix. Sound requires an explicit first click, remains enabled when changing works, and suspends in hidden tabs. Optional device speech reads the original text. Bird, animal, and bell cues are artistic approximations, not field recordings.

The supplied video analysis, original proposal, and reference screenshots remain in the local `reference-review/` folder, excluded from Git and deployment uploads.
