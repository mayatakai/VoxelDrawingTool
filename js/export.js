/**
 * export.js
 * Handles exporting voxel models to different 3D formats
 */

// Import the state to access voxels and voxelSize
import * as state from './state.js';

// Export to OBJ
export function exportToOBJ() {
    let objLines = [];
    let vertexOffset = 1;
  
    for (const voxel of state.voxels) {
      const x = voxel.x;
      const y = voxel.y;
      const z = voxel.z;
      const s = state.voxelSize / 2;
  
      // Define 8 vertices of the cube
      const vertices = [
        [x - s, y - s, z - s],
        [x + s, y - s, z - s],
        [x + s, y + s, z - s],
        [x - s, y + s, z - s],
        [x - s, y - s, z + s],
        [x + s, y - s, z + s],
        [x + s, y + s, z + s],
        [x - s, y + s, z + s],
      ];
  
      // Add vertices to obj lines
      for (const v of vertices) {
        objLines.push(`v ${v[0]} ${v[1]} ${v[2]}`);
      }
  
      // Define cube faces (each face uses 4 vertices)
      const faces = [
        [0, 1, 2, 3], // Bottom
        [4, 5, 6, 7], // Top
        [0, 1, 5, 4], // Front
        [1, 2, 6, 5], // Right
        [2, 3, 7, 6], // Back
        [3, 0, 4, 7], // Left
      ];
  
      for (const face of faces) {
        const indices = face.map(i => i + vertexOffset);
        objLines.push(`f ${indices[0]} ${indices[1]} ${indices[2]} ${indices[3]}`);
      }
  
      vertexOffset += 8;
    }
  
    // Convert to Blob and trigger download
    const objContent = objLines.join('\n');
    const blob = new Blob([objContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voxel_art.obj';
    a.click();
    
    URL.revokeObjectURL(url);
}

// Export to OBJ with MTL
export function exportToOBJWithMTL() {
    console.log("Starting OBJ+MTL export...");
    
    if (state.voxels.length === 0) {
        console.error("Error: No voxels to export!");
        alert("No voxels to export. Please create some voxels first.");
        return;
    }

    try {
        const objLines = [];
        const mtlLines = [];
        const filename = 'voxel_art';
        const mtlFilename = `${filename}.mtl`;
        
        // Add MTL reference to OBJ file
        objLines.push(`mtllib ${mtlFilename}`);
        
        // Track unique colors to create materials
        const uniqueColors = {};
        const materialNames = {};
        let materialIndex = 0;
        
        // First pass: collect all unique colors and create materials
        console.log("Collecting unique colors for materials...");
        state.voxels.forEach(voxel => {
            const { color } = voxel;
            
            // Extract RGB values safely
            let r, g, b;
            let colorKey;
            
            if (typeof color === 'string') {
                // Handle hex color strings
                if (color.startsWith('#')) {
                    r = parseInt(color.slice(1, 3), 16);
                    g = parseInt(color.slice(3, 5), 16);
                    b = parseInt(color.slice(5, 7), 16);
                    colorKey = `${r}_${g}_${b}`;
                } else if (color.startsWith('rgb')) {
                    // Handle rgb() format
                    const rgbValues = color.match(/\d+/g);
                    if (rgbValues && rgbValues.length >= 3) {
                        r = parseInt(rgbValues[0]);
                        g = parseInt(rgbValues[1]);
                        b = parseInt(rgbValues[2]);
                        colorKey = `${r}_${g}_${b}`;
                    }
                }
            } else if (color && typeof color === 'object') {
                // Handle p5.js color objects
                if (color.levels && Array.isArray(color.levels)) {
                    // p5.js stores color components in the levels array [r,g,b,a]
                    r = color.levels[0];
                    g = color.levels[1];
                    b = color.levels[2];
                    colorKey = `${r}_${g}_${b}`;
                } else {
                    // Try various methods to extract color
                    try {
                        // Use p5.js functions if available in this context
                        r = window.red ? window.red(color) : (color._array ? color._array[0] * 255 : 200);
                        g = window.green ? window.green(color) : (color._array ? color._array[1] * 255 : 200);
                        b = window.blue ? window.blue(color) : (color._array ? color._array[2] * 255 : 200);
                        r = Math.round(r);
                        g = Math.round(g);
                        b = Math.round(b);
                        colorKey = `${r}_${g}_${b}`;
                    } catch (e) {
                        console.error("Error extracting color:", e);
                        r = 200; g = 200; b = 200;
                        colorKey = "200_200_200";
                    }
                }
            } else {
                // Default color if extraction fails
                r = 200; g = 200; b = 200;
                colorKey = "200_200_200";
            }
            
            // Ensure valid RGB values
            r = Math.min(255, Math.max(0, Math.round(r || 0)));
            g = Math.min(255, Math.max(0, Math.round(g || 0)));
            b = Math.min(255, Math.max(0, Math.round(b || 0)));
            
            // Create a material for this color if it doesn't exist
            if (!uniqueColors[colorKey]) {
                const matName = `material_${materialIndex++}`;
                uniqueColors[colorKey] = { r, g, b, matName };
                materialNames[colorKey] = matName;
                
                // Add material definition to MTL file
                mtlLines.push(`newmtl ${matName}`);
                mtlLines.push(`Ka 0.2 0.2 0.2`); // Ambient color
                mtlLines.push(`Kd ${(r/255).toFixed(6)} ${(g/255).toFixed(6)} ${(b/255).toFixed(6)}`); // Diffuse color
                mtlLines.push(`Ks 0.1 0.1 0.1`); // Specular color
                mtlLines.push(`Ns 10.0`); // Specular exponent
                mtlLines.push(`illum 2`); // Illumination model
                mtlLines.push(``); // Empty line between materials
            }
        });
        
        console.log(`Created ${materialIndex} unique materials`);
        
        // Create OBJ file content with geometry and material assignments
        let vertexOffset = 1; // OBJ indices start at 1
        
        // Process each voxel
        for (const voxel of state.voxels) {
            const { x, y, z, color } = voxel;
            const s = state.voxelSize / 2;
            
            // Extract RGB values to find the material
            let r, g, b;
            let colorKey;
            
            if (typeof color === 'string') {
                if (color.startsWith('#')) {
                    r = parseInt(color.slice(1, 3), 16);
                    g = parseInt(color.slice(3, 5), 16);
                    b = parseInt(color.slice(5, 7), 16);
                } else if (color.startsWith('rgb')) {
                    const rgbValues = color.match(/\d+/g);
                    if (rgbValues && rgbValues.length >= 3) {
                        r = parseInt(rgbValues[0]);
                        g = parseInt(rgbValues[1]);
                        b = parseInt(rgbValues[2]);
                    }
                }
            } else if (color && typeof color === 'object') {
                if (color.levels && Array.isArray(color.levels)) {
                    r = color.levels[0];
                    g = color.levels[1];
                    b = color.levels[2];
                } else {
                    try {
                        r = window.red ? window.red(color) : (color._array ? color._array[0] * 255 : 200);
                        g = window.green ? window.green(color) : (color._array ? color._array[1] * 255 : 200);
                        b = window.blue ? window.blue(color) : (color._array ? color._array[2] * 255 : 200);
                        r = Math.round(r);
                        g = Math.round(g);
                        b = Math.round(b);
                    } catch (e) {
                        r = 200; g = 200; b = 200;
                    }
                }
            } else {
                r = 200; g = 200; b = 200;
            }
            
            r = Math.min(255, Math.max(0, Math.round(r || 0)));
            g = Math.min(255, Math.max(0, Math.round(g || 0)));
            b = Math.min(255, Math.max(0, Math.round(b || 0)));
            colorKey = `${r}_${g}_${b}`;
            
            // Define 8 vertices of the cube
            const vertices = [
                [x - s, y - s, z - s],  // 0: front bottom left
                [x + s, y - s, z - s],  // 1: front bottom right
                [x + s, y + s, z - s],  // 2: front top right
                [x - s, y + s, z - s],  // 3: front top left
                [x - s, y - s, z + s],  // 4: back bottom left
                [x + s, y - s, z + s],  // 5: back bottom right
                [x + s, y + s, z + s],  // 6: back top right
                [x - s, y + s, z + s]   // 7: back top left
            ];
            
            // Add material definition for this cube
            objLines.push(`usemtl ${materialNames[colorKey]}`);
            
            // Add vertices to OBJ
            for (const v of vertices) {
                objLines.push(`v ${v[0].toFixed(6)} ${v[1].toFixed(6)} ${v[2].toFixed(6)}`);
            }
            
            // Define triangular faces (12 triangles, 6 faces)
            // Each face needs to be triangulated
            const triangles = [
                // Front face (-z)
                [0, 1, 2], [0, 2, 3],
                // Back face (+z)
                [5, 4, 7], [5, 7, 6],
                // Left face (-x)
                [4, 0, 3], [4, 3, 7],
                // Right face (+x)
                [1, 5, 6], [1, 6, 2],
                // Bottom face (-y)
                [0, 4, 5], [0, 5, 1],
                // Top face (+y)
                [3, 2, 6], [3, 6, 7]
            ];
            
            // Add faces to OBJ
            for (const triangle of triangles) {
                const indices = triangle.map(i => i + vertexOffset);
                objLines.push(`f ${indices[0]} ${indices[1]} ${indices[2]}`);
            }
            
            vertexOffset += 8; // Move to next 8 vertices for next voxel
        }
        
        // Convert to Blob and trigger download for OBJ
        const objContent = objLines.join('\n');
        const objBlob = new Blob([objContent], { type: 'text/plain' });
        const objUrl = URL.createObjectURL(objBlob);
        
        const objLink = document.createElement('a');
        objLink.href = objUrl;
        objLink.download = `${filename}.obj`;
        objLink.style.display = 'none';
        document.body.appendChild(objLink);
        objLink.click();
        document.body.removeChild(objLink);
        URL.revokeObjectURL(objUrl);
        
        // Convert to Blob and trigger download for MTL
        const mtlContent = mtlLines.join('\n');
        const mtlBlob = new Blob([mtlContent], { type: 'text/plain' });
        const mtlUrl = URL.createObjectURL(mtlBlob);
        
        const mtlLink = document.createElement('a');
        mtlLink.href = mtlUrl;
        mtlLink.download = mtlFilename;
        mtlLink.style.display = 'none';
        document.body.appendChild(mtlLink);
        mtlLink.click();
        document.body.removeChild(mtlLink);
        URL.revokeObjectURL(mtlUrl);
        
        console.log("OBJ+MTL export completed successfully!");
        alert(`Export complete! Downloaded:\n- ${filename}.obj\n- ${mtlFilename}\n\nThese files work together - keep them in the same folder when importing to Rhino.`);
    } catch (error) {
        console.error("Error exporting to OBJ+MTL:", error);
        alert("Error exporting to OBJ+MTL: " + error.message);
    }
}

// Expose functions to global scope for the button click handlers
window.exportToOBJ = exportToOBJ;
window.exportToOBJWithMTL = exportToOBJWithMTL;