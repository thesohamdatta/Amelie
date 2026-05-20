# Premium Liquid Orb Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current rigid "pie-slice" orb with a fluid, noise-driven liquid plasma orb and fix layout shifting during transitions.

**Architecture:** Use an SDF (Signed Distance Field) approach in the fragment shader with multi-octave noise blending. Replace CSS transitions in the container with Framer Motion `layout` to synchronize Canvas resizing.

**Tech Stack:** React 19, Framer Motion, Three.js (@react-three/fiber), GLSL.

---

### Task 1: Smooth Layout Transitions in `page.tsx`

**Files:**
- Modify: `web/app/page.tsx`

- [ ] **Step 1: Replace CSS transitions with Framer Motion layout**

Modify `web/app/page.tsx` to use `motion.div` with `layout` prop for the Orb container.

```tsx
// Around line 150 in web/app/page.tsx
<motion.div
  layout
  initial={false}
  animate={{
    scale: isCallActive ? 1.05 : 1,
    width: isCallActive ? 288 : 224, // size-72 : size-56
    height: isCallActive ? 288 : 224,
  }}
  transition={{
    layout: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
  }}
  className="relative"
>
  <Orb
    className="h-full w-full"
    colors={orbColors}
    agentState={orbState}
    volumeMode="manual"
    getInputVolume={getInputVolume}
    getOutputVolume={getOutputVolume}
  />
</motion.div>
```

- [ ] **Step 2: Commit layout changes**

```bash
git add web/app/page.tsx
git commit -m "refactor: use framer motion layout for smooth orb resizing"
```

---

### Task 2: Premium Liquid Shader Implementation

**Files:**
- Modify: `web/components/elevenlabs/orb.tsx`

- [ ] **Step 1: Refactor Shader Code for Liquid Look**

Replace the current oval-based `fragmentShader` with a noise-driven SDF.

```glsl
// web/components/elevenlabs/orb.tsx (Fragment Shader)
const float PI = 3.14159265358979323846;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float dist = length(uv);
    
    // Liquid distortion
    float n = snoise(uv * 1.5 + uAnimation * 0.2) * 0.15;
    n += snoise(uv * 3.0 - uAnimation * 0.4) * 0.05;
    
    float radius = 0.6 + n;
    float alpha = smoothstep(radius + 0.01, radius - 0.01, dist);
    
    // Color mapping
    vec3 color = mix(uColor1, uColor2, n * 2.0 + 0.5);
    
    // Procedural Glow
    float glow = exp(-3.0 * (dist - radius)) * 0.3;
    color += uColor2 * glow * (1.0 - alpha);
    
    gl_FragColor = vec4(color, alpha * uOpacity);
}
```

- [ ] **Step 2: Update Uniforms and Lifecycle**

Update the `Scene` component to handle the new shader parameters and ensure `uAnimation` evolves smoothly.

- [ ] **Step 3: Commit Shader Changes**

```bash
git add web/components/elevenlabs/orb.tsx
git commit -m "feat: implement liquid plasma shader for organic orb look"
```

---

### Task 3: Spring Interpolation for Transitions

**Files:**
- Modify: `web/components/elevenlabs/orb.tsx`

- [ ] **Step 1: Add Spring logic to volume updates**

Use a basic spring damping formula to update `curInRef` and `curOutRef` in the `useFrame` loop.

```tsx
// Inside useFrame in orb.tsx
const springK = 0.15;
const damping = 0.8;
const velocityIn = useRef(0);
const velocityOut = useRef(0);

// ... inside the loop
const forceIn = (targetIn - curInRef.current) * springK;
velocityIn.current = (velocityIn.current + forceIn) * damping;
curInRef.current += velocityIn.current;

const forceOut = (targetOut - curOutRef.current) * springK;
velocityOut.current = (velocityOut.current + forceOut) * damping;
curOutRef.current += velocityOut.current;
```

- [ ] **Step 2: Continuous State Morphing**

Ensure `agentRef.current` changes trigger a smooth transition in the `targetIn` / `targetOut` logic without "snapping" the values.

- [ ] **Step 3: Commit Smoothing Changes**

```bash
git add web/components/elevenlabs/orb.tsx
git commit -m "feat: add spring-based smoothing for orb state transitions"
```

---

### Task 4: Verification and Final Polish

**Files:**
- Manual Test

- [ ] **Step 1: Verify smooth resizing**
Toggle the call state and verify the orb scales smoothly without jumping or flickering.

- [ ] **Step 2: Verify liquid animation**
Observe the idle and talking states to ensure the "plasma" look is present and fluid.

- [ ] **Step 3: Final check and cleanup**
Remove any old unused shader functions or logs.
