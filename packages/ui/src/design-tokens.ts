/**
 * PIP AI Design Tokens
 * Type-safe design tokens for React components
 */

export const designTokens = {
  colors: {
    // CDO Brand Colors - Primary red accent
    primary: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#EF2323',  // CDO Red - main brand color
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#581818',
    },
    // Premium dark theme - charcoal backgrounds
    neutral: {
      0: '#ffffff',     // Pure white for text on dark
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#242428',   // Slightly lighter charcoal for dock
      900: '#18181A',   // Main dark background
      950: '#0f0f10',
    },
    // Premium silver for secondary elements
    silver: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#C0C0C0',   // Premium silver
      600: '#a0a0a0',
      700: '#808080',
      800: '#606060',
      900: '#404040',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#EF2323',  // Use CDO red for errors too
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem', // 60px
      '7xl': '4.5rem',  // 72px
    },
    fontWeight: {
      thin: 100,
      extralight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },
  spacing: {
    0: '0px',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    28: '7rem',       // 112px
    32: '8rem',       // 128px
    36: '9rem',       // 144px
    40: '10rem',      // 160px
    44: '11rem',      // 176px
    48: '12rem',      // 192px
    52: '13rem',      // 208px
    56: '14rem',      // 224px
    60: '15rem',      // 240px
    64: '16rem',      // 256px
    72: '18rem',      // 288px
    80: '20rem',      // 320px
    96: '24rem',      // 384px
  },
  borderRadius: {
    none: '0px',
    xs: '0.125rem',   // 2px
    sm: '0.25rem',    // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },
  boxShadow: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  animation: {
    duration: {
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms',
    },
    timingFunction: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
  components: {
    uploadDock: {
      width: '42.5rem',        // 680px - as specified
      height: '8.75rem',       // 140px - as specified
      minHeight: '8.75rem',    // 140px - minimum height
      widthMobile: '100%',
      heightMobile: '7rem',    // 112px - mobile optimized
      borderWidth: '2px',
      borderStyle: 'solid',
      borderRadius: '1.125rem', // 18px - as specified
      shadow: '0 4px 20px rgba(0,0,0,0.18)', // Floating effect
      background: '#242428',   // Slightly lighter charcoal
      borderDefault: '#C0C0C0', // Premium silver
      borderActive: '#EF2323',  // CDO red when active
      padding: '2rem',         // 32px - internal padding
      gap: '1rem',             // 16px - gap between elements
    },
    filePill: {
      background: '#C0C0C0',   // Silver background
      textColor: '#18181A',    // Dark text for contrast
      deleteColor: '#EF2323',  // CDO red for delete X
      borderRadius: '9999px',  // Full pill shape
      padding: '0.5rem 1rem',  // 8px 16px
    },
    sendButton: {
      background: '#EF2323',   // CDO red
      textColor: '#FFFFFF',    // White text
      borderRadius: '9999px',  // Full pill shape
      padding: '0.75rem 1.5rem', // 12px 24px
    },
    logo: {
      size: '2rem',           // 32px as specified
      opacity: '0.9',         // 90% for subtlety
      position: 'top-left',
    },
    progressBar: {
      height: '0.25rem',       // 4px
    },
    icon: {
      xs: '1rem',     // 16px
      sm: '1.25rem',  // 20px
      md: '1.5rem',   // 24px
      lg: '2rem',     // 32px
      xl: '3rem',     // 48px
      '2xl': '4rem',  // 64px
    },
  },
} as const;

// Type exports for TypeScript
export type ColorScale = keyof typeof designTokens.colors.primary;
export type ColorName = keyof typeof designTokens.colors;
export type FontSize = keyof typeof designTokens.typography.fontSize;
export type FontWeight = keyof typeof designTokens.typography.fontWeight;
export type Spacing = keyof typeof designTokens.spacing;
export type BorderRadius = keyof typeof designTokens.borderRadius;
export type BoxShadow = keyof typeof designTokens.boxShadow;

// Utility functions for accessing design tokens
export function getColor(color: ColorName, scale: ColorScale): string {
  return (designTokens.colors[color] as any)[scale];
}

export function getSpacing(size: Spacing): string {
  return designTokens.spacing[size];
}

export function getFontSize(size: FontSize): string {
  return designTokens.typography.fontSize[size];
}

export function getBorderRadius(size: BorderRadius): string {
  return designTokens.borderRadius[size];
}

export function getBoxShadow(size: BoxShadow): string {
  return designTokens.boxShadow[size];
}
