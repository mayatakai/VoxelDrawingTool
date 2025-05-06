/**
 * utils.js
 * Utility functions for color manipulation and general helpers
 */

/**
 * Calculate the Euclidean distance between two colors in RGB space
 * @param {Object} color1 - First p5.Color object
 * @param {Object} color2 - Second p5.Color object
 * @returns {number} - The color distance
 */
export function calculateColorDistance(color1, color2) {
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

/**
 * Calculate brightness value of a color
 * @param {Object} c - p5.Color object
 * @returns {number} - Brightness value between 0-255
 */
export function getBrightness(c) {
  return (red(c) + green(c) + blue(c)) / 3;
}

/**
 * Convert hex color string to p5.Color object
 * @param {string} hexColor - Hex color string (e.g., "#FF0000")
 * @returns {Object} - p5.Color object
 */
export function hexToColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return color(r, g, b);
}

/**
 * Update the selected color display in the HTML
 * @param {Object|null} color - p5.Color object or null to clear
 */
export function updateSelectedColorDisplay(color) {
  const colorDisplay = document.getElementById('selectedColorDisplay');
  if (color) {
    // Access color components using p5.js functions
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

/**
 * Update the states of undo and redo buttons
 * @param {Array} undoStack - Undo history stack
 * @param {Array} redoStack - Redo history stack
 */
export function updateUndoRedoButtonStates(undoStack, redoStack) {
  const undoButton = document.getElementById('undoButton');
  const redoButton = document.getElementById('redoButton');
  
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}