# PIP AI Design System

## Overview
This document defines the design system for PIP AI, including color tokens, typography, spacing, and component specifications for the Upload Dock and other UI elements.

## Design Tokens

### Color Palette

#### Primary Colors
```css
/* Brand Colors */
--pip-primary-50: #f0f9ff;
--pip-primary-100: #e0f2fe;
--pip-primary-200: #bae6fd;
--pip-primary-300: #7dd3fc;
--pip-primary-400: #38bdf8;
--pip-primary-500: #0ea5e9;  /* Primary Brand */
--pip-primary-600: #0284c7;
--pip-primary-700: #0369a1;
--pip-primary-800: #075985;
--pip-primary-900: #0c4a6e;
--pip-primary-950: #082f49;
```

#### Neutral Colors
```css
/* Gray Scale */
--pip-neutral-0: #ffffff;
--pip-neutral-50: #f8fafc;
--pip-neutral-100: #f1f5f9;
--pip-neutral-200: #e2e8f0;
--pip-neutral-300: #cbd5e1;
--pip-neutral-400: #94a3b8;
--pip-neutral-500: #64748b;
--pip-neutral-600: #475569;
--pip-neutral-700: #334155;
--pip-neutral-800: #1e293b;
--pip-neutral-900: #0f172a;
--pip-neutral-950: #020617;
```

#### Semantic Colors
```css
/* Success */
--pip-success-50: #f0fdf4;
--pip-success-500: #22c55e;
--pip-success-700: #15803d;

/* Warning */
--pip-warning-50: #fffbeb;
--pip-warning-500: #f59e0b;
--pip-warning-700: #a16207;

/* Error */
--pip-error-50: #fef2f2;
--pip-error-500: #ef4444;
--pip-error-700: #b91c1c;

/* Info */
--pip-info-50: #eff6ff;
--pip-info-500: #3b82f6;
--pip-info-700: #1d4ed8;
```

### Typography

#### Font Families
```css
/* Primary Font - Inter */
--pip-font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;

/* Monospace Font - JetBrains Mono */
--pip-font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
```

#### Font Scales
```css
/* Display */
--pip-text-display-lg: 72px;  /* line-height: 90px */
--pip-text-display-md: 60px;  /* line-height: 72px */
--pip-text-display-sm: 48px;  /* line-height: 60px */

/* Headlines */
--pip-text-h1: 36px;  /* line-height: 44px */
--pip-text-h2: 30px;  /* line-height: 38px */
--pip-text-h3: 24px;  /* line-height: 32px */
--pip-text-h4: 20px;  /* line-height: 28px */
--pip-text-h5: 18px;  /* line-height: 26px */
--pip-text-h6: 16px;  /* line-height: 24px */

/* Body */
--pip-text-lg: 18px;  /* line-height: 28px */
--pip-text-base: 16px;  /* line-height: 24px */
--pip-text-sm: 14px;  /* line-height: 20px */
--pip-text-xs: 12px;  /* line-height: 16px */

/* Labels */
--pip-text-label-lg: 14px;  /* line-height: 20px, weight: 600 */
--pip-text-label-md: 12px;  /* line-height: 16px, weight: 600 */
--pip-text-label-sm: 11px;  /* line-height: 16px, weight: 600 */
```

### Spacing Scale
```css
/* Spacing Tokens */
--pip-space-0: 0px;
--pip-space-1: 4px;
--pip-space-2: 8px;
--pip-space-3: 12px;
--pip-space-4: 16px;
--pip-space-5: 20px;
--pip-space-6: 24px;
--pip-space-8: 32px;
--pip-space-10: 40px;
--pip-space-12: 48px;
--pip-space-16: 64px;
--pip-space-20: 80px;
--pip-space-24: 96px;
--pip-space-32: 128px;
```

### Border Radius
```css
/* Radius Tokens */
--pip-radius-none: 0px;
--pip-radius-xs: 2px;
--pip-radius-sm: 4px;
--pip-radius-md: 6px;
--pip-radius-lg: 8px;
--pip-radius-xl: 12px;
--pip-radius-2xl: 16px;
--pip-radius-full: 9999px;
```

