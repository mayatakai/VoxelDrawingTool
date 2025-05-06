/**
 * voxels.js
 * Handles voxel generation, manipulation, and depth calculation
 */

import * as state from './state.js';
import { calculateColorDistance, getBrightness, hexToColor, updateSelectedColorDisplay, updateUndoRedoButtonStates } from './utils.js';

/**
 * Generate voxels based on the loaded image and current settings
 */
  
export function generateVoxels(fillExtrusion = false) {
  state.setVoxels([]); // Reset voxels array

  const reducePercentage = parseInt(state.reduceSlider.value);
  const depthScale = parseInt(state.depthSlider.value);
  
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const key = `${x},${y}`;
      if (state.editedVoxelsMap[key] === 'deleted') continue;
      if (random(100) < reducePercentage) continue;

      let c = state.colorMap[key] ?? state.img.get(
        constrain(x * state.voxelSize, 0, state.img.width - 1),
        constrain(y * state.voxelSize, 0, state.img.height - 1)
      );

      const zDepth = calculateDepth(c, depthScale);
      const xPos = x * state.voxelSize - (state.cols * state.voxelSize) / 2;
      const yPos = y * state.voxelSize - (state.rows * state.voxelSize) / 2;

      if (fillExtrusion) {
        const step = state.voxelSize;
        const start = 0;
        const end = zDepth;
        const dir = end > start ? 1 : -1;

        for (let z = start; dir * z <= dir * end; z += step * dir) {
          state.voxels.push({
            x: xPos,
            y: yPos,
            z: z,
            color: c
          });
        }
      } else {
        state.voxels.push({
          x: xPos,
          y: yPos,
          z: zDepth,
          color: c
        });
      }
    }
  }

  redraw();
  updateUndoRedoButtonStates(state.undoStack, state.redoStack);
}


/**
 * Calculate depth value based on color and current depth mode
 * @param {Object} c - p5.Color object
 * @param {number} depthScale - Scaling factor for depth
 * @returns {number} - Calculated depth value
 */
function calculateDepth(c, depthScale) {
  let depthValue;
  
  switch (state.depthMode) {
    case 'red':
      // Use only the red channel for depth
      depthValue = red(c);
      break;
    
    case 'green':
      // Use only the green channel for depth
      depthValue = green(c);
      break;
      
    case 'blue':
      // Use only the blue channel for depth
      depthValue = blue(c);
      break;
      
    case 'saturation':
      // Convert to HSB and use saturation for depth
      colorMode(HSB, 255);
      depthValue = saturation(c);
      colorMode(RGB, 255); // Switch back to RGB mode
      break;
      
    case 'hue':
      // Convert to HSB and use hue for depth
      colorMode(HSB, 255);
      depthValue = hue(c);
      colorMode(RGB, 255); // Switch back to RGB mode
      break;
      
    case 'brightness':
    default:
      // Default to using brightness (average of RGB)
      depthValue = getBrightness(c);
      break;
  }

  // Conditionally invert the depth mapping based on the invertDepth variable
  return state.invertDepth
    ? map(depthValue, 0, 255, -depthScale, depthScale)
    : map(depthValue, 0, 255, depthScale, -depthScale);
}

/**
 * Apply a color palette to selected voxels or all voxels
 * @param {Array} palette - Array of hex color strings
 */
export function applyColorPalette(palette) {
  // Store current state in undo stack before modifying
  state.updateUndoStack([...state.voxels]);
  state.clearRedoStack();

  // Determine which voxels to modify
  const voxelsToModify = state.selectedVoxels.length > 0 ? state.selectedVoxels : state.voxels;
  
  // Sort voxels by brightness for better color mapping
  voxelsToModify.sort((a, b) => {
    return getBrightness(a.color) - getBrightness(b.color);
  });
  
  // Apply colors from the palette
  for (let i = 0; i < voxelsToModify.length; i++) {
    const voxel = voxelsToModify[i];
    
    // Map voxel index to palette color index
    const colorIndex = floor(map(i, 0, voxelsToModify.length - 1, 0, palette.length - 1));
    const hexColor = palette[colorIndex];
    
    // Get grid coordinates for this voxel
    const gridX = floor((voxel.x + state.cols * state.voxelSize / 2) / state.voxelSize);
    const gridY = floor((voxel.y + state.rows * state.voxelSize / 2) / state.voxelSize);
    const key = `${gridX},${gridY}`;
    
    // Convert hex to RGB color
    const newColor = hexToColor(hexColor);
    
    // Store the custom color in colorMap
    state.colorMap[key] = newColor;
    
    // Update voxel color
    voxel.color = newColor;
  }
  
  redraw(); // Update the canvas display
  updateUndoRedoButtonStates(state.undoStack, state.redoStack);
}

