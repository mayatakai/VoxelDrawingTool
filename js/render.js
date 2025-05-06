/**
 * render.js
 * Contains the p5.js drawing routines for rendering the 3D voxels
 */

import * as state from './state.js';
import { applyCameraState } from './camera.js';

/**
 * p5.js draw function, called automatically by p5 to render each frame
 */
export function draw() {
  background(0);
  
  // Apply camera transformations before drawing voxels
  push();
  applyCameraState();

  // Loop through all the voxels and render them in 3D space
  for (let i = 0; i < state.voxels.length; i++) {
    let voxel = state.voxels[i];

    push();
    translate(voxel.x, voxel.y, voxel.z); // Position the voxel in 3D space
    
    // Highlight voxels with similar colors
    if (state.selectedVoxels.includes(voxel)) {
      stroke(255, 255, 0); // Yellow stroke for similar colored voxels
      strokeWeight(2);
    } else {
      noStroke();
    }

    fill(voxel.color); // Set the voxel color based on pixel color
    box(state.voxelSize); // Create the voxel (a cube)
    pop();
  }
  
  pop();
}

/**
 * Handle window resizing to maintain responsive layout
 */
export function windowResized() {
  // Get the new main-content container dimensions
  const mainContent = document.querySelector('.main-content');
  const canvasWidth = mainContent.clientWidth;
  const canvasHeight = mainContent.clientHeight;
  
  // Resize the canvas to fit the container
  resizeCanvas(canvasWidth, canvasHeight);
  
  // Redraw the scene with proper dimensions
  redraw();
}

/**
 * Handle keyboard events for deletion and undo functionality
 */
export function keyPressed() {
  // Delete selected voxels with Delete key or Left Arrow key
  if (key === 'Delete' || keyCode === LEFT_ARROW) {
    if (state.selectedVoxels.length > 0) {
      // Store current state in undo stack before modifying
      state.updateUndoStack([...state.voxels]);
      state.clearRedoStack();
      
      // Mark selected voxels as deleted in editedVoxelsMap
      const newEditedVoxelsMap = {...state.editedVoxelsMap};
      
      for (const voxel of state.selectedVoxels) {
        const gridX = floor((voxel.x + state.cols * state.voxelSize / 2) / state.voxelSize);
        const gridY = floor((voxel.y + state.rows * state.voxelSize / 2) / state.voxelSize);
        const key = `${gridX},${gridY}`;
        newEditedVoxelsMap[key] = 'deleted';
      }
      
      state.setEditedVoxelsMap(newEditedVoxelsMap);
      
      // Remove selected voxels from the voxels array
      const newVoxels = state.voxels.filter(voxel => !state.selectedVoxels.includes(voxel));
      state.setVoxels(newVoxels);
      
      // Clear the selection
      state.setSelectedVoxels([]);
      state.setSelectedColor(null);
      
      // Update the selected color display
      const updateSelectedColorDisplay = (color) => {
        const colorDisplay = document.getElementById('selectedColorDisplay');
        colorDisplay.textContent = 'None';
        colorDisplay.style.color = 'inherit';
      };
      updateSelectedColorDisplay(null);
      
      // Update the canvas
      redraw();
    }
  }
  
  // Undo with Ctrl+Z
  if (keyIsDown(CONTROL) && key === 'z') {
    performUndo();
  }
  
  // Redo with Ctrl+Y
  if (keyIsDown(CONTROL) && key === 'y') {
    performRedo();
  }
}

/**
 * Function to perform undo operation
 */
export function performUndo() {
  if (state.undoStack.length > 0) {
    // Store current state in redo stack before undoing
    state.updateRedoStack([...state.voxels]);
    
    // Restore the last state from undoStack
    const previousState = state.undoStack.pop();
    state.setVoxels(previousState);
    
    // Reset the editedVoxelsMap to reflect current voxels
    updateEditedVoxelsMap();
    
    // Clear the selection
    state.setSelectedVoxels([]);
    state.setSelectedColor(null);
    
    // Update the selected color display
    const updateSelectedColorDisplay = (color) => {
      const colorDisplay = document.getElementById('selectedColorDisplay');
      colorDisplay.textContent = 'None';
      colorDisplay.style.color = 'inherit';
    };
    updateSelectedColorDisplay(null);
    
    // Update the canvas
    redraw();
  }
  updateUndoRedoButtonStates();
}

/**
 * Function to perform redo operation
 */
export function performRedo() {
  if (state.redoStack.length > 0) {
    // Store current state in undo stack before redoing
    state.updateUndoStack([...state.voxels]);
    
    // Restore the last state from redoStack
    const nextState = state.redoStack.pop();
    state.setVoxels(nextState);
    
    // Reset the editedVoxelsMap to reflect current voxels
    updateEditedVoxelsMap();
    
    // Clear the selection
    state.setSelectedVoxels([]);
    state.setSelectedColor(null);
    
    // Update the selected color display
    const updateSelectedColorDisplay = (color) => {
      const colorDisplay = document.getElementById('selectedColorDisplay');
      colorDisplay.textContent = 'None';
      colorDisplay.style.color = 'inherit';
    };
    updateSelectedColorDisplay(null);
    
    // Update the canvas
    redraw();
  }
  updateUndoRedoButtonStates();
}

/**
 * Updates the edited voxels map when undoing or redoing
 */
function updateEditedVoxelsMap() {
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
 * Update the states of undo and redo buttons
 */
function updateUndoRedoButtonStates() {
  const undoButton = document.getElementById('undoButton');
  const redoButton = document.getElementById('redoButton');
  
  undoButton.disabled = state.undoStack.length === 0;
  redoButton.disabled = state.redoStack.length === 0;
}