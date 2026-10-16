export const THEME = {
  colors: {
    // Primary Devotional Colors
    primary: '#1B4D3E', // Sacred Forest Green
    primaryDark: '#0F382A',
    primaryLight: '#2C6B56',
    primaryUltraLight: '#EBF4F0',

    // Sacred Gold & Saffron Accents
    gold: '#D4AF37', // Temple Gold
    goldDark: '#B45309', // Rich Amber Gold
    goldLight: '#FEF3C7', // Warm Gold Tint
    goldAccent: '#FEF08A',
    saffron: '#EA580C', // Sacred Vedic Kesari Saffron
    saffronLight: '#FFEDD5',
    saffronDark: '#C2410C',

    // Background & Surfaces (Sacred Saffron & Kesari Palette)
    background: '#FFF2DE', // Radiant Warm Saffron / Kesari Glow (Rich & Devotional)
    surface: '#FFFFFF', // Pristine White Card Surface
    surfaceVariant: '#FFEDD5', // Warm Kesari Peach Inset Surface
    surfaceMuted: '#FED7AA', // Warm Amber Accent Tone
    card: '#FFFFFF',

    // Text & Typography
    text: '#1C1917', // High contrast deep obsidian/charcoal
    textMuted: '#785E4F', // Warm rich cocoa slate
    textLight: '#A89080', // Clear placeholder / hint
    textInverse: '#FFFFFF',

    // Borders & Dividers
    border: '#FED7AA', // Warm Kesari/Golden hairline border
    borderLight: '#FFF0DC', // Subtle separator

    // Status / Sentiment
    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    // Grades
    gradeA: '#1B4D3E',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      title: 28,
      display: 34,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    soft: {
      shadowColor: '#B45309',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    medium: {
      shadowColor: '#B45309',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 4,
    },
  },
};
