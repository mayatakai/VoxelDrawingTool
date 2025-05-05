let img;
let originalImg; // Store the original image for resizingi  
let cols = 64; // Number of voxels in the x-direction
let rows = 64; // Number of voxels in the y-direction
let voxelSize = 20; // Size of each voxel (cube)
let voxels = []; // Array to store voxel positions and colors
let editedVoxelsMap = {}; // Map to track which grid positions have been edited (deleted)
let colorMap = {}; // Map to track custom colors applied to specific positions
let resolutionSlider; // Slider for adjusting resolution
let reduceSlider; // Slider for random voxel reduction percentage
let depthSlider; // Slider for depth scaling
let colorThresholdSlider; // Slider for color similarity threshold
let invertDepth = false; // Boolean to track depth inversion
let selectedColor = null; // Variable to store the selected voxel color
let selectedVoxel = null; // Variable to store the selected voxel for highlighting
let selectedVoxels = []; // Array to store voxels with similar colors
let canvasElement; // Reference to the canvas element
let undoStack = []; // Stack to store previous states for undo functionality
let redoStack = []; // Stack to store future states for redo functionality
let depthMode = 'brightness'; // Default depth calculation mode

// Color palettes
const pastelPalette = ['#fddde6', '#d7c0f6', '#c5f4f0', '#ffe6c9', '#ffd1dc'];
const neonPalette = ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000'];
const earthPalette = ['#8B4513', '#556B2F', '#A0522D', '#CD853F', '#6E8B3D'];
const oceanPalette = ['#00008B', '#0000CD', '#4169E1', '#87CEEB', '#ADD8E6'];

// Function to apply a color palette to voxels
function applyColorPalette(palette) {
  // Store current state in undo stack before modifying
  undoStack.push([...voxels]);
  redoStack = []; // Clear redo stack

  // Determine which voxels to modify
  const voxelsToModify = selectedVoxels.length > 0 ? selectedVoxels : voxels;
  
  // Sort voxels by brightness for better color mapping
  voxelsToModify.sort((a, b) => {
    const brightnessA = (red(a.color) + green(a.color) + blue(a.color)) / 3;
    const brightnessB = (red(b.color) + green(b.color) + blue(b.color)) / 3;
    return brightnessA - brightnessB;
  });
  
  // Apply colors from the palette
  for (let i = 0; i < voxelsToModify.length; i++) {
    const voxel = voxelsToModify[i];
    
    // Map voxel index to palette color index
    const colorIndex = floor(map(i, 0, voxelsToModify.length - 1, 0, palette.length - 1));
    const hexColor = palette[colorIndex];
    
    // Convert hex to RGB color
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Get grid coordinates for this voxel
    const gridX = floor((voxel.x + cols * voxelSize / 2) / voxelSize);
    const gridY = floor((voxel.y + rows * voxelSize / 2) / voxelSize);
    const key = `${gridX},${gridY}`;
    
    // Store the custom color in colorMap
    colorMap[key] = color(r, g, b);
    
    // Update voxel color
    voxel.color = color(r, g, b);
  }
  
  redraw(); // Update the canvas display
}

// Color themes for the palette buttons
const colorThemes = [
  ['#f5f5f5'], ['#dcdce6'], ['#b5b5c0'], ['#888893'], ['#4f4f54'],
  ['#d5c9f5'], ['#d6bcf4'], ['#fbc8ea'], ['#fda6d2'], ['#fc85ce'],
  ['#365cf0', '#365cf0', '#365cf0', '#365cf0'],
  ['#ff2cd4', '#ff2cd4', '#ff2cd4', '#ff2cd4'],
  ['#ff8e6c', '#ffc898', '#ffd899', '#f6ffc6'],
  ['#ffe688', '#e6fcb2', '#b6f6d2', '#a8f2e8'],
  ['#ffc8ec', '#b8ebfc', '#c0fccc', '#e9fcb9'],
  ['#b9ff69', '#97fcb6', '#a0fcee', '#a2bbf9'],
  ['#71f6f6', '#5bd1f3', '#8ce7c9', '#c4fdcd'],
  ['#b0fdd9', '#c3f7b7', '#eafcb8', '#fdd6fa'],
  ['#dbc8fd', '#c8cbfd', '#d3d4ff', '#ebc7fb'],
  ['#c3f6b0', '#c7f2d6', '#d9f8e6', '#d6f0fc']
];

