import { Canvas, Fill, Shader, Skia, useClock } from "@shopify/react-native-skia";
import { StyleSheet, useColorScheme } from "react-native";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";

// A fluid, playful mesh gradient. Five colored control points drift on gently
// eased orbits and blend via Shepard (inverse squared-distance) interpolation,
// while a sine-based flow field warps the sampling space so the whole thing
// churns like liquid. A slow diagonal sheen adds a touch of delight. Biased
// toward mid/deep greens so light text stays legible on top.
const source = Skia.RuntimeEffect.Make(`
uniform float2 u_resolution;
uniform float u_time;
uniform float u_dim; // 1.0 in light mode, < 1.0 in dark mode

// Cheap, smooth flow field (layered sines) used to warp the sampling space.
float2 flow(float2 p, float t) {
  float2 o;
  o.x = sin(p.y * 3.0 + t * 0.8) * 0.06 + sin(p.y * 1.5 - t * 0.5) * 0.045;
  o.y = cos(p.x * 3.0 - t * 0.7) * 0.06 + cos(p.x * 1.7 + t * 0.6) * 0.045;
  return o;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / u_resolution;
  float t = u_time * 0.3;

  // Fluid domain warp so the blobs breathe and swirl rather than merely slide.
  float2 wuv = uv + flow(uv * 2.0, t);

  float2 p0 = float2(0.25 + 0.16 * sin(t * 0.70),       0.24 + 0.14 * cos(t * 0.55));
  float2 p1 = float2(0.80 + 0.12 * cos(t * 0.60 + 1.0), 0.28 + 0.16 * sin(t * 0.50 + 0.5));
  float2 p2 = float2(0.58 + 0.18 * sin(t * 0.45 + 1.5), 0.80 + 0.12 * cos(t * 0.65));
  float2 p3 = float2(0.15 + 0.14 * cos(t * 0.50 + 2.0), 0.78 + 0.14 * sin(t * 0.60));
  float2 p4 = float2(0.50 + 0.22 * sin(t * 0.40 + 3.0), 0.50 + 0.18 * cos(t * 0.35 + 1.0));

  half3 c0 = half3(0.13, 0.63, 0.36); // emerald pop
  half3 c1 = half3(0.05, 0.36, 0.24); // deep green
  half3 c2 = half3(0.02, 0.17, 0.09); // dark forest
  half3 c3 = half3(0.22, 0.78, 0.47); // bright lime-green
  half3 c4 = half3(0.09, 0.50, 0.42); // teal accent

  float w0 = 1.0 / (dot(wuv - p0, wuv - p0) + 0.05);
  float w1 = 1.0 / (dot(wuv - p1, wuv - p1) + 0.05);
  float w2 = 1.0 / (dot(wuv - p2, wuv - p2) + 0.05);
  float w3 = 1.0 / (dot(wuv - p3, wuv - p3) + 0.05);
  float w4 = 1.0 / (dot(wuv - p4, wuv - p4) + 0.05);
  float ws = w0 + w1 + w2 + w3 + w4;

  half3 col = (c0 * w0 + c1 * w1 + c2 * w2 + c3 * w3 + c4 * w4) / ws;

  // Slow diagonal sheen sweeping across for a lively highlight.
  float sheen = 0.5 + 0.5 * sin((uv.x + uv.y) * 3.14159 - t * 1.2);
  col += half3(0.05) * pow(sheen, 3.0);

  // Gentle darkening toward the bottom keeps the lower metrics readable.
  col *= 0.82 + 0.18 * (1.0 - uv.y);

  // Theme dim — deeper, moodier field in dark mode.
  col *= half(u_dim);

  return half4(col, 1.0);
}
`)!;

export default function TrainingMeshBackground() {
  const clock = useClock();
  const isDark = useColorScheme() === "dark";
  // Seed with 1x1 so the shader never divides by a zero resolution before the
  // first size update.
  const size = useSharedValue({ width: 1, height: 1 });

  const dim = isDark ? 0.6 : 1.0;

  const uniforms = useDerivedValue(() => ({
    u_resolution: [size.value.width, size.value.height],
    u_time: clock.value / 1000,
    u_dim: dim,
  }));

  return (
    <Canvas style={StyleSheet.absoluteFill} onSize={size}>
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
