# Spec: Premium Liquid Orb Implementation

## 1. Problem Statement
The current Orb component suffers from "state snapping" and a "pie-slice" visual style that feels jittery and discontinuous during transitions (idle → listening → talking). The container resizing in `page.tsx` also causes a layout jump because of a mismatch between CSS transitions and Three.js Canvas resize.

## 2. Goals
- **Liquid/Plasma Visuals:** Move away from discrete ovals to a fluid, noise-driven organic shape.
- **Continuous Morphing:** Ensure all state transitions (scale, color, deformation) are interpolated using springs/momentum.
- **Stable Container:** Fix the resizing glitch in the main layout.
- **High Performance:** Maintain 60 FPS using GPU-accelerated shader logic.

## 3. Architecture & Approach

### 3.1. Container Refactor (`web/app/page.tsx`)
- Remove `transition-all duration-1000` from the Orb wrapper.
- Use Framer Motion's `layout` and `animate` props to handle the `size-56` to `size-72` transition.
- Disable `resizeDebounce` in the `Orb` component or set it to a very low value (e.g., `16ms`) during transitions to ensure the Canvas follows the animation frame-by-frame.

### 3.2. State & Smoothing (`web/components/elevenlabs/orb.tsx`)
- **Spring Smoothing:** Replace simple lerp with a more robust spring-based smoothing for `uInputVolume` and `uOutputVolume`.
- **Phase Continuity:** Instead of hard-coding `sin(t)` logic in JS, move the "behavioral weights" into the shader. JS will only provide a `uState` vector (e.g., `x: idle, y: listening, z: talking`).
- **Global Time:** Maintain a stable, non-jumping `uTime`.

### 3.3. Shader Logic (Liquid Morph)
- **SDF-based Shape:** Use a distance function combined with Perlin/Simplex noise to define the orb's edge.
- **Noise Blending:** Use multiple octaves of noise to create a "plasma" effect.
- **Glow & Bloom:** Implement a procedural glow in the fragment shader by using an exponential falloff outside the main shape radius.
- **Color Ramp:** Use the provided ElevenLabs Editorial Palette colors, interpolating them based on local noise density for a more "volumetric" look.

## 4. Components & Interfaces

### `Orb` Component Props (Enhanced)
- `quality`: "low" | "high" (to control noise octaves).
- `speed`: Multiplier for the internal phase.
- `fluidity`: Controls how "runny" the plasma looks.

## 5. Success Criteria
- [ ] No visible "jump" when changing states.
- [ ] The orb feels like a single organic entity, not a collection of shapes.
- [ ] Resizing the window or toggling `isCallActive` results in a smooth, continuous size change.
- [ ] Performance remains stable on target devices.

## 6. Self-Review & Risk Mitigation
- **Risk:** High-octave noise might be heavy for low-end mobile devices. 
- **Mitigation:** Start with 2-3 octaves and provide a quality toggle if needed.
- **Risk:** Spring overshoot might cause the orb to look too "bouncy".
- **Mitigation:** Use a high damping ratio (e.g., 30+).
