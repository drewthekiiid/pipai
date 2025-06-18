# PIP AI Figma Design System Setup Guide

## Overview
This guide will help you create the "PIP AI Design" file in Figma with CDO Group branding, design tokens, and the Upload Dock component.

## Step 1: Create New Figma File

1. **Open Figma** and create a new design file
2. **Name the file**: "PIP AI Design System"
3. **Set up pages**:
   - **Tokens** - Color palette, typography, spacing
   - **Components** - Upload Dock and other UI components
   - **Prototypes** - Interactive examples

## Step 2: Install Figma Tokens Plugin

1. Go to **Plugins** → **Browse plugins in Community**
2. Search for **"Figma Tokens"** by Jan Six
3. **Install** the plugin
4. This will allow you to sync design tokens with code

## Step 3: CDO Brand Color Setup

### Primary Colors (CDO Brand)
```
CDO Red (Primary):
- HEX: #EF2323
- RGB: 239, 35, 35
- Usage: Primary actions, accents, active states

Silver (Secondary):
- HEX: #C0C0C0  
- RGB: 192, 192, 192
- Usage: Secondary elements, borders, text

Dark Charcoal (Background):
- HEX: #18181A
- RGB: 24, 24, 26
- Usage: Main background

Dock Charcoal (Surface):
- HEX: #242428
- RGB: 36, 36, 40
- Usage: Upload dock surface, cards

White (Text):
- HEX: #FFFFFF
- RGB: 255, 255, 255
- Usage: Text on dark backgrounds
```

### Create Color Styles
1. **Create color styles** in Figma for each brand color
2. **Name them consistently**:
   - `CDO/Primary/Red`
   - `CDO/Secondary/Silver`
   - `CDO/Dark/Background`
   - `CDO/Dark/Surface`
   - `CDO/Text/White`

## Step 4: Typography Setup

### Font Family
- **Primary**: Inter (download from Google Fonts if needed)
- **Fallback**: SF Pro Display (Mac) / Segoe UI (Windows)

### Text Styles to Create
```
Display/Large: Inter Bold, 48px, Line Height 1.2
Display/Medium: Inter Bold, 36px, Line Height 1.2
Display/Small: Inter Bold, 30px, Line Height 1.25

Heading/H1: Inter Bold, 24px, Line Height 1.25
Heading/H2: Inter Semibold, 20px, Line Height 1.3
Heading/H3: Inter Medium, 18px, Line Height 1.3

Body/Large: Inter Regular, 18px, Line Height 1.5
Body/Base: Inter Regular, 16px, Line Height 1.5
Body/Small: Inter Regular, 14px, Line Height 1.4

Caption: Inter Medium, 12px, Line Height 1.3
```

## Step 5: Upload Dock Component Design

### Frame Specifications
```
Main Frame:
- Width: 680px
- Height: 140px (minimum, can expand)
- Background: #242428 (Dock Charcoal)
- Border: 2px solid #C0C0C0 (Silver)
- Border Radius: 18px
- Shadow: 0px 4px 20px rgba(0,0,0,0.18)

Active State:
- Border Color: #EF2323 (CDO Red)
- All other properties same
```

### Component Elements

#### 1. CDO Logo Badge
```
Position: Top-left, 16px from edges
Size: 60x24px (maintaining logo proportions)
Logo: Official CDO Group logo SVG
- "CDO" text in #EF2323 (CDO Red)
- "GROUP" text in #C0C0C0 (Silver)
Opacity: 90%
Background: Transparent

Note: Use the official CDO Group logo provided. The logo features:
- Bold red "CDO" text with geometric letterforms
- Silver "GROUP" text underneath
- Dark background (logo includes background)
```

#### 2. Drop Zone Content
```
Icon: Upload cloud icon, 32px, #C0C0C0 (Silver)
Main Text: "Drop files here or click to upload"
- Font: Inter Bold, 18px, #C0C0C0 (Silver)
Sub Text: "Support for images, documents, and text files"
- Font: Inter Regular, 14px, #C0C0C0 at 70% opacity
```

#### 3. File Pills (when files added)
```
Background: #C0C0C0 (Silver)
Text Color: #18181A (Dark)
Border Radius: 9999px (full pill)
Padding: 8px 16px
Delete X: #EF2323 (CDO Red), hover effect
```

#### 4. Chat Input
```
Width: Flex-grow
Background: #242428 (Dock Charcoal)
Border: 1px solid #C0C0C0 (Silver)
Border Radius: 12px
Padding: 12px 16px
Text: Inter Regular, 16px, White
Placeholder: Inter Regular, 16px, #C0C0C0 at 60%
```

#### 5. Send Button
```
Background: #EF2323 (CDO Red)
Text Color: White
Border Radius: 9999px (full pill)
Padding: 12px 24px
Font: Inter Medium, 16px
```

