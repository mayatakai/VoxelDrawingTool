let img;
let originalImg; // Store the original image for resizingi  
let cols = 64; // Number of voxels in the x-direction
let rows = 64; // Number of voxels in the y-direction
let voxelSize = 20; // Size of each voxel (cube)
let voxels = []; // Array to store voxel positions and colors
let resolutionSlider; // Slider for adjusting resolution
let reduceSlider; // Slider for random voxel reduction percentage
let depthSlider; // Slider for depth scaling
let invertDepth = false; // Boolean to track depth inversion
let selectedColor = null; // Variable to store the selected voxel color
let selectedVoxel = null; // Variable to store the selected voxel for highlighting
let canvasElement; // Reference to the canvas element

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

    const voxel = getVoxelAtClick(mouseX, mouseY);
    if (voxel) {
      selectedColor = voxel.color;
      selectedVoxel = voxel;
      console.log('Selected Voxel Color:', selectedColor);
      updateSelectedColorDisplay(selectedColor);
      redraw(); // Redraw the scene to reflect the selected voxel
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
      if (random(100) < reducePercentage) {
        continue; // Skip this voxel based on reduction percentage
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
    
    if (selectedVoxel &&
      voxel.x === selectedVoxel.x &&
      voxel.y === selectedVoxel.y &&
      voxel.z === selectedVoxel.z) {
    stroke(255, 255, 0);
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

  const localX = floor((mouseX + cols * voxelSize / 2) / voxelSize);
  const localY = floor((mouseY + rows * voxelSize / 2) / voxelSize);


  if (localX < 0 || localX >= cols || localY < 0 || localY >= rows) {
    return null;
  }


  const index = localY * cols + localX;
  if (index >= 0 && index < voxels.length) {
    return voxels[index];
  }

  return null;
}
