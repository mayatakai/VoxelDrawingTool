/**
 * camera.js
 * Provides enhanced 3D camera controls for the voxel drawing tool
 */

import * as state from './state.js';

// Camera state
let cameraState = {
  rotX: 0,
  rotY: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  isPanning: false,
  prevMouseX: 0,
  prevMouseY: 0
};

// Stored camera views (named viewpoints that can be saved/loaded)
let savedCameraViews = {};

/**
 * Get the current camera state
 * @returns {Object} The current camera state
 */
export function getCameraState() {
  return { ...cameraState }; // Return a copy to prevent direct mutation
}

/**
 * Save the current camera state to a JSON object
 * @returns {Object} A JSON-serializable object with the current view parameters
 */
export function saveViewToJSON() {
  // Include only the essential view parameters, not interaction state
  return {
    rotX: cameraState.rotX,
    rotY: cameraState.rotY,
    zoom: cameraState.zoom,
    panX: cameraState.panX,
    panY: cameraState.panY,
    timestamp: new Date().toISOString(),
    name: `View-${Object.keys(savedCameraViews).length + 1}`
  };
}

/**
 * Save the current view with a name
 * @param {string} name - Optional name for the saved view
 * @returns {Object} The saved view object
 */
export function saveView(name = null) {
  const view = saveViewToJSON();
  
  // Use provided name or generate one
  if (name) {
    view.name = name;
  }
  
  // Store the view in our collection
  savedCameraViews[view.name] = view;
  
  // Also save to localStorage for persistence across sessions
  try {
    const savedViews = JSON.parse(localStorage.getItem('savedCameraViews') || '{}');
    savedViews[view.name] = view;
    localStorage.setItem('savedCameraViews', JSON.stringify(savedViews));
  } catch (e) {
    console.error('Failed to save view to localStorage:', e);
  }
  
  return view;
}

/**
 * Load saved views from localStorage on startup
 */
export function loadSavedViews() {
  try {
    const savedViews = JSON.parse(localStorage.getItem('savedCameraViews') || '{}');
    savedCameraViews = savedViews;
    return Object.values(savedViews);
  } catch (e) {
    console.error('Failed to load saved views from localStorage:', e);
    return [];
  }
}

/**
 * Get all saved views
 * @returns {Array} Array of saved view objects
 */
export function getSavedViews() {
  return Object.values(savedCameraViews);
}

/**
 * Load a saved camera view
 * @param {string} viewName - Name of the view to load
 * @returns {boolean} Success status
 */
export function loadView(viewName) {
  const view = savedCameraViews[viewName];
  
  if (!view) {
    console.error(`View "${viewName}" not found`);
    return false;
  }
  
  // Apply the saved view parameters
  cameraState.rotX = view.rotX;
  cameraState.rotY = view.rotY;
  cameraState.zoom = view.zoom;
  cameraState.panX = view.panX;
  cameraState.panY = view.panY;
  
  // Redraw with the new view
  redraw();
  return true;
}

/**
 * Load a camera state from a JSON object
 * @param {Object} viewData - Camera view data
 * @returns {boolean} Success status
 */
export function loadViewFromJSON(viewData) {
  if (!viewData || 
      typeof viewData.rotX !== 'number' || 
      typeof viewData.rotY !== 'number' ||
      typeof viewData.zoom !== 'number') {
    console.error('Invalid view data:', viewData);
    return false;
  }
  
  // Apply the saved view parameters
  cameraState.rotX = viewData.rotX;
  cameraState.rotY = viewData.rotY;
  cameraState.zoom = viewData.zoom || 1;
  cameraState.panX = viewData.panX || 0;
  cameraState.panY = viewData.panY || 0;
  
  // Redraw with the new view
  redraw();
  return true;
}

/**
 * Delete a saved view
 * @param {string} viewName - Name of the view to delete
 * @returns {boolean} Success status
 */
export function deleteView(viewName) {
  if (!savedCameraViews[viewName]) {
    return false;
  }
  
  // Remove from memory
  delete savedCameraViews[viewName];
  
  // Also remove from localStorage
  try {
    const savedViews = JSON.parse(localStorage.getItem('savedCameraViews') || '{}');
    delete savedViews[viewName];
    localStorage.setItem('savedCameraViews', JSON.stringify(savedViews));
  } catch (e) {
    console.error('Failed to remove view from localStorage:', e);
  }
  
  return true;
}

/**
 * Initialize camera controls
 * Sets up all event listeners for mouse interaction
 */
