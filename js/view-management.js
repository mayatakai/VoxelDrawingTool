/**
 * view-management.js
 * Handles saving, loading, and exporting camera views
 */

import * as camera from './camera.js';

// Track active dialog to ensure only one is open at a time
let activeDialog = null;

/**
 * Initialize view management UI components and event listeners
 */
export function setupViewManagement() {
  // Save View button
  const saveViewButton = document.getElementById('saveViewButton');
  saveViewButton.addEventListener('click', showSaveViewDialog);
  
  // Load View button
  const loadViewButton = document.getElementById('loadViewButton');
  loadViewButton.addEventListener('click', showLoadViewDialog);
  
  // Export Image button
  const exportImageButton = document.getElementById('exportImageButton');
  exportImageButton.addEventListener('click', showExportDialog);
  
  // Dialog cancel buttons
  document.getElementById('saveViewCancelButton').addEventListener('click', closeAllDialogs);
  document.getElementById('loadViewCancelButton').addEventListener('click', closeAllDialogs);
  document.getElementById('exportCancelButton').addEventListener('click', closeAllDialogs);
  
  // Dialog confirm buttons
  document.getElementById('saveViewConfirmButton').addEventListener('click', handleSaveView);
  document.getElementById('exportConfirmButton').addEventListener('click', handleExportImage);
  
  // Import view from file
  document.getElementById('importViewButton').addEventListener('click', () => {
    document.getElementById('importViewInput').click();
  });
  
  document.getElementById('importViewInput').addEventListener('change', handleImportView);
}

/**
 * Show the save view dialog
 */
function showSaveViewDialog() {
  closeAllDialogs();
  activeDialog = document.getElementById('saveViewDialog');
  activeDialog.style.display = 'flex';
  document.getElementById('viewNameInput').value = `View-${Date.now()}`;
  document.getElementById('viewNameInput').focus();
}

/**
 * Show the load view dialog
 */
function showLoadViewDialog() {
  closeAllDialogs();
  activeDialog = document.getElementById('loadViewDialog');
  activeDialog.style.display = 'flex';
  
  // Refresh the list of saved views
  updateSavedViewsList();
}

/**
 * Show the export image dialog
 */
function showExportDialog() {
  closeAllDialogs();
  activeDialog = document.getElementById('exportDialog');
  activeDialog.style.display = 'flex';
}

/**
 * Close all open dialogs
 */
function closeAllDialogs() {
  const dialogs = document.querySelectorAll('.modal-dialog');
  dialogs.forEach(dialog => {
    dialog.style.display = 'none';
  });
  activeDialog = null;
}

/**
 * Handle saving the current view
 */
function handleSaveView() {
  const viewName = document.getElementById('viewNameInput').value.trim();
  if (!viewName) {
    alert('Please enter a name for the view');
    return;
  }
  
  // Save the view with the provided name
  const savedView = camera.saveView(viewName);
  
  console.log('View saved:', savedView);
  closeAllDialogs();
}

/**
 * Update the list of saved views in the load dialog
 */
function updateSavedViewsList() {
  const savedViewsList = document.getElementById('savedViewsList');
  const views = camera.getSavedViews();
  
  // Clear existing list
  savedViewsList.innerHTML = '';
  
  if (views.length === 0) {
    savedViewsList.innerHTML = '<p class="no-saved-views">No saved views</p>';
    return;
  }
  
  // Create a list item for each saved view
  views.forEach(view => {
    const viewItem = document.createElement('div');
    viewItem.className = 'saved-view-item';
    
    const viewName = document.createElement('div');
    viewName.className = 'saved-view-name';
    viewName.textContent = view.name;
    
    const viewActions = document.createElement('div');
    viewActions.className = 'saved-view-actions';
    
    // Load button
    const loadButton = document.createElement('button');
    loadButton.innerHTML = '📥';
    loadButton.title = 'Load this view';
    loadButton.addEventListener('click', () => {
      camera.loadView(view.name);
      closeAllDialogs();
    });
    
    // Export JSON button
    const exportButton = document.createElement('button');
    exportButton.innerHTML = '📋';
    exportButton.title = 'Export as JSON';
    exportButton.addEventListener('click', () => {
      exportViewAsJSON(view);
    });
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '🗑️';
    deleteButton.title = 'Delete this view';
    deleteButton.addEventListener('click', () => {
      if (confirm(`Delete view "${view.name}"?`)) {
        camera.deleteView(view.name);
        updateSavedViewsList();
      }
    });
    
    // Add buttons to actions container
    viewActions.appendChild(loadButton);
    viewActions.appendChild(exportButton);
    viewActions.appendChild(deleteButton);
    
    // Add elements to the view item
    viewItem.appendChild(viewName);
    viewItem.appendChild(viewActions);
    
    // Add the view item to the list
    savedViewsList.appendChild(viewItem);
  });
}

/**
 * Handle importing a view from a JSON file
 * @param {Event} event - File input change event
 */
function handleImportView(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const viewData = JSON.parse(e.target.result);
      const success = camera.loadViewFromJSON(viewData);
      
      if (success) {
        // Also save this view for future use
        camera.saveView(viewData.name || `Imported-${Date.now()}`);
        closeAllDialogs();
      } else {
        alert('Invalid view data format');
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      alert('Error parsing view data');
    }
  };
  
  reader.readAsText(file);
  
  // Reset the file input
  event.target.value = '';
}

/**
 * Export a view as JSON file
 * @param {Object} view - The view data to export
 */
function exportViewAsJSON(view) {
  const dataStr = JSON.stringify(view, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  // Create a download link for the JSON file
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(dataBlob);
  downloadLink.download = `${view.name || 'view'}.json`;
  downloadLink.style.display = 'none';
  
  // Add to document, click, and remove
  document.body.appendChild(downloadLink);
  downloadLink.click();
  setTimeout(() => {
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadLink.href);
  }, 100);
}

/**
 * Handle exporting the current view as an image
 */
function handleExportImage() {
  const format = document.getElementById('exportFormatSelect').value;
  
  // Create a filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `voxel-view-${timestamp}`;
  
  // Use p5.js to save the canvas
  // p5.js has built-in functions for saving the canvas as an image
  if (typeof saveCanvas === 'function') {
    saveCanvas(filename, format);
    closeAllDialogs();
  } else {
    console.error('saveCanvas function not available');
    alert('Error: Unable to export image. Make sure p5.js is properly loaded.');
  }
}

/**
 * Export the current camera view state to JSON for download
 */
export function exportCurrentView() {
  const currentView = camera.saveViewToJSON();
  exportViewAsJSON(currentView);
}