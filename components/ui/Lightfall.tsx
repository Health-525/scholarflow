"use client";

import { Renderer, Program, Mesh, Triangle } from "ogl";
import { useEffect, useMemo, useRef } from "react";

const MAX_COLORS = 8;

const hexToRGB = (hex: string): [number, number, number] => {
  const c = hex.replace("#", "").padEnd(6, "0");
  return [
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  ];
};

const prepColors = (input: string[]) => {
  const base = (input.length ? input : ["#A6C8FF", "#5227FF", "#FF9FFC"]).slice(0, MAX_COLORS);
  const count = base.length;
  const arr: [number, number, number][] = [];
  for (let i = 0; i < MAX_COLORS; i++) arr.push(hexToRGB(base[Math.min(i, base.length - 1)]));
  const avg: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < count; i++) { avg[0] += arr[i][0]; avg[1] += arr[i][1]; avg[2] += arr[i][2]; }
  avg[0] /= count; avg[1] /= count; avg[2] /= count;
  return { arr, count, avg };
};

const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `
precision highp float;
uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;
uniform vec3  uColor0, uColor1, uColor2, uColor3, uColor4, uColor5, uColor6, uColor7;
uniform int   uColorCount;
uniform vec3  uBgColor, uMouseColor;
uniform float uSpeed, uStreakWidth, uStreakLength, uGlow, uDensity, uTwinkle, uZoom, uBgGlow, uOpacity;
uniform int   uStreakCount;
uniform float uMouseEnabled, uMouseStrength, uMouseRadius;
varying vec2 vUv;

vec3 palette(float h) {
  int count = uColorCount; if (count < 1) count = 1;
  int idx = int(floor(clamp(h, 0.0, 0.999999) * float(count)));
  if (idx <= 0) return uColor0; if (idx == 1) return uColor1; if (idx == 2) return uColor2;
  if (idx == 3) return uColor3; if (idx == 4) return uColor4; if (idx == 5) return uColor5;
  if (idx == 6) return uColor6; return uColor7;
}

vec3 tanhv(vec3 x) { vec3 e = exp(-2.0 * x); return (1.0 - e) / (1.0 + e); }

vec2 sceneC(vec2 frag, vec2 r) {
  vec2 P = (frag + frag - r) / r.x; float z = 0.0; float d = 1e3; vec4 O = vec4(0.0);
  for (int k = 0; k < 39; k++) { if (d <= 1e-4) break;
    O = z * normalize(vec4(P, uZoom, 0.0)) - vec4(0.0, 4.0, 1.0, 0.0) / 4.5;
    d = 1.0 - sqrt(length(O * O)); z += d; }
  return vec2(O.x, atan(O.z, O.y));
}

void mainImage(out vec4 o, vec2 C) {
  vec2 r = iResolution.xy; vec2 uv0 = (C + C - r) / r.x;
  float T = 0.1 * iTime * uSpeed + 9.0;
  float angRings = max(1.0, floor(6.28318530718 * max(uDensity, 0.05) + 0.5));
  vec2 Y = vec2(5e-3, 6.28318530718 / angRings);
  vec2 c0 = sceneC(C, r); vec2 cdx = sceneC(C + vec2(1.0, 0.0), r); vec2 cdy = sceneC(C + vec2(0.0, 1.0), r);
  vec2 dCx = cdx - c0; vec2 dCy = cdy - c0;
  dCx.y -= 6.28318530718 * floor(dCx.y / 6.28318530718 + 0.5);
  dCy.y -= 6.28318530718 * floor(dCy.y / 6.28318530718 + 0.5);
  vec2 fw = abs(dCx) + abs(dCy); C = c0;
  vec2 P = vec2(2.0, 1.0) * uv0 - (r / r.x) * vec2(0.0, 1.0);
  vec4 O = vec4(uBgColor * 90.0 * uBgGlow / (1e3 * dot(P, P) + 6.0), 0.0);
  float mGlow = 0.0;
  if (uMouseEnabled > 0.5) { vec2 mN = (iMouse + iMouse - r) / r.x; float md = length(uv0 - mN);
    mGlow = exp(-md * md / max(uMouseRadius * uMouseRadius, 1e-4)) * uMouseStrength; O.rgb += uMouseColor * mGlow * 0.25; }
  float zr = 5e-4 * uStreakWidth; vec2 rr = vec2(max(length(fw), 1e-5)); float tail = 19.0 / max(uStreakLength, 0.05);
  for (int m = 0; m < 16; m++) { if (m >= uStreakCount) break;
    float jf = float(m) + 1.0; float ic = fract(sin(dot(vec2(jf, floor(C.x / Y.x + 0.5)), vec2(7.0, 11.0)) * 73.0));
    vec2 Pp = C - (T + T * ic) * vec2(0.0, 1.0); Pp -= floor(Pp / Y + 0.5) * Y;
    float h = fract(8663.0 * ic); vec3 col = palette(h);
    float weight = mix(1.5, 1.0 + sin(T + 7.0 * h + 4.0), uTwinkle); weight *= (1.0 + mGlow * 2.0);
    vec2 inner = vec2(length(max(Pp, vec2(-1.0, 0.0))), length(Pp) - zr) - zr;
    vec2 sm = vec2(1.0) - smoothstep(-rr, rr, inner);
    O.rgb += dot(sm, vec2(exp(tail * Pp.y), 3.0)) * col * weight; C.x += Y.x / 8.0; }
  vec3 colr = sqrt(tanhv(max(O.rgb * uGlow - vec3(0.04, 0.08, 0.02), 0.0)));
  o = vec4(colr, uOpacity);
}

void main() { vec4 color; mainImage(color, vUv * iResolution.xy); gl_FragColor = color; }
`;

