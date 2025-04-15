let voxelSize = 40;
let grid = [];
let angle = 0;
let sceneStarted = false;  // Flag to check if the demoscene has started

let rSlider, gSlider, bSlider;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();

  // Sliders to control color intensity
  rSlider = createSlider(0, 255, 255);
  gSlider = createSlider(0, 255, 255);
  bSlider = createSlider(0, 255, 255);

  rSlider.position(20, 20);
  gSlider.position(20, 50);
  bSlider.position(20, 80);

  rSlider.style('width', '200px');
  gSlider.style('width', '200px');
  bSlider.style('width', '200px');

  // Create voxel grid with individual base colors
  let cols = 5;
  let rows = 5;
  let layers = 5;

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      for (let z = 0; z < layers; z++) {
        if (random() > 0.5) {
          grid.push({
            x: x * voxelSize,
            y: y * voxelSize,
            z: z * voxelSize,
            baseColor: {
              r: random(100, 255),
              g: random(100, 255),
              b: random(100, 255)
            }
          });
        }
      }
    }
  }
}

function draw() {
  background(30);

  // Always enable orbitControl so that the scene can be rotated by mouse
  orbitControl();

  // If scene hasn't started, draw the original voxel grid
  if (!sceneStarted) {
    // Display static voxel grid
    let rMod = rSlider.value() / 255;
    let gMod = gSlider.value() / 255;
    let bMod = bSlider.value() / 255;

    for (let v of grid) {
      push();
      translate(v.x, v.y, v.z);

      // Modify color based on sliders
      let r = v.baseColor.r * rMod;
      let g = v.baseColor.g * gMod;
      let b = v.baseColor.b * bMod;

      fill(r, g, b);
      box(voxelSize);
      pop();
    }
  } 
  // If scene has started, display the animated demoscene
  else {
    // Add dynamic lighting for some depth and realism
    pointLight(255, 255, 255, mouseX, mouseY, 200); // White light at mouse position
    
    // Add some rotation effects for the grid
    rotateX(PI / 6 + sin(angle) * 0.2);
    rotateY(PI / 4 + cos(angle) * 0.2);
    
    angle += 0.01;

    let rMod = rSlider.value() / 255;
    let gMod = gSlider.value() / 255;
    let bMod = bSlider.value() / 255;

    for (let v of grid) {
      push();
      translate(v.x, v.y, v.z);

      let r = v.baseColor.r * rMod;
      let g = v.baseColor.g * gMod;
      let b = v.baseColor.b * bMod;

      fill(r, g, b);

      // Adding some basic animation to the voxel grid
      let scaleAmount = sin(angle + v.x * 0.5) * 0.5 + 1; // Animate scaling based on voxel position

      // Apply scaling animation
      scale(scaleAmount);

      // Draw the voxel
      box(voxelSize);
      pop();
    }
  }
}

// Key pressed event to start or stop the demoscene based on "D" and "C"
function keyPressed() {
  if (key === 'D' || key === 'd') {
    sceneStarted = true;  // Start the demoscene when "D" is pressed
  }

  if (key === 'C' || key === 'c') {
    sceneStarted = false;  // Stop the demoscene and go back to the original grid when "C" is pressed
  }
}