let img;
let cols = 64; // Number of voxels in the x-direction
let rows = 64; // Number of voxels in the y-direction
let voxelSize = 20; // Size of each voxel (cube)
let voxels = []; // Array to store voxel positions and colors

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);  // Ensure WebGL mode is used for 3D
  noLoop(); // No need to continuously redraw

  // Set a fixed camera position
  camera(1000, -500, 1000, 0, 0, 0, 0, 1, 0);

  // Set the canvas to optimize readback performance
  const canvasElement = document.querySelector('canvas');
  canvasElement.willReadFrequently = true;

  // Allow mouse interaction to rotate the camera view
  orbitControl(); // Enables mouse interaction for orbiting around the scene

  noStroke(); // Disable outline around voxels (no stroke for cubes)

  document.getElementById('uploadButton').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      loadImage(URL.createObjectURL(file), (loadedImage) => {
        img = loadedImage;
        img.resize(cols * voxelSize, rows * voxelSize); // Resize the image to fit the voxel grid
        generateVoxels(); // Generate 3D voxels based on the image
      });
    }
  });
}

// Function to generate the voxels with depth based on color
function generateVoxels() {
  voxels = []; // Reset the voxel array

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let c = img.get(x * voxelSize, y * voxelSize); // Get pixel color at (x, y)

      // Extract the brightness (luminance) of the color using the red, green, blue channels
      let brightnessVal = (red(c) + green(c) + blue(c)) / 3;

      // Flip the depth mapping: darker pixels are further, and brighter pixels are closer
      let zDepth = map(brightnessVal, 0, 255, 100, -100); // Flip depth here

      // Add the voxel data (position, color, and z-depth) to the array
      voxels.push({ 
        x: x * voxelSize - cols * voxelSize / 2, // Center the grid
        y: y * voxelSize - rows * voxelSize / 2, 
        z: zDepth, // Depth based on brightness
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
    fill(voxel.color); // Set the voxel color based on pixel color
    box(voxelSize); // Create the voxel (a cube)
    pop();
  }
}