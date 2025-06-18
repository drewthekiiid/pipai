# PIP AI Design System

This document outlines the design system integration between Figma and code implementation.

## 📋 Step 2 Checklist

### Manual Steps (Do in Figma)
- [ ] **Create "PIP AI Design" file in Figma**
  - Set up design tokens (colors, typography, spacing)
  - Create Upload Dock frame design
  - Add color/font tokens as Figma variables
  - Design key components (buttons, inputs, cards)

### Automated Steps (Ready)
- [x] **V0.dev CLI installed** (`v0` command available)
- [x] **shadcn/ui configured** in Next.js app with Slate theme
- [x] **Design tokens defined** in `packages/ui/src/design-tokens.ts`
- [x] **Upload Dock component** placeholder created
- [x] **UI package structure** ready for V0.dev generations

## 🎨 Design Tokens

The design tokens are defined in `packages/ui/src/design-tokens.ts` and include:

- **Colors**: Primary palette, semantic colors, upload-specific colors
- **Typography**: Font families (Inter, JetBrains Mono), sizes, weights
- **Spacing**: Consistent spacing scale (xs to 3xl)
- **Border Radius**: Rounded corners (sm to full)
- **Shadows**: Elevation system (sm to xl)
- **Animation**: Duration and easing functions
- **Components**: Component-specific tokens (upload dock, buttons)

## 🔄 Figma → V0.dev Workflow

Once you have designs in Figma:

1. **Select frame** in Figma Design file
2. **Run V0.dev plugin** → "Copy CLI command"
3. **Generate component**: 
   ```bash
   npx v0 dev "<paste-id>" --out packages/ui/src/components
   ```
4. **Export component** from `packages/ui/src/index.ts`
5. **Use in apps** via `@pip-ai/ui` imports

## 🏗️ Current Structure

```
packages/ui/
├── src/
│   ├── components/
│   │   └── upload-dock.tsx      # Placeholder component
│   ├── lib/
│   │   └── utils.ts             # Utility functions (cn)
│   ├── design-tokens.ts         # Design system tokens
│   └── index.ts                 # Package exports
├── package.json                 # UI package config
└── tsconfig.json               # TypeScript config
```

## 🎯 Upload Dock Design Guidelines

For the Upload Dock component design in Figma:

### Visual Specifications
- **Container**: Dashed border, rounded corners (lg = 8px)
- **States**: Default, hover, drag-over, error, success
- **Colors**: Use `upload.*` tokens from design system
- **Typography**: Inter font, consistent with token scale
- **Icon**: Upload/cloud icon, 24px size
- **Spacing**: 32px padding, 16px gaps between elements

### Interactive States
1. **Default**: Dashed gray border, muted text
2. **Hover**: Darker border, slightly lifted appearance
3. **Drag Over**: Solid border, background tint
4. **Processing**: Loading state with spinner
5. **Error**: Red border, error message
6. **Success**: Green border, success indicator

### Content Structure
- Upload icon (top)
- Primary text: "Drop files here or click to browse"
- Secondary text: "PDF, images, and text files supported"
- Optional: Progress indicator, file list

## 📱 Responsive Behavior
- **Mobile**: Stacked layout, touch-friendly target size
- **Tablet**: Maintain proportions, adjust padding
- **Desktop**: Full layout with hover states

## 🚀 Next Steps

1. **Create Figma design** following the specifications above
2. **Test V0.dev generation** with Upload Dock frame
3. **Iterate on design tokens** based on generated output
4. **Create additional components** (buttons, cards, forms)
5. **Build complete component library** for PIP AI app
