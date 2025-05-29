const fs = require('fs');
const path = require('path');

console.log('Testing PostCSS configuration...');

try {
  const postcssConfig = require('./postcss.config.cjs');
  console.log('PostCSS config loaded successfully:', postcssConfig);
  
  // Test if the plugins are accessible
  if (Array.isArray(postcssConfig.plugins)) {
    console.log('Using array format for plugins');
    postcssConfig.plugins.forEach((plugin, index) => {
      console.log(`Plugin ${index}:`, typeof plugin);
    });
  } else {
    console.log('Using object format for plugins');
    console.log('Plugin keys:', Object.keys(postcssConfig.plugins));
  }
} catch (error) {
  console.error('Error loading PostCSS config:', error.message);
}