/**
 * Update the image and generate voxels
 */
export function updateImageAndVoxels() {
  if (!state.originalImg) return;

  // Track where this function was called from
  const isFromResolutionChange = state.lastUpdateSource === 'resolutionSlider';
  state.setLastUpdateSource(null); // Reset the source tracker
  
  // Always reset data structures for new image upload
  if (!isFromResolutionChange) {
    state.setColorMap({});
    state.setEditedVoxelsMap({});
    state.setSelectedColor(null);
    state.setSelectedVoxels([]);
    state.resetUndoRedoStacks(); // Use the proper function instead of direct assignment
    
    // Update the selected color display
    updateSelectedColorDisplay(null);
  }

  // Calculate maximum dimensions that will fit in the canvas with some padding
  const maxWidth = width * 0.8;
  const maxHeight = height * 0.8;
  
  // Calculate scaled dimensions that maintain aspect ratio
  let aspectRatio = state.originalImg.width / state.originalImg.height;
  let targetWidth, targetHeight;
  
  if (aspectRatio > 1) {
    // Image is wider than tall
    targetWidth = min(maxWidth, state.originalImg.width);
    targetHeight = targetWidth / aspectRatio;
    
    // If height is too large, scale down further
    if (targetHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = targetHeight * aspectRatio;
    }
  } else {
    // Image is taller than wide or square
    targetHeight = min(maxHeight, state.originalImg.height);
    targetWidth = targetHeight * aspectRatio;
    
    // If width is too large, scale down further
    if (targetWidth > maxWidth) {
      targetWidth = maxWidth;
      targetHeight = targetWidth / aspectRatio;
    }
  }
  
  // Create a copy of the original image and resize it
  const img = state.originalImg.get();
  img.resize(floor(targetWidth), floor(targetHeight));
  state.setImg(img);
  
  // Determine voxel grid dimensions based on the resized image and voxel size
  state.setCols(floor(img.width / state.voxelSize));
  state.setRows(floor(img.height / state.voxelSize));
  
  // Ensure we have at least one row and column
  state.setCols(max(1, state.cols));
  state.setRows(max(1, state.rows));

  generateVoxels();
}

/**
 * Get the voxel at a specific mouse click position
 * @param {number} mouseX - Mouse X coordinate
 * @param {number} mouseY - Mouse Y coordinate
 * @returns {Object|null} - The voxel object or null if none found
 */
export function getVoxelAtClick(mouseX, mouseY) {
  // Import the camera state from camera module
  import('./camera.js').then(cameraModule => {
    // Get current camera state if available
    if (cameraModule.getCameraState) {
      const cameraState = cameraModule.getCameraState();
      // Apply inverse camera transformations if available
      if (cameraState) {
        // This will be used in future implementations
      }
    }
  }).catch(e => console.error('Camera module not loaded:', e));

  // Simple distance checking approach
  // Find the nearest voxel to the mouse position in screen space
  let closestVoxel = null;
  let closestDistance = Infinity;
  
  // Screen coordinates of the mouse
  const screenMouseX = mouseX;
  const screenMouseY = mouseY;
  
  // Check each voxel
  for (const voxel of state.voxels) {
    // Calculate a simple screen space distance
    // This is a simplified approach without full camera projection
    const voxelScreenX = voxel.x;
    const voxelScreenY = voxel.y;
    
    const dx = voxelScreenX - screenMouseX;
    const dy = voxelScreenY - screenMouseY;
    
    // Calculate distance (squared for efficiency)
    const distance = dx * dx + dy * dy;
    
    // If this voxel is closer than the current closest, update
    if (distance < closestDistance && distance < state.voxelSize * state.voxelSize * 4) {
      closestDistance = distance;
      closestVoxel = voxel;
    }
  }
  
  return closestVoxel;
}

/**
 * Update the editedVoxelsMap and colorMap to reflect current voxels
 */
export function updateEditedVoxelsMap() {
  // Reset the maps
  const newEditedMap = {}; 
  const newColorMap = {};
  
  for (const voxel of state.voxels) {
    const gridX = floor((voxel.x + state.cols * state.voxelSize / 2) / state.voxelSize);
    const gridY = floor((voxel.y + state.rows * state.voxelSize / 2) / state.voxelSize);
    const key = `${gridX},${gridY}`;
    
    // Mark as active in edited map
    newEditedMap[key] = 'active';
    
    // Store current color in color map
    newColorMap[key] = voxel.color;
  }
  
  state.setEditedVoxelsMap(newEditedMap);
  state.setColorMap(newColorMap);
}