// Function to generate color palette buttons
function generatePaletteButtons() {
  const paletteButtonsContainer = document.getElementById('paletteButtons');
  
  // Clear existing buttons
  paletteButtonsContainer.innerHTML = '';

  // Generate buttons for each theme
  colorThemes.forEach((palette, index) => {
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
  
  // Add the default palette buttons back
  const defaultPalettes = [
    { id: 'pastelPaletteBtn', name: 'Pastel', palette: pastelPalette },
    { id: 'neonPaletteBtn', name: 'Neon', palette: neonPalette },
    { id: 'earthPaletteBtn', name: 'Earth', palette: earthPalette },
    { id: 'oceanPaletteBtn', name: 'Ocean', palette: oceanPalette }
  ];
  
  defaultPalettes.forEach(({ id, name, palette }) => {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'paletteBtn';
    button.textContent = name;
    button.addEventListener('click', () => {
      applyColorPalette(palette);
    });
    paletteButtonsContainer.appendChild(button);
  });
}

function setup() {
  // Get the main-content container dimensions for responsive canvas
  const mainContent = document.querySelector('.main-content');
  const canvasWidth = mainContent.clientWidth;
  const canvasHeight = mainContent.clientHeight;
  
  // Create canvas inside the main-content container
  const canvas = createCanvas(canvasWidth, canvasHeight, WEBGL);
  canvas.parent(mainContent);
  
  noLoop(); // No need to continuously redraw
  
  // Set the canvas to optimize readback performance
  canvasElement = document.querySelector('canvas');
  canvasElement.willReadFrequently = true;
  

  // Allow mouse interaction to rotate the camera view
  orbitControl(); // Enables mouse interaction for orbiting around the scene
  noStroke(); // Disable outline around voxels (no stroke for cubes)

  // Create a resolution slider
  resolutionSlider = document.getElementById('resolutionSlider');
  resolutionSlider.addEventListener('input', () => {
    voxelSize = parseInt(resolutionSlider.value); // Correctly access the value property
    cols = floor(width / voxelSize);
    rows = floor(height / voxelSize);
    window.lastUpdateSource = 'resolutionSlider'; // Track the source of the update
    updateImageAndVoxels(); // Call the function to update the image and generate voxels
    
  });

  // Create a random reduction slider
  reduceSlider = document.getElementById('reduceSlider');
  reduceSlider.addEventListener('input', () => {
    if (img) {
      // Store current state in undo stack before modifying
      undoStack.push([...voxels]);
      redoStack = []; // Clear redo stack
      
      generateVoxels(); // Regenerate voxels when slider value changes
      updateUndoRedoButtonStates(); // Update button states
    }
  });

  // Create a depth scaling slider
  depthSlider = document.getElementById('depthSlider');
  depthSlider.addEventListener('input', () => {
    if (img) {
      // Store current state in undo stack before modifying
      undoStack.push([...voxels]);
      redoStack = []; // Clear redo stack
      
      generateVoxels(); // Regenerate voxels when slider value changes
      updateUndoRedoButtonStates(); // Update button states
    }
  });

  // Create a color similarity threshold slider
  colorThresholdSlider = document.getElementById('colorThresholdSlider');
  colorThresholdSlider.addEventListener('input', () => {
    if (selectedColor) {
      const colorThreshold = parseInt(colorThresholdSlider.value); // Get threshold value
      selectedVoxels = voxels.filter(voxel => 
        calculateColorDistance(voxel.color, selectedColor) <= colorThreshold
      );
      redraw(); // Redraw the scene to reflect the updated selected voxels
    }
  });

  document.getElementById('uploadButton').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      loadImage(URL.createObjectURL(file), (loadedImage) => {
        originalImg = loadedImage.get(); // save the original image
        updateImageAndVoxels(); // Call the function to update the image and generate voxels
      });
    }
  });

  // Add event listener for the invert depth button
  const invertDepthButton = document.getElementById('invertDepthButton');
  invertDepthButton.addEventListener('click', () => {
    invertDepth = !invertDepth; // Toggle the invertDepth variable
    if (img) {
      generateVoxels(); // Regenerate voxels when depth inversion is toggled
    }
  });

  // Add mousePressed event to select voxel color
  canvasElement.addEventListener('click', (event) => {
    if (!img) return; // Ensure the image is loaded

    // Map mouse coordinates to canvas coordinates
    const rect = canvasElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - width / 2;
    const mouseY = event.clientY - rect.top - height / 2;

    const clickedVoxel = getVoxelAtClick(mouseX, mouseY);
    if (clickedVoxel) {
      // Voxel was clicked - select it and similar voxels
      selectedColor = clickedVoxel.color;
      console.log('Selected Color:', selectedColor);

      // Find all voxels with similar colors
      const colorThreshold = parseInt(colorThresholdSlider.value); // Get threshold value
      selectedVoxels = voxels.filter(voxel => 
        calculateColorDistance(voxel.color, selectedColor) <= colorThreshold
      );

      console.log(`Found ${selectedVoxels.length} similar colored voxels`);
      updateSelectedColorDisplay(selectedColor);
    } else {
      // No voxel was clicked - clear the selection
      selectedColor = null;
      selectedVoxels = [];
      console.log('Selection cleared - clicked on empty area');
      updateSelectedColorDisplay(null);
    }
    
    // Redraw the scene to reflect changes in selection state
    redraw();
  });

  // Add event listeners for palette buttons
  document.getElementById('pastelPaletteBtn').addEventListener('click', () => {
    applyColorPalette(pastelPalette);
  });
  
  document.getElementById('neonPaletteBtn').addEventListener('click', () => {
    applyColorPalette(neonPalette);
  });
  
  document.getElementById('earthPaletteBtn').addEventListener('click', () => {
    applyColorPalette(earthPalette);
  });
  
  document.getElementById('oceanPaletteBtn').addEventListener('click', () => {
    applyColorPalette(oceanPalette);
  });

  // Add event listener for recalculate depths button
  document.getElementById('recalculateDepthsButton').addEventListener('click', () => {
    recalculateDepthsFromCurrentColors();
  });

  // Add event listener for revert to original button
  document.getElementById('revertToOriginalButton').addEventListener('click', () => {
    revertToOriginalImage();
  });
  
  // Add event listener for remove background button
  document.getElementById('removeBackgroundButton').addEventListener('click', () => {
    removeBackground();
  });

  // Add event listeners for undo and redo buttons
  document.getElementById('undoButton').addEventListener('click', () => {
    performUndo();
  });
  
  document.getElementById('redoButton').addEventListener('click', () => {
    performRedo();
  });
  
  // Update button states initially
  updateUndoRedoButtonStates();

  // Generate palette buttons
  generatePaletteButtons();

  // Set up depth mode buttons
  setupDepthModeButtons();
}

