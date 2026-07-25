# Matrix Rain Devlog: Sawtooth Droplets and Image-Based Charsets

As we approach Milestone 3, two major technical enhancements have been introduced to our 3D Matrix Rain simulation: a non-colliding sawtooth droplet system and a highly performant image-based character set rendering pipeline. 

Here's an under-the-hood look at how these features work.

## 1. Sawtooth Wave Modulation for Droplets

In previous iterations, a `Trail` represented a single falling drop of code. However, in the classic Matrix effect, multiple droplets often occupy the same column simultaneously. If they moved independently, they would eventually collide or overlap, breaking the illusion.

We drew inspiration from Rezmason's web-based Matrix implementation, which uses a "sawtooth wave" concept. Mathematically, a sawtooth wave is a discontinuous linear function that resets at a certain period. 

In our implementation, we refactored the `Trail` class to act as a **static vertical Column**. 
- Each column is assigned a single, uniform `speed`.
- Inside the column, we spawn multiple "drops", each defined by a `length` and a `yOffset` (the "teeth" of our sawtooth).
- Because every drop in a specific column shares the *exact same speed*, they fall synchronously. 
- The varying gaps between the drops create the illusion of complex, multi-speed rain, but it's mathematically impossible for them to collide!

By ensuring that the base offset of the column loops over time, and culling/respawning the entire column when it falls behind the camera, we achieve an incredibly authentic, dense rain effect that scales well in 3D.

## 2. Image-Based Character Sets

While standard font rendering (like Katakana or our custom charset) is flexible, true authenticity often requires exact glyphs (e.g., Susan Kare's Chicago typeface symbols seen in the films). To support this, we introduced an `image` mode for the `ACTIVE_CHARSET`.

### The Challenge
We have 56 individual 128x128 pixel images of black glyphs on a white background. Loading 56 separate image requests at runtime and dynamically colorizing them to include our trademark glowing green gradients would be a massive performance bottleneck.

### The Solution: Canvas Compositing
First, we pre-stitch all 56 images into a single 1D spritesheet (`matrix-glyphs.png`). This reduces network requests to exactly one.

When generating our 2D texture atlas (which maps characters on the X-axis and trail depth/color on the Y-axis), we do the following:
1. **Draw the Spritesheet**: We draw the base black-and-white spritesheet to an offscreen temporary canvas.
2. **Pixel Manipulation**: We extract the `ImageData`. Since the source images are black shapes on a white background, we iterate through the pixels. 
   - Dark pixels (the glyph) are converted into our target color (e.g., glowing green).
   - Bright pixels (the background) have their alpha channel set to 0, making them completely transparent.
   - The darkness of the pixel directly dictates the opacity of our target color, preserving smooth anti-aliasing edges!
3. **Stamp the Atlas**: We stamp this newly colorized, transparent row onto our main atlas canvas, applying the necessary HTML5 Canvas `shadowBlur` and `shadowColor` for the bloom effect.

This process happens exactly **once** at startup. The resulting texture is then fed into our custom WebGL shader via `InstancedMesh`. The 3D renderer doesn't even know it's rendering images instead of text—it just samples the UV coordinates from the atlas as usual, keeping our draw calls at 1 and ensuring butter-smooth 60+ FPS.
