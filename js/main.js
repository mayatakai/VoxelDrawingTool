/**
 * main.js
 * Entry point for the VoxelDrawingTool application
 * Initializes the p5.js setup and imports all required modules
 */

import * as state from './state.js';
import { setupUI } from './ui.js';
import { generateVoxels, updateImageAndVoxels } from './voxels.js';
import { draw, windowResized, keyPressed, performUndo, performRedo } from './render.js';
import { initCameraControls, setupDoubleClickReset } from './camera.js';
import { setupViewManagement } from './view-management.js';

/**
 * p5.js setup function - called once at the beginning
 * Sets up the canvas and initializes the application
 */
window.setup = function() {
  // Get the main-content container dimensions for responsive canvas
  const mainContent = document.querySelector('.main-content');
  const canvasWidth = mainContent.clientWidth;
  const canvasHeight = mainContent.clientHeight;
  
  // Create canvas inside the main-content container
  const canvas = createCanvas(canvasWidth, canvasHeight, WEBGL);
  canvas.parent(mainContent);
  
  noLoop(); // No need to continuously redraw
  
  // Set the canvas to optimize readback performance
  const canvasElement = document.querySelector('canvas');
  canvasElement.willReadFrequently = true;
  
  // Store the canvas element in state for access from other modules
  state.addUIReference(canvasElement, 'canvasElement');
  
  // Initialize our custom camera controls - replaces orbitControl()
  initCameraControls(canvasElement);
  setupDoubleClickReset(canvasElement);
  
  noStroke(); // Disable outline around voxels (no stroke for cubes)
  
  // Initialize the UI
  setupUI();
  
  // Initialize view management functionality
  setupViewManagement();
  
  // Attach the canvas click handler from UI module AFTER setupUI is called
  // This ensures the canvasClickHandler function is defined before we try to use it
  canvasElement.addEventListener('click', window.canvasClickHandler);
};

/**
 * Export the p5.js event functions for global access
 */
window.draw = draw;
window.windowResized = windowResized;
window.keyPressed = keyPressed;

/**
 * Export additional helper functions for global access if needed
 */
window.generateVoxels = generateVoxels;
window.updateImageAndVoxels = updateImageAndVoxels;
window.performUndo = performUndo;
window.performRedo = performRedo;

/**
 * Initialize any other global settings or configurations here
 */
console.log('Voxel Drawing Tool initialized!');



/**
 * Fill Extrusion Button
 */
document.getElementById('fillExtrusionBtn').addEventListener('click', () => {
  generateVoxels(true); // Pass `true` to enable fill extrusion
});