/**
 * Recalculate the depth (z) values of voxels based on their current colors
 */
export function recalculateDepthsFromCurrentColors() {
  // Store current state in undo stack before modifying
  state.updateUndoStack([...state.voxels]);
  state.clearRedoStack();
  
  // Get current depth scale value
  const depthScale = parseInt(state.depthSlider.value);
  
  // Update depth for each voxel based on its current color
  for (const voxel of state.voxels) {
    // Calculate new depth based on current color and depth mode
    voxel.z = calculateDepth(voxel.color, depthScale);
  }
  
  // Redraw the scene with the new depth values
  redraw();
  updateUndoRedoButtonStates(state.undoStack, state.redoStack);
  console.log('Recalculated depths based on current voxel colors');
}

/**
 * Revert to the original image
 */
export function revertToOriginalImage() {
  if (state.originalImg) {
    const img = state.originalImg.get(); // Reset img to the original image
    state.setImg(img);
    updateImageAndVoxels(); // Update the image and regenerate voxels
    
    // Hide the image preview if the hideImagePreview function exists
    if (typeof window.hideImagePreview === 'function') {
      window.hideImagePreview();
    }
    
    console.log('Reverted to original image');
  }
}

/**
 * Identify and remove the most common colored voxels (background)
 */
export function removeBackground() {
  // Check if there are voxels to process
  if (state.voxels.length === 0) {
    console.log('No voxels to process');
    return;
  }

  // Store current state in undo stack before modifying
  state.updateUndoStack([...state.voxels]);
  state.clearRedoStack();

  // Create a map to count voxel colors
  const colorCounts = {};
  
  // Count occurrences of each color (using r,g,b as key)
  for (const voxel of state.voxels) {
    const r = Math.round(red(voxel.color));
    const g = Math.round(green(voxel.color));
    const b = Math.round(blue(voxel.color));
    
    // Create a simplified key for the color
    const colorKey = `${r},${g},${b}`;
    
    // Increment counter for this color
    if (colorCounts[colorKey]) {
      colorCounts[colorKey].count++;
    } else {
      colorCounts[colorKey] = {
        count: 1,
        color: voxel.color,
        r: r,
        g: g, 
        b: b
      };
    }
  }
  
  // Find the color with the highest count
  let mostCommonColorKey = null;
  let highestCount = 0;
  
  for (const colorKey in colorCounts) {
    if (colorCounts[colorKey].count > highestCount) {
      highestCount = colorCounts[colorKey].count;
      mostCommonColorKey = colorKey;
    }
  }
  
  if (!mostCommonColorKey) {
    console.log('No common color found');
    return;
  }
  
  // Get the most common color details
  const mostCommonColor = colorCounts[mostCommonColorKey];
  console.log(`Most common color: RGB(${mostCommonColor.r}, ${mostCommonColor.g}, ${mostCommonColor.b}) - ${mostCommonColor.count} voxels`);
  
  // Get the current color threshold value
  const colorThreshold = parseInt(state.colorThresholdSlider.value);
  
  // Filter out voxels with the most common color (or within threshold)
  const filteredVoxels = state.voxels.filter(voxel => {
    // Calculate color distance to the most common color
    const distance = calculateColorDistance(voxel.color, mostCommonColor.color);
    // Keep voxel if the distance is greater than the threshold
    return distance > colorThreshold;
  });
  
  // Update editedVoxelsMap to mark removed voxels as deleted
  const removedCount = state.voxels.length - filteredVoxels.length;
  const newEditedVoxelsMap = {...state.editedVoxelsMap};
  
  for (const voxel of state.voxels) {
    // Calculate color distance to the most common color
    const distance = calculateColorDistance(voxel.color, mostCommonColor.color);
    
    if (distance <= colorThreshold) {
      // This voxel will be removed, so mark it as deleted in the map
      const gridX = floor((voxel.x + state.cols * state.voxelSize / 2) / state.voxelSize);
      const gridY = floor((voxel.y + state.rows * state.voxelSize / 2) / state.voxelSize);
      const key = `${gridX},${gridY}`;
      newEditedVoxelsMap[key] = 'deleted';
    }
  }
  
  // Update state
  state.setEditedVoxelsMap(newEditedVoxelsMap);
  state.setVoxels(filteredVoxels);
  
  console.log(`Removed ${removedCount} background voxels`);
  
  // Update the canvas
  redraw();
  updateUndoRedoButtonStates(state.undoStack, state.redoStack);
}