interface LightfallProps {
  className?: string;
  colors?: string[];
  backgroundColor?: string;
  speed?: number;
  streakCount?: number;
  streakWidth?: number;
  streakLength?: number;
  glow?: number;
  density?: number;
  twinkle?: number;
  zoom?: number;
  backgroundGlow?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  mouseRadius?: number;
  mouseDampening?: number;
}

type UniformConfig = Required<Omit<LightfallProps, "className" | "mouseDampening">>;

const applyUniforms = (uniforms: Record<string, { value: unknown }>, config: UniformConfig) => {
  const { arr, count, avg } = prepColors(config.colors);
  uniforms.uColor0.value = arr[0];
  uniforms.uColor1.value = arr[1];
  uniforms.uColor2.value = arr[2];
  uniforms.uColor3.value = arr[3];
  uniforms.uColor4.value = arr[4];
  uniforms.uColor5.value = arr[5];
  uniforms.uColor6.value = arr[6];
  uniforms.uColor7.value = arr[7];
  uniforms.uColorCount.value = count;
  uniforms.uBgColor.value = hexToRGB(config.backgroundColor);
  uniforms.uMouseColor.value = avg;
  uniforms.uSpeed.value = config.speed;
  uniforms.uStreakCount.value = Math.max(1, Math.min(16, Math.round(config.streakCount)));
  uniforms.uStreakWidth.value = config.streakWidth;
  uniforms.uStreakLength.value = config.streakLength;
  uniforms.uGlow.value = config.glow;
  uniforms.uDensity.value = config.density;
  uniforms.uTwinkle.value = config.twinkle;
  uniforms.uZoom.value = config.zoom;
  uniforms.uBgGlow.value = config.backgroundGlow;
  uniforms.uOpacity.value = config.opacity;
  uniforms.uMouseEnabled.value = config.mouseInteraction ? 1 : 0;
  uniforms.uMouseStrength.value = config.mouseStrength;
  uniforms.uMouseRadius.value = config.mouseRadius;
};

