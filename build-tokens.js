#!/usr/bin/env node

/**
 * Build script to convert Figma tokens JSON to CSS custom properties and TypeScript types
 * Run with: node build-tokens.js
 */

const fs = require('fs');
const path = require('path');

// Read the Figma tokens JSON
const tokensFile = path.join(__dirname, 'figma-tokens.json');
const tokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));

// Helper function to flatten nested objects
function flattenTokens(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}-${key}` : key;
    
    if (value && typeof value === 'object' && value.value) {
      // This is a token with a value
      flattened[newKey] = value.value;
    } else if (value && typeof value === 'object' && !value.value) {
      // This is a nested group, recurse
      Object.assign(flattened, flattenTokens(value, newKey));
    }
  }
  
  return flattened;
}

// Generate CSS custom properties
function generateCSS() {
  const flattened = flattenTokens(tokens);
  
  let css = `/* PIP AI Design Tokens - Auto-generated from Figma */\n/* Do not edit directly - update figma-tokens.json instead */\n\n:root {\n`;
  
  for (const [key, value] of Object.entries(flattened)) {
    css += `  --pip-${key}: ${value};\n`;
  }
  
  css += `}\n`;
  
  return css;
}

// Generate TypeScript types and constants
function generateTypeScript() {
  const flattened = flattenTokens(tokens);
  
  let ts = `/* PIP AI Design Tokens - Auto-generated from Figma */\n/* Do not edit directly - update figma-tokens.json instead */\n\n`;
  
  // Generate type definitions
  ts += `export interface DesignTokens {\n`;
  for (const key of Object.keys(flattened)) {
    ts += `  '${key}': string;\n`;
  }
  ts += `}\n\n`;
  
  // Generate token constants
  ts += `export const tokens: DesignTokens = {\n`;
  for (const [key, value] of Object.entries(flattened)) {
    ts += `  '${key}': '${value}',\n`;
  }
  ts += `} as const;\n\n`;
  
  // Generate CSS variable getters
  ts += `export const cssVars = {\n`;
  for (const key of Object.keys(flattened)) {
    ts += `  '${key}': 'var(--pip-${key})',\n`;
  }
  ts += `} as const;\n\n`;
  
  // Generate individual token exports for convenience
  const categories = ['color', 'fontSize', 'spacing', 'borderRadius', 'boxShadow'];
  
  for (const category of categories) {
    const categoryTokens = Object.entries(flattened).filter(([key]) => key.startsWith(category));
    if (categoryTokens.length > 0) {
      ts += `export const ${category} = {\n`;
      for (const [key, value] of categoryTokens) {
        const shortKey = key.replace(`${category}-`, '');
        ts += `  '${shortKey}': '${value}',\n`;
      }
      ts += `} as const;\n\n`;
    }
  }
  
  return ts;
}

// Generate Tailwind CSS config
function generateTailwindConfig() {
  const flattened = flattenTokens(tokens);
  
  const config = {
    theme: {
      extend: {
        colors: {},
        fontSize: {},
        spacing: {},
        borderRadius: {},
        boxShadow: {},
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace']
        }
      }
    }
  };
  
  // Process colors
  for (const [key, value] of Object.entries(flattened)) {
    if (key.startsWith('color-')) {
      const colorKey = key.replace('color-', '');
      const parts = colorKey.split('-');
      
      if (parts.length === 2) {
        const [category, shade] = parts;
        if (!config.theme.extend.colors[category]) {
          config.theme.extend.colors[category] = {};
        }
        config.theme.extend.colors[category][shade] = value;
      }
    } else if (key.startsWith('fontSize-')) {
      const sizeKey = key.replace('fontSize-', '').replace('-', '.');
      config.theme.extend.fontSize[sizeKey] = value;
    } else if (key.startsWith('spacing-')) {
      const spaceKey = key.replace('spacing-', '');
      config.theme.extend.spacing[spaceKey] = value;
    } else if (key.startsWith('borderRadius-')) {
      const radiusKey = key.replace('borderRadius-', '');
      config.theme.extend.borderRadius[radiusKey] = value;
    } else if (key.startsWith('boxShadow-')) {
      const shadowKey = key.replace('boxShadow-', '');
      config.theme.extend.boxShadow[shadowKey] = value;
    }
  }
  
  return `/* PIP AI Design Tokens - Tailwind Config */\n/* Auto-generated from Figma tokens */\n\nmodule.exports = ${JSON.stringify(config, null, 2)};\n`;
}

// Write generated files
const outputDir = path.join(__dirname, 'packages', 'ui', 'src');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write CSS file
fs.writeFileSync(
  path.join(outputDir, 'design-tokens.css'),
  generateCSS()
);

// Write TypeScript file
fs.writeFileSync(
  path.join(outputDir, 'design-tokens.ts'),
  generateTypeScript()
);

// Write Tailwind config
fs.writeFileSync(
  path.join(__dirname, 'tailwind-tokens.config.js'),
  generateTailwindConfig()
);

console.log('✅ Design tokens generated successfully!');
console.log('📁 Generated files:');
console.log('   - packages/ui/src/design-tokens.css');
console.log('   - packages/ui/src/design-tokens.ts');
console.log('   - tailwind-tokens.config.js');
console.log('');
console.log('💡 To use in your project:');
console.log('   - Import CSS: @import "./design-tokens.css"');
console.log('   - Import TS: import { tokens, cssVars } from "./design-tokens"');
console.log('   - Extend Tailwind: extend your tailwind.config.js with tailwind-tokens.config.js');
