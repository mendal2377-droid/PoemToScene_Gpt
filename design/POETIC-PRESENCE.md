# Someone belongs here

2026-10-04. Generated with built-in `image_gen.imagegen`, then implemented in the navigable Three.js landscapes. No CLI, API-key fallback or external image service was used.

The missing quality was intention. A landscape becomes emotional when objects suggest a person, a person has a reason to pause, and light draws a relationship between the two. More ornament alone cannot supply this. Human presences are small, spatially situated and restrained; emptiness remains essential to 江雪 and 枫桥夜泊.

| Work | Emotional center | Implemented scene evidence |
| --- | --- | --- |
| 山居秋暝 | Belonging and homecoming | Two washerwomen move and pause along a clear bamboo passage; a boatman returns through lotus; a lamp, kettle and two cups beside an empty seat; a second lamp across the stream, wet glints, canopy shadows and broken moon reflection. |
| 江雪 | Vulnerability and resolve | Exactly one seated fisherman, woven reed cape, snow on the planked hull, basket and clay kettle; slow boat movement, expanding water rings, no added settlement or bird calls. |
| 枫桥夜泊 | An awake stranger longing for home | Seated traveler in a tethered guest boat; folded travel cloth, sealed letter, clay kettle and small lamp; warm reflections against cool night, distant temple bell and nearby timber contact. |
| 桃花源记 | Ordinary kindness and welcome | A courtyard table set with bowls, cleared garden approach, elder's proximity-sensitive welcome, child looking around, gardener tending a plot, pegged linen and cooking smoke rising from a roof. |
| 游褒禅山记 | Wonder, doubt and companionship | Two scholars situated at different depths, turning their heads toward a nearby visitor, held torchlight, visible droplets and reflected cave water; a chamber with a route back and a dark continuation. |

Shared changes: a gradient sky with faint cloud washes; indirect color in painted foliage so night retains readable texture; one cached 1024px directional canopy shadow map; near-person contact sounds and actual-distance-triggered footsteps; modest gestures instead of constant whole-body rocking. Reduced motion freezes the tableaux. Low quality disables shadows. No extra narrative labels or text overlays were added.

The scenes are literary interpretations, not archaeological reconstructions. The villagers and cave scholars express the supplied texts through illustrated geometry. Audio is original procedural sound design, not field recordings or natural spoken dialogue.

## Saved artwork and integration

- `design/human-presence-directions.png`: five-panel concept study; retained for art direction.
- `public/art/human-presence-directions.png`: the same concept painting, consumed by `src/library.css` for the five horizontally arranged scene choices. It is an illustration, not an actual app screenshot.
- `public/art/pine-poetic-watercolor.png`: new transparent pine bough, consumed by `src/world.ts` in the 3D foliage instances. The old pine PNG is retained.
- `src/presence.ts`: the five small 3D stories, props, restrained animation, ground clearings, lights and reflections.
- `src/models.ts`, `src/environment.ts`, `src/world.ts`, `src/sceneDetails.ts`, `src/audio.ts`: supporting model, light, viewpoint, vegetation and spatial sound changes.

The art-direction painting is more detailed than the browser geometry. Its story, composition and light relationships guide the implementation; it does not replace the walkable world with a flat background.

## Concept-board prompt

