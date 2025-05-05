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

// Color palettes
const pastelPalette = ['#fddde6', '#d7c0f6', '#c5f4f0', '#ffe6c9', '#ffd1dc'];
const neonPalette = ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000'];
const earthPalette = ['#8B4513', '#556B2F', '#A0522D', '#CD853F', '#6E8B3D'];
const oceanPalette = ['#00008B', '#0000CD', '#4169E1', '#87CEEB', '#ADD8E6'];

// Function to apply a color palette to voxels
function applyColorPalette(palette) {
  // Store current state in undo stack before modifying
  undoStack.push([...voxels]);

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

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);  // Ensure WebGL mode is used for 3D
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
    updateImageAndVoxels(); // Call the function to update the image and generate voxels
    
  });

  // Create a random reduction slider
  reduceSlider = document.getElementById('reduceSlider');
  reduceSlider.addEventListener('input', () => {
    if (img) {
      generateVoxels(); // Regenerate voxels when slider value changes
    }
  });

  // Create a depth scaling slider
  depthSlider = document.getElementById('depthSlider');
  depthSlider.addEventListener('input', () => {
    if (img) {
      generateVoxels(); // Regenerate voxels when slider value changes
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
      selectedColor = clickedVoxel.color;
      console.log('Selected Color:', selectedColor);

      // Find all voxels with similar colors
      const colorThreshold = parseInt(colorThresholdSlider.value); // Get threshold value
      selectedVoxels = voxels.filter(voxel => 
        calculateColorDistance(voxel.color, selectedColor) <= colorThreshold
      );

      console.log(`Found ${selectedVoxels.length} similar colored voxels`);
      updateSelectedColorDisplay(selectedColor);
      redraw(); // Redraw the scene to reflect the selected voxels
    }
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

  // Reset color-related data structures for the new image
  colorMap = {};
  editedVoxelsMap = {};
  selectedColor = null;
  selectedVoxels = [];
  undoStack = [];
  
  // Update the selected color display
  updateSelectedColorDisplay(null);

  let aspectRatio = originalImg.width / originalImg.height;
  let targetWidth = cols * voxelSize;
  let targetHeight = targetWidth / aspectRatio;

  img = originalImg.get(); // get a copy of the original image
  img.resize(floor(targetWidth), floor(targetHeight));
  cols = floor(img.width / voxelSize);
  rows = floor(img.height / voxelSize);

  generateVoxels();
}

// Function to generate the voxels with depth based on color
function generateVoxels() {
  voxels = []; // Reset the voxel array

  let reducePercentage = parseInt(reduceSlider.value); // Get reduction percentage
  let depthScale = parseInt(depthSlider.value); // Get depth scaling value

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
        c = img.get(x * voxelSize, y * voxelSize);
      }

      // Extract the brightness (luminance) of the color using the red, green, blue channels
      let brightnessVal = (red(c) + green(c) + blue(c)) / 3;

      // Conditionally invert the depth mapping based on the invertDepth variable
      let zDepth = invertDepth
        ? map(brightnessVal, 0, 255, -depthScale, depthScale)
        : map(brightnessVal, 0, 255, depthScale, -depthScale);

      // Add the voxel data (position, color, and z-depth) to the array
      voxels.push({ 
        x: x * voxelSize - cols * voxelSize / 2, // Center the grid
        y: y * voxelSize - rows * voxelSize / 2, 
        z: zDepth, // Depth based on brightness and scaling
        color: c
      });
    }
  }
  redraw(); // Redraw the scene with the new voxels
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
    if (undoStack.length > 0) {
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
  }
}