// Handle window resizing to maintain responsive layout
function windowResized() {
  // Get the new main-content container dimensions
  const mainContent = document.querySelector('.main-content');
  const canvasWidth = mainContent.clientWidth;
  const canvasHeight = mainContent.clientHeight;
  
  // Resize the canvas to fit the container
  resizeCanvas(canvasWidth, canvasHeight);
  
  // Redraw the scene with proper dimensions
  redraw();
}

// Update the selected color display in the HTML
function updateSelectedColorDisplay(color) {
  const colorDisplay = document.getElementById('selectedColorDisplay');
  if (color) {
    // Access color components using p5.js functions instead of destructuring
    const r = red(color);
    const g = green(color);
    const b = blue(color);
    const a = alpha(color);
    
    colorDisplay.textContent = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    colorDisplay.style.color = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  } else {
    colorDisplay.textContent = 'None';
    colorDisplay.style.color = 'inherit';
  }
}

// Function to update the image and generate voxels
function updateImageAndVoxels() {
  if (!originalImg) return;

  // Track where this function was called from
  const isFromResolutionChange = window.lastUpdateSource === 'resolutionSlider';
  window.lastUpdateSource = null; // Reset the source tracker
  
  // Always reset data structures for new image upload
  if (!isFromResolutionChange) {
    colorMap = {};
    editedVoxelsMap = {};
    selectedColor = null;
    selectedVoxels = [];
    undoStack = [];
    redoStack = [];
    
    // Update the selected color display
    updateSelectedColorDisplay(null);
  }

  // Calculate maximum dimensions that will fit in the canvas with some padding
  const maxWidth = width * 0.8;
  const maxHeight = height * 0.8;
  
  // Calculate scaled dimensions that maintain aspect ratio
  let aspectRatio = originalImg.width / originalImg.height;
  let targetWidth, targetHeight;
  
  if (aspectRatio > 1) {
    // Image is wider than tall
    targetWidth = min(maxWidth, originalImg.width);
    targetHeight = targetWidth / aspectRatio;
    
    // If height is too large, scale down further
    if (targetHeight > maxHeight) {
      targetHeight = maxHeight;
      targetWidth = targetHeight * aspectRatio;
    }
  } else {
    // Image is taller than wide or square
    targetHeight = min(maxHeight, originalImg.height);
    targetWidth = targetHeight * aspectRatio;
    
    // If width is too large, scale down further
    if (targetWidth > maxWidth) {
      targetWidth = maxWidth;
      targetHeight = targetWidth / aspectRatio;
    }
  }
  
  // Create a copy of the original image and resize it
  img = originalImg.get();
  img.resize(floor(targetWidth), floor(targetHeight));
  
  // Determine voxel grid dimensions based on the resized image and voxel size
  cols = floor(img.width / voxelSize);
  rows = floor(img.height / voxelSize);
  
  // Ensure we have at least one row and column
  cols = max(1, cols);
  rows = max(1, rows);

  generateVoxels();
}