export function initCameraControls(canvas) {
  // Load any previously saved views
  loadSavedViews();
  
  // Store initial mouse position when pressing down
  canvas.addEventListener('mousedown', (e) => {
    cameraState.prevMouseX = e.clientX;
    cameraState.prevMouseY = e.clientY;
    
    // Right mouse button for rotation
    if (e.button === 2) {
      cameraState.isDragging = true;
      e.preventDefault(); // Prevent browser's context menu
    } 
    // Left mouse button with Ctrl key for panning
    else if (e.button === 0 && e.ctrlKey) {
      cameraState.isPanning = true;
    }
    // Left mouse button alone does nothing now
  });
  
  // Update camera on mouse move if dragging
  canvas.addEventListener('mousemove', (e) => {
    if (!cameraState.isDragging && !cameraState.isPanning) return;
    
    // Calculate mouse movement deltas
    const deltaX = e.clientX - cameraState.prevMouseX;
    const deltaY = e.clientY - cameraState.prevMouseY;
    cameraState.prevMouseX = e.clientX;
    cameraState.prevMouseY = e.clientY;
    
    // Apply rotation or panning based on the mode
    if (cameraState.isDragging) {
      // Rotate the scene (sensitivity factor can be adjusted)
      const sensitivity = 0.01;
      cameraState.rotY += deltaX * sensitivity;
      cameraState.rotX += deltaY * sensitivity;
      // Limit vertical rotation to prevent flipping
      cameraState.rotX = constrain(cameraState.rotX, -PI/2, PI/2);
    } else if (cameraState.isPanning) {
      // Pan the scene
      const panSensitivity = 0.5 / cameraState.zoom; // Adjust pan speed based on zoom level
      cameraState.panX += deltaX * panSensitivity;
      cameraState.panY += deltaY * panSensitivity;
    }
    
    // Redraw the scene with the new camera orientation
    redraw();
  });
  
  // Stop dragging when mouse is released
  canvas.addEventListener('mouseup', () => {
    cameraState.isDragging = false;
    cameraState.isPanning = false;
  });
  
  // Handle mouse leaving the canvas
  canvas.addEventListener('mouseleave', () => {
    cameraState.isDragging = false;
    cameraState.isPanning = false;
  });
  
  // Handle zoom with mouse wheel
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSensitivity = 0.1;
    // Check scroll direction and zoom in/out accordingly
    if (e.deltaY > 0) {
      // Zoom out (min zoom = 0.1)
      cameraState.zoom = max(0.1, cameraState.zoom - zoomSensitivity);
    } else {
      // Zoom in (max zoom = 5)
      cameraState.zoom = min(5, cameraState.zoom + zoomSensitivity);
    }
    
    // Redraw the scene with the new zoom level
    redraw();
  }, { passive: false });
  
  // Prevent context menu on right-click to allow right-click rotation
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Update the UI with camera control tooltips
  addCameraTooltips();
}

/**
 * Apply the current camera state to the scene
 * Should be called at the beginning of each draw call
 */
export function applyCameraState() {
  // Apply pan offset
  translate(cameraState.panX, cameraState.panY, 0);
  
  // Apply zoom
  scale(cameraState.zoom);
  
  // Apply rotation - order matters for 3D rotation
  rotateX(cameraState.rotX);
  rotateY(cameraState.rotY);
}

/**
 * Reset the camera to default position
 */
export function resetCamera() {
  cameraState.rotX = 0;
  cameraState.rotY = 0;
  cameraState.zoom = 1;
  cameraState.panX = 0;
  cameraState.panY = 0;
  redraw();
}

/**
 * Add tooltips to explain camera controls to user
 */
function addCameraTooltips() {
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) return;
  
  // Create a tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'camera-controls-tooltip';
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <h4>3D View Controls</h4>
      <ul>
        <li><strong>Right Mouse Drag:</strong> Rotate View</li>
        <li><strong>Scroll Wheel:</strong> Zoom In/Out</li>
        <li><strong>Ctrl + Left Mouse Drag:</strong> Pan View</li>
        <li><strong>Double Click:</strong> Reset View</li>
      </ul>
    </div>
  `;
  mainContent.appendChild(tooltip);
  
  // Add CSS for the tooltip
  const style = document.createElement('style');
  style.textContent = `
    .camera-controls-tooltip {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      border-radius: 5px;
      padding: 5px;
      font-size: 12px;
      z-index: 100;
      pointer-events: none;
      opacity: 0.7;
    }
    .tooltip-content {
      padding: 5px;
    }
    .tooltip-content h4 {
      margin: 0 0 5px 0;
    }
    .tooltip-content ul {
      margin: 0;
      padding: 0 0 0 15px;
    }
  `;
  document.head.appendChild(style);
}

// Event listener for double-click to reset camera
export function setupDoubleClickReset(canvas) {
  canvas.addEventListener('dblclick', (e) => {
    resetCamera();
  });
}