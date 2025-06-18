# PIP AI Figma Design System Setup Guide

## Quick Start

### 1. Create New Figma File
1. Go to [Figma](https://figma.com) and create a new design file
2. Name it: **"PIP AI Design System"**
3. Set up these pages:
   - **🎨 Tokens** (Colors, Typography, Spacing)
   - **🧩 Components** (Upload Dock, Buttons, etc.)
   - **📱 Patterns** (Layouts and compositions)

### 2. Install Required Fonts
Before starting, install these fonts in Figma:
- **Inter** (Primary sans-serif) - [Google Fonts](https://fonts.google.com/specimen/Inter)
- **JetBrains Mono** (Monospace) - [JetBrains](https://www.jetbrains.com/mono/)

## Page 1: 🎨 Tokens

### Color Palette Setup

#### Frame: "Primary Colors"
Create a 10×1 grid of color swatches (64×64px each):

| Shade | Hex Code | Usage |
|-------|----------|-------|
| 50 | `#f0f9ff` | Lightest backgrounds |
| 100 | `#e0f2fe` | Subtle backgrounds |
| 200 | `#bae6fd` | Disabled states |
| 300 | `#7dd3fc` | Borders, hover states |
| 400 | `#38bdf8` | Secondary actions |
| **500** | `#0ea5e9` | **Primary brand color** |
| 600 | `#0284c7` | Primary hover |
| 700 | `#0369a1` | Primary pressed |
| 800 | `#075985` | Dark mode primary |
| 900 | `#0c4a6e` | Darkest primary |

**Create Figma Styles for each:**
- Right-click each swatch → "Create style"
- Name format: `color/primary/500`
- Description: "Primary brand color - Use for main CTAs and key UI elements"

#### Frame: "Neutral Colors"
11×1 grid (64×64px each):

| Shade | Hex Code | Usage |
|-------|----------|-------|
| 0 | `#ffffff` | Pure white |
| 50 | `#f8fafc` | Page backgrounds |
| 100 | `#f1f5f9` | Card backgrounds |
| 200 | `#e2e8f0` | Borders |
| 300 | `#cbd5e1` | Disabled text |
| 400 | `#94a3b8` | Placeholder text |
| 500 | `#64748b` | Secondary text |
| 600 | `#475569` | Primary text |
| 700 | `#334155` | Headings |
| 800 | `#1e293b` | Dark headings |
| 900 | `#0f172a` | Darkest text |

#### Frame: "Semantic Colors"
4×4 grid for Success, Warning, Error, Info (3 shades each):

**Success (Green):**
- 50: `#f0fdf4`, 500: `#22c55e`, 700: `#15803d`

**Warning (Amber):**
- 50: `#fffbeb`, 500: `#f59e0b`, 700: `#a16207`

**Error (Red):**
- 50: `#fef2f2`, 500: `#ef4444`, 700: `#b91c1c`

**Info (Blue):**
- 50: `#eff6ff`, 500: `#3b82f6`, 700: `#1d4ed8`

### Typography Setup

#### Frame: "Font Families"
Show font samples:
```
Inter - The quick brown fox jumps over the lazy dog
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
1234567890

JetBrains Mono - The quick brown fox jumps
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
1234567890 {}[]()
```

#### Frame: "Text Styles"
Create text samples and styles for each:

**Display Styles:**
- Display Large: 72px/90px Inter Bold
- Display Medium: 60px/72px Inter Bold  
- Display Small: 48px/60px Inter Bold

**Heading Styles:**
- H1: 36px/44px Inter SemiBold
- H2: 30px/38px Inter SemiBold
- H3: 24px/32px Inter SemiBold
- H4: 20px/28px Inter SemiBold
- H5: 18px/26px Inter Medium
- H6: 16px/24px Inter Medium

**Body Styles:**
- Body Large: 18px/28px Inter Regular
- Body Base: 16px/24px Inter Regular
- Body Small: 14px/20px Inter Regular
- Body XSmall: 12px/16px Inter Regular

**Label Styles:**
- Label Large: 14px/20px Inter SemiBold
- Label Medium: 12px/16px Inter SemiBold
- Label Small: 11px/16px Inter SemiBold

**Create Figma Styles:**
- Name format: `text/heading/h1`
- Include font family, size, line height, weight

### Spacing & Layout

#### Frame: "Spacing Scale"
Create squares showing each spacing value:
- 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px, 128px
- Use `pip-neutral-300` fill and label each

#### Frame: "Border Radius"
Show rectangles with different radius values:
- None (0px), XS (2px), SM (4px), MD (6px), LG (8px), XL (12px), 2XL (16px), Full (9999px)

## Page 2: 🧩 Components

### Upload Dock Component

#### Master Component Setup
Create a 480×320px frame with these layers:

```
📁 Upload Dock [Master Component]
  📁 Background
    🔲 Border (Stroke: 2px dashed, color/neutral/200)
    🔲 Fill (color/neutral/50)
  📁 Content [Auto Layout: Vertical, Gap: 16px, Center align]
    📁 Icon Area
      🎨 Upload Icon (48×48px, color/neutral/400)
    📁 Text Area [Auto Layout: Vertical, Gap: 8px]
      📝 Main Text ("Drag and drop files here")
      📝 Secondary Text ("or click to browse")
    🔲 Browse Button
  📁 Progress Overlay [Hidden by default]
    🔲 Progress Background
    🔲 Progress Fill
  📁 File Preview [Hidden by default]
    📁 File Info
    📝 File Name
    📝 File Size
```

#### Component Variants
Create 7 variants in the component:

1. **Default** 
   - Background: `color/neutral/50`
   - Border: `color/neutral/200` dashed

2. **Hover**
   - Background: `color/primary/50`
   - Border: `color/primary/300` dashed
   - Icon: `color/primary/500`

3. **Drag Active**
   - Background: `color/primary/100`
   - Border: `color/primary/400` solid
   - Add outer glow effect

4. **File Selected**
   - Background: `color/neutral/0`
   - Border: `color/neutral/300` solid
   - Show file preview, hide upload content

5. **Upload Progress**
   - Same as File Selected
   - Show progress bar
   - Add progress percentage text

6. **Success**
   - Border: `color/success/500` solid
   - Show success icon
   - Success message

7. **Error**
   - Background: `color/error/50`
   - Border: `color/error/500` solid
   - Show error icon and message

#### Component Properties
Add these properties to the master component:

```
Property Name: State
Type: Variant
Options: Default, Hover, Drag Active, File Selected, Upload Progress, Success, Error

Property Name: File Name
Type: Text
Default: "document.pdf"

Property Name: File Size  
Type: Text
Default: "2.5 MB"

Property Name: Progress
Type: Number
Default: 0
Min: 0, Max: 100

Property Name: Error Message
Type: Text
Default: "Upload failed. Please try again."

Property Name: Show Preview
Type: Boolean
Default: false
```

### Additional Components

#### Button Component
Create primary, secondary, and tertiary button variants with:
- Hover, pressed, disabled states
- Small, medium, large sizes
- Icon options

#### Form Input Component
Create text input with:
- Default, focused, error states
- Label and helper text options
- Different sizes

## Page 3: 📱 Patterns

### Layout Patterns
- Header with navigation
- Sidebar layouts
- Card grids
- Form layouts
- Upload flow examples

## Export & Sync Setup

### 1. Install Figma Tokens Plugin
1. Install "Figma Tokens" plugin
2. Configure to export to JSON format
3. Set up token naming convention

### 2. Token Export Configuration
```json
{
  "color": {
    "primary": {
      "50": { "value": "#f0f9ff", "type": "color" },
      "500": { "value": "#0ea5e9", "type": "color" }
    }
  },
  "fontSize": {
    "h1": { "value": "36px", "type": "fontSizes" },
    "base": { "value": "16px", "type": "fontSizes" }
  }
}
```

### 3. Sync with Codebase
1. Export tokens as JSON
2. Use build script to convert to CSS custom properties
3. Generate TypeScript types
4. Update React components

## Design File Structure

```
📁 PIP AI Design System
  📄 🎨 Tokens
    📁 Colors
      📁 Primary Colors
      📁 Neutral Colors  
      📁 Semantic Colors
    📁 Typography
      📁 Font Families
      📁 Text Styles
    📁 Spacing & Layout
      📁 Spacing Scale
      📁 Border Radius
  📄 🧩 Components
    📁 Upload Dock
      📁 Master Component
      📁 Variants
      📁 Documentation
    📁 Buttons
    📁 Form Elements
    📁 Navigation
  📄 📱 Patterns
    📁 Layout Examples
    📁 Upload Flows
    📁 Dashboard Layouts
```

## Next Steps

1. **Create the Figma file** following this guide
2. **Set up component library** with proper naming
3. **Install Figma Tokens plugin** for sync
4. **Export tokens** and integrate with codebase
5. **Document usage** examples for developers

This setup ensures a single source of truth for design tokens and maintains consistency between design and code.
