# A place to stay / 山居秋暝

A 60-second, 9:16 animated short adapted from the project’s living landscape of Wang Wei’s poem. **One uninterrupted camera take, with no cuts, cross-dissolves, scene switches or camera teleports.** Continuous cubic camera-position and gaze curves carry the viewer from the bridge, through moonlight and bamboo, toward the drifting boat. Only the verse typography and the beginning/end fade change opacity.

## Deliverables

- `output/one-take/A-Place-to-Stay_One-Take_1080x1920.mp4`: 1080 × 1920, 24 fps, H.264 High / Level 4.1, yuv420p, limited-range BT.709, stereo AAC 48 kHz / 256 kbps, fast-start MP4.
- `output/one-take/A-Place-to-Stay_Cover.jpg`: matching portrait title frame.
- `output/one-take/validation.json` and `verification.log`: playback, decoding, color and audio measurements.

Chinese verses and original interpretive English translations are burned in. The subtitle block sits above the usual bottom caption area, with generous side margins. Review each platform’s upload preview because interface overlays vary.

## Continuous journey

The title appears over the opening valley. 空山新雨后 begins at 4.3 seconds, followed by 天气晚来秋 at 10.3. The gaze lifts toward moonlight for 明月松间照 at 16.3, then follows the stream for 清泉石上流 at 22.3. It turns toward the returning figures and bamboo for 竹喧归浣女 at 29.3, and back toward the boat for 莲动下渔舟 at 36.3. 随意春芳歇 appears at 43.3; 王孙自可留 lingers from 50.3 to 56.7. A quiet 诗境 signature closes the same unbroken image from 57 seconds.

## Sound and source notes

The score is an original sparse pentatonic composition made with synthesized plucked strings and stereo reverberation. Flowing water, wind, bamboo, droplets and distant footsteps are procedurally designed; they are not field recordings. There is no narration or borrowed song recording. The film uses the project’s actual 3D geometry and existing watercolor foliage assets, with film lighting, atmospheric perspective and the shared inhabited scene. It is an illustrated 3D interpretation, not live-action footage.

Chinese text: Wang Wei’s public-domain poem. English is an original interpretive rendering; “Here, I could stay” is intentionally intimate rather than a literal translation of 王孙.

## Reproduce

Run `npm run dev -- --port 5173`, then:

```
node film/render.mjs --full
node film/render.mjs --audio
node film/encode.mjs
node film/verify.mjs
```

The encoder uses the local FFmpeg executable under `.video-tools`, or `FFMPEG_PATH`. Windows Chromium uses ANGLE D3D11 for full-resolution hardware rendering. On another host, adjust the GPU backend flag in `render.mjs` if necessary. All 1,440 frames use explicit animation time, so render speed never creates dropped frames. Audio runs in an OfflineAudioContext. The encoder measures each mix and applies two-pass loudness normalization to approximately −18 LUFS. Output and intermediate frames are ignored by Git.

The film page is a development/export entry point, independent of the public app interface. It does not upload or publish videos to social accounts.

## October 4 emotional revision

The revised scene includes the resting place set for two, returning washerwomen, a boatman, softer generated pine foliage, directional canopy shadows and shared pools of warm light. The camera remains one continuous curve, now mainly 1.8–2.6 m above the ground and briefly gazing toward the waiting table. The original export is preserved.

Use `FILM_OUTPUT=film/output/poetic-presence` with the render, encode and verify tools to create the revision beside the original. This is an environment variable (PowerShell: `$env:FILM_OUTPUT='film/output/poetic-presence'`). `film/watch.html` points to the revised output after verification. Outputs remain local and are not deployed with the public web app.
