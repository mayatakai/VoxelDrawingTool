/**
 * ui.js
 * Handles all user interface interactions, including event listeners and UI updates
 */

import * as state from './state.js';
import { calculateColorDistance, updateSelectedColorDisplay, updateUndoRedoButtonStates } from './utils.js';
import { applyColorPalette, generateVoxels, getVoxelAtClick, recalculateDepthsFromCurrentColors, removeBackground, revertToOriginalImage, updateImageAndVoxels } from './voxels.js';
import { performUndo, performRedo } from './render.js';

/**
 * Set up all UI elements and attach event listeners
 */
export function setupUI() {
  // Get UI elements
  setupSliders();
  setupButtons();
  setupCanvasInteractions();
  setupPaletteButtons();
  setupDepthModeButtons();
  setupKeyboardEvents();
}

/**
 * Set up sliders and their event listeners
 */
function setupSliders() {
  // Resolution slider
  const resolutionSlider = document.getElementById('resolutionSlider');
  state.addUIReference(resolutionSlider, 'resolutionSlider');
  resolutionSlider.addEventListener('input', () => {
    state.setVoxelSize(parseInt(resolutionSlider.value));
    state.setCols(floor(width / state.voxelSize));
    state.setRows(floor(height / state.voxelSize));
    state.setLastUpdateSource('resolutionSlider');
    updateImageAndVoxels();
  });

  // Reduction slider
  const reduceSlider = document.getElementById('reduceSlider');
  state.addUIReference(reduceSlider, 'reduceSlider');
  reduceSlider.addEventListener('input', () => {
    if (state.img) {
      // Store current state in undo stack before modifying
      state.updateUndoStack([...state.voxels]);
      state.clearRedoStack();
      
      generateVoxels();
      updateUndoRedoButtonStates(state.undoStack, state.redoStack);
    }
  });

  // Depth scaling slider
  const depthSlider = document.getElementById('depthSlider');
  state.addUIReference(depthSlider, 'depthSlider');
  depthSlider.addEventListener('input', () => {
    if (state.img) {
      // Store current state in undo stack before modifying
      state.updateUndoStack([...state.voxels]);
      state.clearRedoStack();
      
      generateVoxels();
      updateUndoRedoButtonStates(state.undoStack, state.redoStack);
    }
  });

  // Color similarity threshold slider
  const colorThresholdSlider = document.getElementById('colorThresholdSlider');
  state.addUIReference(colorThresholdSlider, 'colorThresholdSlider');
  colorThresholdSlider.addEventListener('input', () => {
    if (state.selectedColor) {
      const colorThreshold = parseInt(colorThresholdSlider.value);
      const newSelectedVoxels = state.voxels.filter(voxel => 
        calculateColorDistance(voxel.color, state.selectedColor) <= colorThreshold
      );
      state.setSelectedVoxels(newSelectedVoxels);
      redraw();
    }
  });
}

/**
 * Set up buttons and their event listeners
 */
function setupButtons() {
  // File upload button
  document.getElementById('uploadButton').addEventListener('change', handleImageUpload);

  // Invert depth button
  const invertDepthButton = document.getElementById('invertDepthButton');
  invertDepthButton.addEventListener('click', () => {
    state.setInvertDepth(!state.invertDepth);
    if (state.img) {
      generateVoxels();
    }
  });

  // Recalculate depths button
  document.getElementById('recalculateDepthsButton').addEventListener('click', recalculateDepthsFromCurrentColors);

  // Revert to original button
  document.getElementById('revertToOriginalButton').addEventListener('click', revertToOriginalImage);
  
  // Remove background button
  document.getElementById('removeBackgroundButton').addEventListener('click', removeBackground);

  // Undo and redo buttons
  document.getElementById('undoButton').addEventListener('click', performUndo);
  document.getElementById('redoButton').addEventListener('click', performRedo);
  
  // Initialize button states
  updateUndoRedoButtonStates(state.undoStack, state.redoStack);
}

/**
 * Handle image upload from file input
 * @param {Event} event - The change event from the file input
 */
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    loadImage(URL.createObjectURL(file), (loadedImage) => {
      state.setOriginalImg(loadedImage.get());
      updateImageAndVoxels();
    });
  }
}

/**
 * Set up canvas click interactions for selecting voxels
 */
