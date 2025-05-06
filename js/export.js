// Export to OBJ
function exportToOBJ() {
    let objLines = [];
    let vertexOffset = 1;
  
    for (const voxel of voxels) {
      const x = voxel.x;
      const y = voxel.y;
      const z = voxel.z;
      const s = voxelSize / 2;
  
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


  // Export to PLY
  function exportToPLY() {
    let plyHeader = [];
    let plyBody = [];
  
    const vertexCount = voxels.length * 8;
    const faceCount = voxels.length * 6;
    let vertexIndex = 0;
  
    // PLY Header
    plyHeader.push("ply");
    plyHeader.push("format ascii 1.0");
    plyHeader.push(`element vertex ${vertexCount}`);
    plyHeader.push("property float x");
    plyHeader.push("property float y");
    plyHeader.push("property float z");
    plyHeader.push("property uchar red");
    plyHeader.push("property uchar green");
    plyHeader.push("property uchar blue");
    plyHeader.push(`element face ${faceCount}`);
    plyHeader.push("property list uchar int vertex_indices");
    plyHeader.push("end_header");
  
    // Generate vertex and face data
    for (const voxel of voxels) {
      const { x, y, z, color } = voxel;
      const s = voxelSize / 2;
  
      const r = Math.round(red(color));
      const g = Math.round(green(color));
      const b = Math.round(blue(color));
  
      // 8 vertices per voxel
      const verts = [
        [x - s, y - s, z - s],
        [x + s, y - s, z - s],
        [x + s, y + s, z - s],
        [x - s, y + s, z - s],
        [x - s, y - s, z + s],
        [x + s, y - s, z + s],
        [x + s, y + s, z + s],
        [x - s, y + s, z + s]
      ];
  
      verts.forEach(v => {
        plyBody.push(`${v[0]} ${v[1]} ${v[2]} ${r} ${g} ${b}`);
      });
  
      // 6 faces, using vertex indices
      const faceIndices = [
        [0, 1, 2, 3], // Bottom
        [4, 5, 6, 7], // Top
        [0, 1, 5, 4], // Front
        [1, 2, 6, 5], // Right
        [2, 3, 7, 6], // Back
        [3, 0, 4, 7], // Left
      ];
  
      faceIndices.forEach(f => {
        const adjusted = f.map(i => i + vertexIndex);
        plyBody.push(`4 ${adjusted.join(' ')}`);
      });
  
      vertexIndex += 8;
    }
  
    // Combine header and body
    const plyContent = plyHeader.concat(plyBody).join('\n');
    const blob = new Blob([plyContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voxel_art.ply';
    a.click();
  
    URL.revokeObjectURL(url);
  }