## Step 6: Component States

Create variants for:
1. **Default** - Empty state with drop prompt
2. **Hover** - Subtle highlighting
3. **Active/Drag Over** - Red border, overlay effect
4. **With Files** - Shows file pills
5. **Disabled** - 50% opacity, no interactions

## Step 7: Auto Layout Setup

1. **Main container**: Auto layout, vertical, 16px gap
2. **Drop zone**: Auto layout, vertical, centered, 16px gap
3. **File pills area**: Auto layout, horizontal, wrap, 8px gap
4. **Bottom controls**: Auto layout, horizontal, 12px gap

## Step 8: Export Figma Tokens

1. **Open Figma Tokens plugin**
2. **Import** the following JSON structure:
3. **Sync** tokens to generate CSS variables
4. **Export** to match our TypeScript design tokens

### Token JSON Structure
```json
{
  "global": {
    "colors": {
      "cdo": {
        "primary": {
          "value": "#EF2323",
          "type": "color"
        },
        "silver": {
          "value": "#C0C0C0", 
          "type": "color"
        },
        "dark": {
          "background": {
            "value": "#18181A",
            "type": "color"
          },
          "surface": {
            "value": "#242428",
            "type": "color"
          }
        },
        "text": {
          "white": {
            "value": "#FFFFFF",
            "type": "color"
          }
        }
      }
    },
    "spacing": {
      "xs": {"value": "4px", "type": "spacing"},
      "sm": {"value": "8px", "type": "spacing"},
      "md": {"value": "16px", "type": "spacing"},
      "lg": {"value": "24px", "type": "spacing"},
      "xl": {"value": "32px", "type": "spacing"}
    },
    "borderRadius": {
      "sm": {"value": "6px", "type": "borderRadius"},
      "md": {"value": "12px", "type": "borderRadius"},
      "lg": {"value": "18px", "type": "borderRadius"},
      "full": {"value": "9999px", "type": "borderRadius"}
    }
  }
}
```

## Step 9: V0.dev Integration

### Upload to V0.dev
1. **Export Upload Dock frame** as PNG/SVG from Figma
2. **Open V0.dev** in browser
3. **Upload the design** image
4. **Use this prompt**:

```
Create a React component matching this Upload Dock design exactly:
- Use CDO red (#EF2323) for primary actions and active states
- Use silver (#C0C0C0) for secondary elements
- Use dark charcoal (#18181A) background and (#242428) for surfaces
- Include drag & drop functionality
- File pills with delete functionality  
- Chat input with send button
- CDO logo badge in top-left
- Match exact spacing and styling from design
- Use Tailwind CSS classes
- TypeScript with proper interfaces
```

### Generated Code Integration
1. **Copy generated component** from V0.dev
2. **Place in** `packages/ui/src/components/`
3. **Update imports** to use our design tokens
4. **Test component** in Storybook or demo page

## Step 10: Documentation

Create documentation pages in Figma:
1. **Color Palette** - Show all brand colors with hex codes
2. **Typography Scale** - All text styles with examples
3. **Component Library** - Upload Dock and future components
4. **Usage Guidelines** - When/how to use each element
5. **Developer Handoff** - Specifications for implementation

## Step 11: Team Sharing

1. **Invite team members** to Figma file
2. **Set permissions** (Editor for designers, Viewer for developers)
3. **Create shared library** for reusable components
4. **Enable version history** for tracking changes

## Best Practices

### Design Consistency
- Always use defined color styles (never hard-coded colors)
- Stick to typography scale (never arbitrary font sizes)
- Use consistent spacing values (4px, 8px, 16px, 24px, 32px)
- Apply proper auto-layout for responsive behavior

### Developer Handoff
- Name layers clearly and consistently
- Use descriptive component names
- Include hover/active states
- Document any custom interactions
- Export assets in multiple formats (SVG, PNG @1x, @2x)

### Token Management
- Keep Figma tokens in sync with code
- Use semantic naming (primary/secondary vs red/blue)
- Document any token changes
- Test token updates across all components

## Checklist

- [ ] Figma file created with proper naming
- [ ] CDO brand colors added as styles
- [ ] Typography scale implemented
- [ ] Upload Dock component designed with all states
- [ ] Auto-layout properly configured
- [ ] Figma Tokens plugin installed and configured
- [ ] Design uploaded to V0.dev for code generation
- [ ] Generated code integrated into codebase
- [ ] Documentation pages created
- [ ] Team members invited and permissions set

## Next Steps

After completing this setup:
1. **Design additional components** (buttons, forms, modals)
2. **Create interactive prototypes** for user testing
3. **Establish design review process** with development team
4. **Set up automated design-to-code pipeline** with Figma API
5. **Plan design system evolution** and governance