// Function to set up depth mode buttons and their event handlers
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
      if (voxels.length > 0) {
        undoStack.push([...voxels]);
        redoStack = []; // Clear redo stack
      }
      
      // Update active button styling
      document.querySelectorAll('.depthModeBtn').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Set the depth mode and regenerate voxels
      depthMode = mode;
      
      // Only regenerate if image is loaded
      if (img) {
        generateVoxels();
      }
      
      console.log(`Depth mode set to: ${mode}`);
    });
  });
}

// Function to generate the voxels with depth based on color
function generateVoxels() {
  voxels = []; // Reset the voxel array

  let reducePercentage = parseInt(reduceSlider.value); // Get reduction percentage
  let depthScale = parseInt(depthSlider.value); // Get depth scaling value

  // Calculate offsets to center the image in the canvas
  const xOffset = (width - img.width) / 2;
  const yOffset = (height - img.height) / 2;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Skip this position if it was deleted by the user
      const key = `${x},${y}`;
      if (editedVoxelsMap[key] === 'deleted') {
        continue;
      }
      
      // Skip based on random reduction
      if (random(100) < reducePercentage) {
        continue;
      }

      // Get color for this position - either from colorMap or original image
      let c;
      if (colorMap[key]) {
        // Use the custom color if it exists in the colorMap
        c = colorMap[key];
      } else {
        // Otherwise use the color from the image
        // Ensure we don't sample outside the image bounds
        const sampleX = constrain(x * voxelSize, 0, img.width - 1);
        const sampleY = constrain(y * voxelSize, 0, img.height - 1);
        c = img.get(sampleX, sampleY);
      }

      // Calculate depth value based on the selected depth mode
      let depthValue;
      
      switch (depthMode) {
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
          depthValue = (red(c) + green(c) + blue(c)) / 3;
          break;
      }

      // Conditionally invert the depth mapping based on the invertDepth variable
      let zDepth = invertDepth
        ? map(depthValue, 0, 255, -depthScale, depthScale)
        : map(depthValue, 0, 255, depthScale, -depthScale);

      // Position voxels based on actual grid position with natural centering
      // The voxels will be placed within the actual image dimensions without distortion
      voxels.push({ 
        x: x * voxelSize - (cols * voxelSize) / 2,
        y: y * voxelSize - (rows * voxelSize) / 2,
        z: zDepth,
        color: c
      });
    }
  }
  redraw(); // Redraw the scene with the new voxels
  updateUndoRedoButtonStates();
}

