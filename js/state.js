/**
 * state.js
 * Central module for managing shared application state across modules
 */

// Image state
export let img = null;
export let originalImg = null;

// Grid configuration
export let cols = 64;
export let rows = 64;
export let voxelSize = 20;

// Voxel data
export let voxels = [];
export let editedVoxelsMap = {}; 
export let colorMap = {};

// UI elements
export let resolutionSlider = null;
export let reduceSlider = null;
export let depthSlider = null;
export let colorThresholdSlider = null;
export let canvasElement = null;

// History state
export let undoStack = [];
export let redoStack = [];

// Selection state
export let selectedColor = null;
export let selectedVoxel = null;
export let selectedVoxels = [];
export let invertDepth = false;
export let depthMode = 'brightness';

// Color palettes
export const pastelPalette = ['#fddde6', '#d7c0f6', '#c5f4f0', '#ffe6c9', '#ffd1dc'];
export const neonPalette = ['#ff00ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000'];
export const earthPalette = ['#8B4513', '#556B2F', '#A0522D', '#CD853F', '#6E8B3D'];
export const oceanPalette = ['#00008B', '#0000CD', '#4169E1', '#87CEEB', '#ADD8E6'];

// Color themes for the palette buttons
export const colorThemes = [
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

// Helper functions to update shared state
export function setImg(newImg) {
  img = newImg;
}

export function setOriginalImg(newOriginalImg) {
  originalImg = newOriginalImg;
}

export function setCols(newCols) {
  cols = newCols;
}

export function setRows(newRows) {
  rows = newRows;
}

export function setVoxelSize(newVoxelSize) {
  voxelSize = newVoxelSize;
}

export function setVoxels(newVoxels) {
  voxels = newVoxels;
}

export function setEditedVoxelsMap(newMap) {
  editedVoxelsMap = newMap;
}

export function setColorMap(newColorMap) {
  colorMap = newColorMap;
}

export function setSelectedColor(newColor) {
  selectedColor = newColor;
}

export function setSelectedVoxel(newVoxel) {
  selectedVoxel = newVoxel;
}

export function setSelectedVoxels(newVoxels) {
  selectedVoxels = newVoxels;
}

export function setInvertDepth(newInvertDepth) {
  invertDepth = newInvertDepth;
}

export function setDepthMode(newDepthMode) {
  depthMode = newDepthMode;
}

export function updateUndoStack(voxelsState) {
  undoStack.push(voxelsState);
}

export function updateRedoStack(voxelsState) {
  redoStack.push(voxelsState);
}

export function clearRedoStack() {
  redoStack = [];
}

export function clearUndoStack() {
  undoStack = [];
}

export function resetUndoRedoStacks() {
  undoStack = [];
  redoStack = [];
}

export function addUIReference(element, name) {
  switch(name) {
    case 'resolutionSlider':
      resolutionSlider = element;
      break;
    case 'reduceSlider':
      reduceSlider = element;
      break;
    case 'depthSlider':
      depthSlider = element;
      break;
    case 'colorThresholdSlider':
      colorThresholdSlider = element;
      break;
    case 'canvasElement':
      canvasElement = element;
      break;
  }
}

// Global tracking variables
export let lastUpdateSource = null;
export function setLastUpdateSource(source) {
  lastUpdateSource = source;
}