export function Lightfall({
  className = "",
  colors = ["#7c8edb", "#2a4494", "#d29922"],
  backgroundColor = "#0d1117",
  speed = 0.3,
  streakCount = 3,
  streakWidth = 1.2,
  streakLength = 1.5,
  glow = 0.8,
  density = 0.5,
  twinkle = 0.8,
  zoom = 3,
  backgroundGlow = 0.3,
  opacity = 0.15,
  mouseInteraction = true,
  mouseStrength = 0.3,
  mouseRadius = 1.5,
  mouseDampening = 0.15,
}: LightfallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const programRef = useRef<Program | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const geometryRef = useRef<Triangle | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const mouseTargetRef = useRef<[number, number]>([0, 0]);
  const lastTimeRef = useRef<number>(0);
  const mouseDampeningRef = useRef<number>(mouseDampening);
  mouseDampeningRef.current = mouseDampening;

  const initialConfigRef = useRef<UniformConfig>({
    colors,
    backgroundColor,
    speed,
    streakCount,
    streakWidth,
    streakLength,
    glow,
    density,
    twinkle,
    zoom,
    backgroundGlow,
    opacity,
    mouseInteraction,
    mouseStrength,
    mouseRadius,
  });

  const config = useMemo<UniformConfig>(() => ({
    colors,
    backgroundColor,
    speed,
    streakCount,
    streakWidth,
    streakLength,
    glow,
    density,
    twinkle,
    zoom,
    backgroundGlow,
    opacity,
    mouseInteraction,
    mouseStrength,
    mouseRadius,
  }), [colors, backgroundColor, speed, streakCount, streakWidth, streakLength, glow, density, twinkle, zoom, backgroundGlow, opacity, mouseInteraction, mouseStrength, mouseRadius]);

  // Build renderer / program / mesh once on mount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      dpr: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      alpha: true,
      antialias: true,
    });
    rendererRef.current = renderer;
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const uniforms: Record<string, { value: unknown }> = {
      iResolution: { value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1] },
      iMouse: { value: [0, 0] },
      iTime: { value: 0 },
      uColor0: { value: [0, 0, 0] }, uColor1: { value: [0, 0, 0] }, uColor2: { value: [0, 0, 0] },
      uColor3: { value: [0, 0, 0] }, uColor4: { value: [0, 0, 0] }, uColor5: { value: [0, 0, 0] },
      uColor6: { value: [0, 0, 0] }, uColor7: { value: [0, 0, 0] },
      uColorCount: { value: 0 },
      uBgColor: { value: [0, 0, 0] },
      uMouseColor: { value: [0, 0, 0] },
      uSpeed: { value: 0 },
      uStreakCount: { value: 0 },
      uStreakWidth: { value: 0 }, uStreakLength: { value: 0 },
      uGlow: { value: 0 }, uDensity: { value: 0 }, uTwinkle: { value: 0 },
      uZoom: { value: 0 }, uBgGlow: { value: 0 }, uOpacity: { value: 0 },
      uMouseEnabled: { value: 0 },
      uMouseStrength: { value: 0 }, uMouseRadius: { value: 0 },
    };

    applyUniforms(uniforms, initialConfigRef.current);

    const program = new Program(gl, { vertex, fragment, uniforms });
    programRef.current = program;
    const geometry = new Triangle(gl);
    geometryRef.current = geometry;
    const mesh = new Mesh(gl, { geometry, program });
    meshRef.current = mesh;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      uniforms.iResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight, 1];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop);
      uniforms.iTime.value = t * 0.001;
      const dampening = mouseDampeningRef.current;
      if (dampening > 0) {
        const dt = lastTimeRef.current ? (t - lastTimeRef.current) / 1000 : 0.016;
        lastTimeRef.current = t;
        const factor = 1 - Math.exp(-dt / Math.max(1e-4, dampening));
        const target = mouseTargetRef.current;
        const cur = uniforms.iMouse.value as [number, number];
        cur[0] += (target[0] - cur[0]) * factor;
        cur[1] += (target[1] - cur[1]) * factor;
      } else { lastTimeRef.current = t; }
      if (programRef.current && meshRef.current) {
        try { renderer.render({ scene: meshRef.current }); } catch {}
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (canvas.parentElement === container) container.removeChild(canvas);
      programRef.current = null; geometryRef.current = null;
      meshRef.current = null; rendererRef.current = null;
    };
  }, []);

  // Sync uniforms when visual props change — no WebGL rebuild.
  useEffect(() => {
    const program = programRef.current;
    if (!program) return;
    applyUniforms(program.uniforms as Record<string, { value: unknown }>, config);
  }, [config]);

  // Attach / detach pointer listener when mouseInteraction toggles.
  useEffect(() => {
    const renderer = rendererRef.current;
    const canvas = renderer?.gl.canvas as HTMLCanvasElement | undefined;
    if (!canvas || !renderer) return;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scale = renderer.dpr || 1;
      mouseTargetRef.current = [(e.clientX - rect.left) * scale, (rect.height - (e.clientY - rect.top)) * scale];
    };

    if (mouseInteraction) {
      canvas.addEventListener("pointermove", onPointerMove);
      return () => canvas.removeEventListener("pointermove", onPointerMove);
    }
  }, [mouseInteraction]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
    />
  );
}