Use case: stylized-concept / illustration-story. Create a breathtaking art-direction painting, five equal vertical panels in one wide landscape canvas, for five interactive Chinese literary 3D environments. No text, labels, logos or UI. The missing quality is HUMAN EMOTION, not additional decoration. Classical Chinese watercolor-inspired contemporary cinematic illustration, natural human scale, exquisitely restrained, tender and contemplative. Atmospheric depth, asymmetry, believable worn materials, soft painted foliage; no polygon cones or generic game assets. Each panel has a distinct intimate emotional focal point and foreground framing. Left to right:
1. Wang Wei Mountain Evening After Rain: blue-green pine canopy close above a mossy brook, wet stepping stones, a timber footbridge. Two small washerwomen returning with a basket and damp cloth, glimpsed through bamboo, a warm little lamp and two tea cups under a pavilion suggesting someone is expected home. Cool silver moon catches one curved boat wake and lotus leaves. Feeling: peaceful belonging, not an empty postcard. Emerald and silver with ONE amber note.
2. Liu Zongyuan River Snow: immense mist-white river, spare black ink ridges, ONE lone fisherman hunched patiently beneath woven reed rain cape and hat in a realistically planked boat. Snow collects on gunwale, a tiny reddish clay kettle and fishing basket near his feet. Nearly empty surrounding space, no birds or tracks of other people. Feeling: vulnerable but unbroken, dignified resolve. White, slate, faint rust.
3. Zhang Ji Maple Bridge Night Mooring: first-person beside an anchored guest boat in indigo night; half-open woven canopy, a rumpled travel blanket, sealed letter and small amber lamp. Orange maple leaves frame the cold river, broken reflections lead toward distant temple windows and bell tower across stone bridge. One resting traveler in boat, awake and looking away. Feeling: a stranger listening for home, beautiful loneliness. Ink-blue and copper, warm window far away.
4. Tao Yuanming Peach Blossom Spring: foreground dark mossy narrow rock passage opens to luminous spring village: uneven threshold stones, flowering peach boughs, terraced kitchen gardens, laundry between timber posts, a round table set with bowls and ceramic pitcher, an elder quietly welcoming a arriving visitor, child and adult tending plants rather than standing in a row. One hearth plume caught in sunlight. Feeling: ordinary kindness, a place where one could stay. Fresh celadon, dusty peach, cream and honey.
5. Wang Anshi Mount Baochan: intimate dark limestone chamber and ascending passage, weathered stone walls with geological ribs, small still pool reflecting an amber torch. Two scholars in simple Song robes, one pauses and turns back toward the other; warm torch held between them, blue daylight a thin distant slit behind; further passage disappears around a bend, not a closed wall. Feeling: wonder mixed with doubt, mortal warmth against enormous mountain darkness. Charcoal, muted jade, living amber.
Make this one cohesive high-quality concept painting while radically distinguishing the spatial compositions. Human presences must be small, intentional, subtle and anatomically believable. Poetic visual storytelling through waiting, signs of use, direction of gaze and shared light; no fantasy spectacle, no busy crowd, no floating symbols, no oversaturated greens.

## Foliage asset prompt

Use case: stylized-concept. Final asset for intersecting foliage cards in an interactive Chinese watercolor 3D landscape, NOT a scene painting. Paint exactly ONE airy horizontally spreading evergreen pine BOUGH CLUSTER, isolated on a completely transparent alpha background, about 2.5 times wider than tall, all tips fully within the frame with generous transparent margins. Lyrical classical Chinese watercolor and ink illustration. Large flowing jade and soft celadon pigment washes gently bleeding into one another, expressive sparse fine dark ink needle strokes, softly ragged organically irregular contour, very subtle warm pale tips. Structure is a few naturally drooping, layered asymmetrical sprays of pine foliage with tiny slender twigs, not an oval blob. Approximately 65 percent of the cluster bounding box is painted foliage, with breathable TRANSPARENT gaps between sprays. Restrained, muted blue-green palette, medium values (not nearly black). One soft brush-painted silhouette readable at small scale, beautifully calm and poetic. No photographic needles, no high-frequency crunchy speckles, no 3D shading, no sharp neon highlights, no trunk, no pot, no trees in a scene, no water, no landscape, no paper rectangle, no background, no white backdrop, no shadow, no text, no borders. Actual transparent background is essential.

## Verification

Build and interaction suite are run against the final implementation. The five landscapes are also captured at overview and three eye-level destinations, with console errors collected, to inspect the people, lighting and occupied ground. Frames and local review tools live in ignored `reference-review/`; they are not production assets. Browser QA is not a benchmark of physical phone performance.

October 4 results: production build passed. The full 24-check suite passed 23 checks; the remaining scene-freeze comparison included an independently changing reading HUD, so that overlay was hidden using its existing control before comparison. Its focused rerun passed. The five-scene visual review reported no browser errors. The revised 60-second film in `film/output/poetic-presence/` passed browser playback and full-file decode: 1080 × 1920, 24 fps, 1,440 frames, fast-start H.264/AAC, -18.0 LUFS; no cuts or freezes detected. The original film remains preserved.