// Function to draw the voxels in 3D space
function draw() {
  background(0);

  // Loop through all the voxels and render them in 3D space
  for (let i = 0; i < voxels.length; i++) {
    let voxel = voxels[i];

    push();
    translate(voxel.x, voxel.y, voxel.z); // Position the voxel in 3D space
    
    // Highlight voxels with similar colors
    if (selectedVoxels.includes(voxel)) {
      stroke(255, 255, 0); // Yellow stroke for similar colored voxels
      strokeWeight(2);
    } else {
      noStroke();
    }

    fill(voxel.color); // Set the voxel color based on pixel color
    box(voxelSize); // Create the voxel (a cube)
    pop();
  }
}

function getVoxelAtClick(mouseX, mouseY) {
  // Convert mouse coordinates to voxel grid coordinates
  const localX = floor((mouseX + cols * voxelSize / 2) / voxelSize);
  const localY = floor((mouseY + rows * voxelSize / 2) / voxelSize);

  // Check if coordinates are within bounds
  if (localX < 0 || localX >= cols || localY < 0 || localY >= rows) {
    return null;
  }

  // Find any voxel that matches the x,y grid position
  for (let i = 0; i < voxels.length; i++) {
    const voxel = voxels[i];
    const voxelGridX = floor((voxel.x + cols * voxelSize / 2) / voxelSize);
    const voxelGridY = floor((voxel.y + rows * voxelSize / 2) / voxelSize);
    
    if (voxelGridX === localX && voxelGridY === localY) {
      return voxel;
    }
  }

  return null;
}

function calculateColorDistance(color1, color2) {
  const r1 = red(color1);
  const g1 = green(color1);
  const b1 = blue(color1);
  const r2 = red(color2);
  const g2 = green(color2);
  const b2 = blue(color2);
  
  return sqrt(
    (r1 - r2) * (r1 - r2) +
    (g1 - g2) * (g1 - g2) +
    (b1 - b2) * (b1 - b2)
  );
}

// Update the editedVoxelsMap and colorMap to reflect current voxels
function updateEditedVoxelsMap() {
  // Reset the maps
  editedVoxelsMap = {}; 
  colorMap = {};
  
  for (const voxel of voxels) {
    const gridX = floor((voxel.x + cols * voxelSize / 2) / voxelSize);
    const gridY = floor((voxel.y + rows * voxelSize / 2) / voxelSize);
    const key = `${gridX},${gridY}`;
    
    // Mark as active in edited map
    editedVoxelsMap[key] = 'active';
    
    // Store current color in color map
    colorMap[key] = voxel.color;
  }
}

