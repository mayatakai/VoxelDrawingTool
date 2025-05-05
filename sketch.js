let img;
let originalImg; // Store the original image for resizingi  
let cols = 64; // Number of voxels in the x-direction
let rows = 64; // Number of voxels in the y-direction
let voxelSize = 20; // Size of each voxel (cube)
let voxels = []; // Array to store voxel positions and colors
let editedVoxelsMap = {}; // Map to track which grid positions have been edited (deleted)
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
}

// Update the selected color display in the HTML
function updateSelectedColorDisplay(color) {
  const colorDisplay = document.getElementById('selectedColorDisplay');
  if (color) {
    const [r, g, b, a] = color;
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

      let c = img.get(x * voxelSize, y * voxelSize); // Get pixel color at (x, y)

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

// Update the editedVoxelsMap to reflect current voxels
function updateEditedVoxelsMap() {
  editedVoxelsMap = {}; // Reset the map
  for (const voxel of voxels) {
    const gridX = floor((voxel.x + cols * voxelSize / 2) / voxelSize);
    const gridY = floor((voxel.y + rows * voxelSize / 2) / voxelSize);
    const key = `${gridX},${gridY}`;
    editedVoxelsMap[key] = 'active';
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
