/**
 * Generates an offscreen Canvas Sprite Atlas containing all permutations
 * of the character set and trail styles (gradients and glows).
 */
export function createGlyphAtlas(
  charSet,
  cellWidth,
  cellHeight,
  fontSize,
  trailLength,
  headColor,
  startColor,
  endColor,
  glowColor,
  maxGlowBlur,
  onUpdate = null // callback for when image finishes loading
) {
  const canvas = document.createElement('canvas');
  const isImageMode = charSet && charSet.type === 'image';
  const charLength = isImageMode ? charSet.length : charSet.length;

  // Dimensions: X axis = characters, Y axis = trail depth
  canvas.width = charLength * cellWidth;
  canvas.height = trailLength * cellHeight;
  const ctx = canvas.getContext('2d', { alpha: true }); // Must have alpha for transparent background

  const hexToRgba = (hex) => {
    if (hex.startsWith('#')) hex = hex.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) || 255;
    const g = parseInt(hex.slice(2, 4), 16) || 255;
    const b = parseInt(hex.slice(4, 6), 16) || 255;
    const a = hex.length > 6 ? (parseInt(hex.slice(6, 8), 16) / 255) : 1;
    return { r, g, b, a };
  };

  const headRgba = hexToRgba(headColor);

  const drawAtlas = (baseImage = null) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let imgData = null;
    let tempCanvas = null;
    let tempCtx = null;
    
    if (isImageMode && baseImage) {
      tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = cellHeight;
      tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      tempCtx.drawImage(baseImage, 0, 0, baseImage.width, baseImage.height, 0, 0, charLength * cellWidth, cellHeight);
      imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    }

    // Configure text styling
    if (!isImageMode) {
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    // Pre-render every combination
    for (let j = 0; j < trailLength; j++) {
      // 1. Calculate color and glow for this trail depth
      let shadowBlur;
      let targetColor;

      if (j === 0) {
        targetColor = headRgba;
        shadowBlur = maxGlowBlur * 1.5;
      } else {
        const ratio = j / trailLength;
        const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
        const a = startColor.a + (endColor.a - startColor.a) * ratio;
        targetColor = { r, g, b, a };
        
        let glowRatio = 0;
        if (ratio < 0.5) {
          const halfRatio = ratio * 2.0; 
          glowRatio = Math.pow(1.0 - halfRatio, 3.0); 
        }
        shadowBlur = maxGlowBlur * glowRatio;
      }

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = shadowBlur;

      // 2. Render each character
      if (isImageMode && imgData) {
        const rowData = tempCtx.createImageData(tempCanvas.width, tempCanvas.height);
        
        for (let p = 0; p < imgData.data.length; p += 4) {
          const origR = imgData.data[p];
          const origG = imgData.data[p+1];
          const origB = imgData.data[p+2];
          
          // Image is black on white. Darker = more opaque character.
          const brightness = (origR + origG + origB) / 3;
          const alphaFactor = Math.max(0, 1.0 - (brightness / 255.0));
          
          if (alphaFactor > 0.05) {
            rowData.data[p] = targetColor.r;
            rowData.data[p+1] = targetColor.g;
            rowData.data[p+2] = targetColor.b;
            rowData.data[p+3] = Math.floor(targetColor.a * 255 * alphaFactor);
          } else {
            rowData.data[p+3] = 0;
          }
        }
        
        tempCtx.putImageData(rowData, 0, 0);
        ctx.drawImage(tempCanvas, 0, j * cellHeight);

      } else if (!isImageMode) {
        ctx.fillStyle = `rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, ${targetColor.a})`;
        for (let i = 0; i < charLength; i++) {
          const char = charSet[i];
          // Coordinates point to the exact center of the cell
          const x = i * cellWidth + (cellWidth / 2) + 2;
          const y = j * cellHeight + (cellHeight / 2) + 2;
          ctx.fillText(char, x, y);
        }
      }
    }
  };

  if (isImageMode) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawAtlas(img);
      if (onUpdate) onUpdate();
    };
    img.src = charSet.src;
  } else {
    drawAtlas();
  }

  // Returns the source x and y coordinates for a specific char and trail index
  const getSourceCoords = (charIndex, trailIndex) => {
    return {
      sx: charIndex * cellWidth,
      sy: trailIndex * cellHeight
    };
  };

  return { atlasCanvas: canvas, getSourceCoords };
}
