export const THEME = {
  colors: {
    // Primary Devotional Colors
    primary: '#1B4D3E', // Sacred Forest Green
    primaryDark: '#0F382A',
    primaryLight: '#2C6B56',
    primaryUltraLight: '#EBF4F0',

    // Sacred Gold Accents
    gold: '#D4AF37', // Temple Gold
    goldDark: '#B8860B',
    goldLight: '#FEF3C7',
    goldAccent: '#FFFBEB',

    // Background & Surfaces (Modern Executive & Clean Canvas)
    background: '#F4F6F9', // Crisp Executive Canvas (replaces dull/yellowish cream #FDFBF7)
    surface: '#FFFFFF', // Pristine Card Surface
    surfaceVariant: '#EDF2F7', // Refined Inset / Block Surface (replaces muddy #F7F4EC)
    surfaceMuted: '#E2E8F0', // Clean Divider / Muted Tone (replaces dull #EFECE3)
    card: '#FFFFFF',

    // Text & Typography
    text: '#0F172A', // High contrast deep obsidian/slate ink (replaces #1C2826)
    textMuted: '#64748B', // Neutral professional secondary slate (replaces #5C6B64)
    textLight: '#94A3B8', // Clear placeholder / hint
    textInverse: '#FFFFFF',

    // Borders & Dividers
    border: '#E2E8F0', // Crisp slate border (replaces muddy yellowish #E3DDD3)
    borderLight: '#F1F5F9', // Subtle separator

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
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    medium: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};
