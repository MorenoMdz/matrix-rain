import * as THREE from 'three';
import { ACTIVE_CHARSET } from './characters.js';
import { createGlyphAtlas } from './glyph-atlas.js';

const FONT_SIZE = 32;
const TRAIL_LENGTH = 30;
const GLOW_MAX_BLUR = 5;

/**
 * Sets up a procedural ShaderMaterial that creates code rain localized to an image's bounding box.
 * This completely replaces the InstancedMesh approach, moving all heavy lifting to the GPU
 * for infinite performance scaling, allowing for incredibly tiny and dense character rendering.
 */
export function setupImageRain(scene, options = {}) {
  const {
    imageSrc = 'src/assets/test.jpg',
    density = 2.0, // Controls character size (higher = smaller characters = higher resolution)
    colorProminence = 1.0,
    contrastBoost = true,
    brightness = 1.2, // Boost image brightness
    fadeInDuration = 5.0, // Seconds to organically fade in
  } = options;

  // Calculate character dimensions based on density for high resolution
  const charW = 0.5 / density;
  const charH = 0.5 / density;

  const atlasCellWidth = FONT_SIZE + GLOW_MAX_BLUR * 2 + 4;
  const atlasCellHeight = FONT_SIZE + GLOW_MAX_BLUR * 2 + 4;

  let glyphTexture;
  // Create a grayscale atlas (white trails)
  const { atlasCanvas } = createGlyphAtlas(
    ACTIVE_CHARSET,
    atlasCellWidth,
    atlasCellHeight,
    FONT_SIZE,
    TRAIL_LENGTH,
    '#ffffff', // head (bright white)
    { r: 255, g: 255, b: 255, a: 1 }, // start (white)
    { r: 255, g: 255, b: 255, a: 0 }, // end (transparent)
    '#ffffff', // glow (white)
    GLOW_MAX_BLUR,
    () => { if (glyphTexture) glyphTexture.needsUpdate = true; }
  );

  glyphTexture = new THREE.CanvasTexture(atlasCanvas);
  glyphTexture.minFilter = THREE.LinearFilter;
  glyphTexture.magFilter = THREE.LinearFilter;

  const textureLoader = new THREE.TextureLoader();
  
  const uniforms = {
    imageTex: { value: null }, // Will be set on load
    glyphTex: { value: glyphTexture },
    time: { value: 0 },
    age: { value: 0 },
    fadeInDuration: { value: fadeInDuration },
    atlasCells: { value: new THREE.Vector2(ACTIVE_CHARSET.length, TRAIL_LENGTH) },
    gridSize: { value: new THREE.Vector2(1, 1) }, // Will be updated on load
    colorProminence: { value: colorProminence },
    contrastBoost: { value: contrastBoost ? 1.0 : 0.0 },
    brightness: { value: brightness }
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D imageTex;
      uniform sampler2D glyphTex;
      uniform float time;
      uniform float age;
      uniform float fadeInDuration;
      uniform vec2 atlasCells;
      uniform vec2 gridSize;
      uniform float colorProminence;
      uniform float contrastBoost;
      uniform float brightness;

      varying vec2 vUv;

      float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      void main() {
        // Calculate discrete grid cells
        vec2 cell = floor(vUv * gridSize);
        vec2 cellUv = fract(vUv * gridSize);

        // Sample the image color at the center of the current cell
        vec2 imgSampleUv = (cell + 0.5) / gridSize;
        vec4 imgColor = texture2D(imageTex, imgSampleUv);
        if (imgColor.a < 0.05) discard;

        // Process image color contrast & brightness
        vec3 imgRgb = imgColor.rgb * brightness;
        if (contrastBoost > 0.5) {
            imgRgb = clamp(((imgRgb - 0.5) * 1.5) + 0.5, 0.0, 1.0);
        }

        // Random values for column characteristics
        float colRand = random(vec2(cell.x, 0.0));
        float charRand = random(cell);
        
        // Pick a random character index
        float charIndex = floor(charRand * atlasCells.x);
        
        // Define animation parameters
        float speed = 0.3 + colRand * 0.7;
        float totalDrops = gridSize.y / 20.0; // About 20 characters per drop length
        
        // Calculate falling phase (0 = head, 1 = gap)
        float fallPhase = fract((cell.y / gridSize.y) * totalDrops + time * speed + colRand);
        
        float trailVisibility = 0.6; // 60% of the drop is trail, 40% is empty gap
        
        vec3 finalColor = vec3(0.0);
        float finalAlpha = 0.0;
        
        if (fallPhase <= trailVisibility) {
            // Render the falling trail
            float normalizedTrailPos = fallPhase / trailVisibility;
            
            // Map the trail position to the trail index in the atlas (0 = head, MAX = tail)
            float tIndex = floor(normalizedTrailPos * atlasCells.y);
            // Invert Y because WebGL texture Y is bottom-up, but atlas draws top-down
            float atlasY = atlasCells.y - 1.0 - tIndex;
            
            vec2 atlasCellSize = 1.0 / atlasCells;
            vec2 glyphUv = vec2(
              (charIndex + cellUv.x) * atlasCellSize.x,
              (atlasY + cellUv.y) * atlasCellSize.y
            );
            
            vec4 atlasColor = texture2D(glyphTex, glyphUv);
            if (atlasColor.a > 0.05) {
                // Bright green Matrix base color gradient
                vec3 greenBase = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.8), max(0.0, 1.0 - normalizedTrailPos * 10.0));
                
                finalColor = mix(greenBase, imgRgb, colorProminence) * atlasColor.rgb;
                finalAlpha = atlasColor.a;
            }
        } else {
            // Render the dim background "static" characters to always show the image faintly
            // Use the faintest tail character
            float atlasY = 0.0; // The bottom of the atlas Y is the faintest trail end
            vec2 atlasCellSize = 1.0 / atlasCells;
            vec2 glyphUv = vec2(
              (charIndex + cellUv.x) * atlasCellSize.x,
              (atlasY + cellUv.y) * atlasCellSize.y
            );
            
            vec4 atlasColor = texture2D(glyphTex, glyphUv);
            if (atlasColor.a > 0.05) {
                // Dimly lit image color
                finalColor = mix(vec3(0.0, 0.2, 0.0), imgRgb * 0.4, colorProminence) * atlasColor.rgb;
                finalAlpha = atlasColor.a * 0.4;
            }
        }
        
        // Create an irregular, organic shape that is dense in the center and dissipates at the edges
        vec2 fromCenter = imgSampleUv - vec2(0.5);
        float dist = length(fromCenter * 2.0); // 0 at center, 1 at edges

        // Low frequency noise to make the shape non-circular (blobs)
        float angle = atan(fromCenter.y, fromCenter.x);
        float blobNoise = sin(angle * 3.0) * 0.05 + cos(angle * 7.0) * 0.05; // Weaker noise
        
        float modifiedDist = dist + blobNoise;
        
        // Density dropoff based on distance (start dropping much closer to edges)
        float densityThreshold = smoothstep(0.6, 1.0, modifiedDist);
        
        // Randomly discard particles based on distance (higher threshold = higher chance to discard)
        if (charRand < densityThreshold) discard;
        
        // Also fade the alpha smoothly near the far edges
        finalAlpha *= 1.0 - smoothstep(0.8, 1.0, modifiedDist);

        // Organic Fade In
        float fadeProgress = clamp(age / fadeInDuration, 0.0, 1.0);
        finalAlpha *= fadeProgress;

        if (finalAlpha <= 0.01) discard;

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `
  });

  let geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false; // Hide until loaded
  
  const imageTexture = textureLoader.load(imageSrc, (texture) => {
    const imgW = texture.image.width;
    const imgH = texture.image.height;
    
    const MAX_SIZE = 80;
    let finalW = imgW;
    let finalH = imgH;
    
    if (finalW > MAX_SIZE || finalH > MAX_SIZE) {
      if (finalW > finalH) {
        finalH = (MAX_SIZE / finalW) * finalH;
        finalW = MAX_SIZE;
      } else {
        finalW = (MAX_SIZE / finalH) * finalW;
        finalH = MAX_SIZE;
      }
    }
    
    geometry.dispose();
    geometry = new THREE.PlaneGeometry(finalW, finalH);
    mesh.geometry = geometry;
    
    uniforms.gridSize.value.set(finalW / charW, finalH / charH);
    uniforms.imageTex.value = texture;
    mesh.visible = true;
  });
  
  // Wrap in a group for easy transformation outside
  const group = new THREE.Group();
  group.add(mesh);

  return {
    update: (dt) => {
      uniforms.time.value += dt / 1000;
      uniforms.age.value += dt / 1000;
    },
    mesh: group,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      imageTexture.dispose();
      glyphTexture.dispose();
    }
  };
}
