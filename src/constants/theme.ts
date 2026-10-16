export const THEME = {
  colors: {
    // Header & Brand Colors
    header: '#FFA600', // Vibrant Golden Marigold
    headerBorder: '#E08500',
    headerText: '#261200', // Deep obsidian brown for high contrast on #FFA600
    headerSubtitle: '#5C2D00',

    // Primary Devotional Colors
    primary: '#D97706', // Rich Golden Amber
    primaryDark: '#92400E', // Deep Amber
    primaryLight: '#FFA600', // Golden Orange
    primaryUltraLight: '#FEF3C7', // Soft Gold Tint
 
    // Sacred Gold & Saffron Accents
    gold: '#D4AF37', // Temple Gold
    goldDark: '#B45309', // Rich Amber Gold
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#FFA600',
    saffronLight: '#FCD997',
    saffronDark: '#B45309',

    // Background & Surfaces
    background: '#FCD997', // User requested golden body canvas
    surface: '#FFFFFF', // Pristine White Card Surface
    surfaceVariant: '#F7CE7F', // Warm Golden Inset Surface
    surfaceMuted: '#EAA847', // Warm Amber Accent Tone
    card: '#FFFFFF',

    // Text & Typography
    text: '#1C1917', // High contrast deep obsidian/charcoal
    textMuted: '#684518', // Warm rich cocoa amber
    textLight: '#8C6030', // Clear placeholder / hint
    textInverse: '#FFFFFF',

    // Borders & Dividers
    border: '#EAA847', // Warm golden hairline border
    borderLight: '#F6CD8B', // Subtle separator

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
    gradeA: '#D97706',
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