// Handle keyboard events for deletion and undo functionality
function keyPressed() {
  // Delete selected voxels with Delete key or Left Arrow key
  if (key === 'Delete' || keyCode === LEFT_ARROW) {
    if (selectedVoxels.length > 0) {
      // Store current state in undo stack before modifying
      undoStack.push([...voxels]);
      redoStack = []; // Clear redo stack
      
      // Mark selected voxels as deleted in editedVoxelsMap
      for (const voxel of selectedVoxels) {
        const gridX = floor((voxel.x + cols * voxelSize / 2) / voxelSize);
        const gridY = floor((voxel.y + rows * voxelSize / 2) / voxelSize);
        const key = `${gridX},${gridY}`;
        editedVoxelsMap[key] = 'deleted';
      }
      
      // Remove selected voxels from the voxels array
      voxels = voxels.filter(voxel => !selectedVoxels.includes(voxel));
      
      // Clear the selection
      selectedVoxels = [];
      selectedColor = null;
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

// Function to perform undo operation
function performUndo() {
  if (undoStack.length > 0) {
    // Store current state in redo stack before undoing
    redoStack.push([...voxels]);
    
    // Restore the last state from undoStack
    voxels = undoStack.pop();
    
    // Reset the editedVoxelsMap to reflect current voxels
    updateEditedVoxelsMap();
    
    // Clear the selection
    selectedVoxels = [];
    selectedColor = null;
    updateSelectedColorDisplay(null);
    
    // Update the canvas
    redraw();
  }
  updateUndoRedoButtonStates();
}

// Function to perform redo operation
function performRedo() {
  if (redoStack.length > 0) {
    // Store current state in undo stack before redoing
    undoStack.push([...voxels]);
    
    // Restore the last state from redoStack
    voxels = redoStack.pop();
    
    // Reset the editedVoxelsMap to reflect current voxels
    updateEditedVoxelsMap();
    
    // Clear the selection
    selectedVoxels = [];
    selectedColor = null;
    updateSelectedColorDisplay(null);
    
    // Update the canvas
    redraw();
  }
  updateUndoRedoButtonStates();
}

// Function to update the states of undo and redo buttons
function updateUndoRedoButtonStates() {
  const undoButton = document.getElementById('undoButton');
  const redoButton = document.getElementById('redoButton');
  
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

// Function to recalculate the depth (z) values of voxels based on their current colors
function recalculateDepthsFromCurrentColors() {
  // Store current state in undo stack before modifying
  undoStack.push([...voxels]);
  redoStack = []; // Clear redo stack
  
  // Get current depth scale value
  const depthScale = parseInt(depthSlider.value);
  
  // Update depth for each voxel based on its current color
  for (const voxel of voxels) {
    // Extract the brightness (luminance) of the current color
    const c = voxel.color;
    const brightnessVal = (red(c) + green(c) + blue(c)) / 3;
    
    // Apply the same depth mapping logic as in generateVoxels
    voxel.z = invertDepth
      ? map(brightnessVal, 0, 255, -depthScale, depthScale)
      : map(brightnessVal, 0, 255, depthScale, -depthScale);
  }
  
  // Redraw the scene with the new depth values
  redraw();
  console.log('Recalculated depths based on current voxel colors');
}

// Function to revert to the original image
function revertToOriginalImage() {
  if (originalImg) {
    img = originalImg.get(); // Reset img to the original image
    updateImageAndVoxels(); // Update the image and regenerate voxels
    console.log('Reverted to original image');
  }
}

// Function to identify and remove the most common colored voxels (background)
function removeBackground() {
  // Check if there are voxels to process
  if (voxels.length === 0) {
    console.log('No voxels to process');
    return;
  }

  // Store current state in undo stack before modifying
  undoStack.push([...voxels]);
  redoStack = []; // Clear redo stack

  // Create a map to count voxel colors
  const colorCounts = {};
  
  // Count occurrences of each color (using r,g,b as key)
  for (const voxel of voxels) {
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
  const colorThreshold = parseInt(colorThresholdSlider.value);
  
  // Filter out voxels with the most common color (or within threshold)
  const filteredVoxels = voxels.filter(voxel => {
    // Calculate color distance to the most common color
    const distance = calculateColorDistance(voxel.color, mostCommonColor.color);
    // Keep voxel if the distance is greater than the threshold
    return distance > colorThreshold;
  });
  
  // Update editedVoxelsMap to mark removed voxels as deleted
  const removedCount = voxels.length - filteredVoxels.length;
  for (const voxel of voxels) {
    // Calculate color distance to the most common color
    const distance = calculateColorDistance(voxel.color, mostCommonColor.color);
    
    if (distance <= colorThreshold) {
      // This voxel will be removed, so mark it as deleted in the map
      const gridX = floor((voxel.x + cols * voxelSize / 2) / voxelSize);
      const gridY = floor((voxel.y + rows * voxelSize / 2) / voxelSize);
      const key = `${gridX},${gridY}`;
      editedVoxelsMap[key] = 'deleted';
    }
  }
  
  // Update voxels array
  voxels = filteredVoxels;
  
  console.log(`Removed ${removedCount} background voxels`);
  
  // Update the canvas
  redraw();
  updateUndoRedoButtonStates();
}