function setupCanvasInteractions() {
  // Add mousePressed event to select voxel color
  const canvasClickHandler = (event) => {
    if (!state.img) return; // Ensure the image is loaded

    // Map mouse coordinates to canvas coordinates
    const rect = state.canvasElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - width / 2;
    const mouseY = event.clientY - rect.top - height / 2;

    const clickedVoxel = getVoxelAtClick(mouseX, mouseY);
    if (clickedVoxel) {
      // Voxel was clicked - select it and similar voxels
      state.setSelectedColor(clickedVoxel.color);
      console.log('Selected Color:', state.selectedColor);

      // Find all voxels with similar colors
      const colorThreshold = parseInt(state.colorThresholdSlider.value);
      const newSelectedVoxels = state.voxels.filter(voxel => 
        calculateColorDistance(voxel.color, state.selectedColor) <= colorThreshold
      );
      state.setSelectedVoxels(newSelectedVoxels);

      console.log(`Found ${state.selectedVoxels.length} similar colored voxels`);
      updateSelectedColorDisplay(state.selectedColor);
    } else {
      // No voxel was clicked - clear the selection
      state.setSelectedColor(null);
      state.setSelectedVoxels([]);
      console.log('Selection cleared - clicked on empty area');
      updateSelectedColorDisplay(null);
    }
    
    // Redraw the scene to reflect changes in selection state
    redraw();
  };

  // We'll attach this event handler to the canvas in the main.js after canvas creation
  window.canvasClickHandler = canvasClickHandler;
}

/**
 * Set up palette buttons for color themes
 */
function setupPaletteButtons() {
  // Set up default palette buttons
  document.getElementById('pastelPaletteBtn').addEventListener('click', () => {
    applyColorPalette(state.pastelPalette);
  });
  
  document.getElementById('neonPaletteBtn').addEventListener('click', () => {
    applyColorPalette(state.neonPalette);
  });
  
  document.getElementById('earthPaletteBtn').addEventListener('click', () => {
    applyColorPalette(state.earthPalette);
  });
  
  document.getElementById('oceanPaletteBtn').addEventListener('click', () => {
    applyColorPalette(state.oceanPalette);
  });

  // Generate dynamic palette buttons
  generatePaletteButtons();
}

/**
 * Generate dynamic color palette buttons
 */
function generatePaletteButtons() {
  const paletteButtonsContainer = document.getElementById('paletteButtons');
  
  // Clear existing buttons except the default ones
  const defaultButtons = Array.from(paletteButtonsContainer.querySelectorAll('.paletteBtn')).filter(btn => 
    ['pastelPaletteBtn', 'neonPaletteBtn', 'earthPaletteBtn', 'oceanPaletteBtn'].includes(btn.id)
  );
  
  paletteButtonsContainer.innerHTML = '';
  
  // Add the default buttons back
  defaultButtons.forEach(btn => paletteButtonsContainer.appendChild(btn));

  // Generate buttons for each custom theme
  state.colorThemes.forEach((palette, index) => {
    // Create button element
    const button = document.createElement('button');
    button.className = 'paletteBtn';
    button.id = `palette-${index}`;
    
    // Set the button style based on the palette
    if (palette.length === 1) {
      // Single color
      button.style.background = palette[0];
      
      // Set text color based on background brightness for readability
      const hexColor = palette[0].slice(1); // Remove the # character
      const r = parseInt(hexColor.slice(0, 2), 16);
      const g = parseInt(hexColor.slice(2, 4), 16);
      const b = parseInt(hexColor.slice(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      button.style.color = brightness > 128 ? '#000' : '#fff';
    } else {
      // Create gradient for multi-color palettes
      const gradientStops = palette.map((color, i) => 
        `${color} ${i * (100 / (palette.length - 1))}%`
      ).join(', ');
      button.style.background = `linear-gradient(to right, ${gradientStops})`;
      button.style.color = '#fff';
    }
    
    // Add click event
    button.addEventListener('click', () => {
      applyColorPalette(palette);
    });
    
    // Append button to container
    paletteButtonsContainer.appendChild(button);
  });
}

/**
 * Set up depth mode buttons and their event listeners
 */
function setupDepthModeButtons() {
  const depthModes = [
    { id: 'brightnessDepthBtn', mode: 'brightness' },
    { id: 'redDepthBtn', mode: 'red' },
    { id: 'greenDepthBtn', mode: 'green' },
    { id: 'blueDepthBtn', mode: 'blue' },
    { id: 'saturationDepthBtn', mode: 'saturation' },
    { id: 'hueDepthBtn', mode: 'hue' }
  ];
  
  depthModes.forEach(({ id, mode }) => {
    const button = document.getElementById(id);
    button.addEventListener('click', () => {
      // Store current state in undo stack before modifying
      if (state.voxels.length > 0) {
        state.updateUndoStack([...state.voxels]);
        state.clearRedoStack();
      }
      
      // Update active button styling
      document.querySelectorAll('.depthModeBtn').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Set the depth mode and regenerate voxels
      state.setDepthMode(mode);
      
      // Only regenerate if image is loaded
      if (state.img) {
        generateVoxels();
      }
      
      console.log(`Depth mode set to: ${mode}`);
    });
  });
}

/**
 * Set up keyboard event handlers
 */
function setupKeyboardEvents() {
  // We'll use p5.js keyPressed function from render.js
  // This is just a placeholder in case we need to add specific UI-related keyboard events
}