### Shadows
```css
/* Shadow Tokens */
--pip-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--pip-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--pip-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--pip-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--pip-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

## Components

### Upload Dock Specification

#### Overview
The Upload Dock is the primary file upload interface for PIP AI. It supports drag-and-drop, click-to-select, and shows real-time upload progress.

#### States

##### 1. Default State (Empty)
- **Dimensions**: 480px × 320px (Desktop), 100% × 240px (Mobile)
- **Background**: `--pip-neutral-50` with `--pip-neutral-200` dashed border (2px)
- **Border Radius**: `--pip-radius-xl` (12px)
- **Content**: Upload icon + text + button

##### 2. Hover State
- **Background**: `--pip-primary-50`
- **Border**: `--pip-primary-300` dashed (2px)
- **Icon**: `--pip-primary-500`
- **Transition**: 150ms ease-in-out

##### 3. Drag Active State
- **Background**: `--pip-primary-100`
- **Border**: `--pip-primary-400` solid (2px)
- **Scale**: 1.02 transform
- **Glow**: `--pip-shadow-lg` with primary tint

##### 4. File Selected State
- **Background**: `--pip-neutral-0`
- **Border**: `--pip-neutral-300` solid (1px)
- **Content**: File preview + metadata + progress

##### 5. Upload Progress State
- **Progress Bar**: `--pip-primary-500` fill, `--pip-neutral-200` background
- **Height**: 4px
- **Animation**: Smooth fill transition

##### 6. Success State
- **Border**: `--pip-success-500` solid (2px)
- **Icon**: Success checkmark in `--pip-success-500`
- **Duration**: 2s before auto-dismiss

##### 7. Error State
- **Border**: `--pip-error-500` solid (2px)
- **Background**: `--pip-error-50`
- **Message**: Error text in `--pip-error-700`

#### Typography
- **Main Text**: `--pip-text-lg` in `--pip-neutral-700`
- **Secondary Text**: `--pip-text-sm` in `--pip-neutral-500`
- **File Name**: `--pip-text-base` in `--pip-neutral-900`, weight: 600
- **File Size**: `--pip-text-sm` in `--pip-neutral-500`

#### Icons
- **Upload Icon**: 48px × 48px, `--pip-neutral-400`
- **File Type Icons**: 24px × 24px, `--pip-neutral-600`
- **Success Icon**: 24px × 24px, `--pip-success-500`
- **Error Icon**: 24px × 24px, `--pip-error-500`

#### Animations
```css
/* Hover Animation */
.upload-dock:hover {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Drag Scale */
.upload-dock--drag-active {
  transform: scale(1.02);
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Progress Fill */
.progress-bar {
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Figma Setup Instructions

### 1. Create Design File
1. Open Figma and create new file: "PIP AI Design System"
2. Create 3 pages:
   - **Tokens** - Color, typography, spacing
   - **Components** - Upload Dock and other components
   - **Patterns** - Layout patterns and compositions

### 2. Set Up Color Styles
1. In Tokens page, create color swatches for each token
2. Convert each color to a Figma Style:
   - Name format: `color/primary/500`
   - Description: Include hex value and usage notes
3. Group styles by category (Primary, Neutral, Semantic)

### 3. Set Up Typography Styles
1. Install Inter and JetBrains Mono fonts
2. Create text styles for each token:
   - Name format: `text/heading/h1`
   - Include font family, size, line height, weight
3. Set up consistent naming convention

### 4. Create Upload Dock Component
1. Design all 7 states as component variants
2. Use auto-layout for responsive behavior
3. Apply design tokens consistently
4. Add component properties for:
   - State (default, hover, drag, etc.)
   - File type
   - Progress percentage
   - Error message

### 5. Component Properties
```
Properties:
- State: Variant (Default, Hover, Drag, Selected, Progress, Success, Error)
- File Name: Text
- File Size: Text
- Progress: Number (0-100)
- Error Message: Text
- Show Preview: Boolean
```

### 6. Export Tokens
1. Use Figma Tokens plugin to export design tokens
2. Generate CSS custom properties
3. Create JSON format for design tools

## Implementation Notes

### CSS Custom Properties Integration
```css
:root {
  /* Import all design tokens */
  @import './design-tokens.css';
}

/* Component implementation */
.upload-dock {
  background: var(--pip-neutral-50);
  border: 2px dashed var(--pip-neutral-200);
  border-radius: var(--pip-radius-xl);
  padding: var(--pip-space-8);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Design Token Updates
- Sync tokens between Figma and code using Figma Tokens plugin
- Generate TypeScript types from tokens
- Maintain single source of truth in Figma

This design system provides a comprehensive foundation for PIP AI's visual identity and ensures consistency across all interfaces.
