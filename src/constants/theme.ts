export type ThemeId =
  | 'orange'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'pink'
  | 'black'
  | 'purple'
  | 'teal'
  | 'maroon'
  | 'gold'
  | 'emerald'
  | 'navy'
  | 'sandalwood'
  | 'violet';

export interface ThemeColors {
  // Brand Header
  header: string;
  headerBorder: string;
  headerText: string;
  headerSubtitle: string;

  // Primary
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryUltraLight: string;

  // Gold / Accent
  gold: string;
  goldDark: string;
  goldLight: string;
  goldAccent: string;
  saffron: string;
  saffronLight: string;
  saffronDark: string;

  // Background & Surfaces
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceMuted: string;
  card: string;

  // Typography
  text: string;
  textMuted: string;
  textLight: string;
  textInverse: string;

  // Borders
  border: string;
  borderLight: string;

  // Status
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;

  // Grades
  gradeA: string;
  gradeB: string;
  gradeC: string;
  gradeD: string;
  gradeE: string;
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  thickColor: string;
  liteColor: string;
  colors: ThemeColors;
  typography: typeof baseTypography;
  spacing: typeof baseSpacing;
  borderRadius: typeof baseBorderRadius;
  shadows: typeof baseShadows;
}

const baseTypography = {
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
};

const baseSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

const baseBorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

const baseShadows = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 7,
  },
};

// 1. Saffron Orange (Default Devotional)
const orangeTheme: AppTheme = {
  id: 'orange',
  name: 'Saffron Orange',
  thickColor: '#EA580C',
  liteColor: '#FFF7ED',
  colors: {
    header: '#EA580C',
    headerBorder: '#C2410C',
    headerText: '#FFFFFF',
    headerSubtitle: '#FFEDD5',

    primary: '#EA580C',
    primaryDark: '#C2410C',
    primaryLight: '#FB923C',
    primaryUltraLight: '#FFF7ED',

    gold: '#D4AF37',
    goldDark: '#B45309',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#EA580C',
    saffronLight: '#FED7AA',
    saffronDark: '#9A3412',

    background: '#FFF7ED',
    surface: '#FFFFFF',
    surfaceVariant: '#FFEDD5',
    surfaceMuted: '#FED7AA',
    card: '#FFFFFF',

    text: '#1C1917',
    textMuted: '#78350F',
    textLight: '#9A3412',
    textInverse: '#FFFFFF',

    border: '#FED7AA',
    borderLight: '#FFEDD5',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 2. Royal Blue
const blueTheme: AppTheme = {
  id: 'blue',
  name: 'Royal Blue',
  thickColor: '#2563EB',
  liteColor: '#EFF6FF',
  colors: {
    header: '#2563EB',
    headerBorder: '#1D4ED8',
    headerText: '#FFFFFF',
    headerSubtitle: '#DBEAFE',

    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: '#60A5FA',
    primaryUltraLight: '#EFF6FF',

    gold: '#F59E0B',
    goldDark: '#D97706',
    goldLight: '#FEF3C7',
    goldAccent: '#FCD34D',
    saffron: '#3B82F6',
    saffronLight: '#BFDBFE',
    saffronDark: '#1E40AF',

    background: '#EFF6FF',
    surface: '#FFFFFF',
    surfaceVariant: '#DBEAFE',
    surfaceMuted: '#BFDBFE',
    card: '#FFFFFF',

    text: '#0F172A',
    textMuted: '#1E3A8A',
    textLight: '#3B82F6',
    textInverse: '#FFFFFF',

    border: '#BFDBFE',
    borderLight: '#DBEAFE',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 3. Devotional Green
const greenTheme: AppTheme = {
  id: 'green',
  name: 'Devotional Green',
  thickColor: '#16A34A',
  liteColor: '#F0FDF4',
  colors: {
    header: '#16A34A',
    headerBorder: '#15803D',
    headerText: '#FFFFFF',
    headerSubtitle: '#DCFCE7',

    primary: '#16A34A',
    primaryDark: '#15803D',
    primaryLight: '#4ADE80',
    primaryUltraLight: '#F0FDF4',

    gold: '#D4AF37',
    goldDark: '#B45309',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#22C55E',
    saffronLight: '#BBF7D0',
    saffronDark: '#166534',

    background: '#F0FDF4',
    surface: '#FFFFFF',
    surfaceVariant: '#DCFCE7',
    surfaceMuted: '#BBF7D0',
    card: '#FFFFFF',

    text: '#052E16',
    textMuted: '#14532D',
    textLight: '#166534',
    textInverse: '#FFFFFF',

    border: '#BBF7D0',
    borderLight: '#DCFCE7',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 4. Golden Yellow
const yellowTheme: AppTheme = {
  id: 'yellow',
  name: 'Golden Yellow',
  thickColor: '#D97706',
  liteColor: '#FEFCE8',
  colors: {
    header: '#F59E0B',
    headerBorder: '#D97706',
    headerText: '#78350F',
    headerSubtitle: '#92400E',

    primary: '#D97706',
    primaryDark: '#B45309',
    primaryLight: '#FBBF24',
    primaryUltraLight: '#FEFCE8',

    gold: '#D4AF37',
    goldDark: '#92400E',
    goldLight: '#FEF9C3',
    goldAccent: '#FDE047',
    saffron: '#F59E0B',
    saffronLight: '#FEF08A',
    saffronDark: '#B45309',

    background: '#FEFCE8',
    surface: '#FFFFFF',
    surfaceVariant: '#FEF9C3',
    surfaceMuted: '#FDE68A',
    card: '#FFFFFF',

    text: '#451A03',
    textMuted: '#78350F',
    textLight: '#92400E',
    textInverse: '#FFFFFF',

    border: '#FDE68A',
    borderLight: '#FEF9C3',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 5. Lotus Pink
const pinkTheme: AppTheme = {
  id: 'pink',
  name: 'Lotus Pink',
  thickColor: '#E11D48',
  liteColor: '#FFF1F2',
  colors: {
    header: '#E11D48',
    headerBorder: '#BE123C',
    headerText: '#FFFFFF',
    headerSubtitle: '#FFE4E6',

    primary: '#E11D48',
    primaryDark: '#BE123C',
    primaryLight: '#FB7185',
    primaryUltraLight: '#FFF1F2',

    gold: '#D4AF37',
    goldDark: '#B45309',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#F43F5E',
    saffronLight: '#FECDD3',
    saffronDark: '#9F1239',

    background: '#FFF1F2',
    surface: '#FFFFFF',
    surfaceVariant: '#FFE4E6',
    surfaceMuted: '#FECDD3',
    card: '#FFFFFF',

    text: '#4C0519',
    textMuted: '#881337',
    textLight: '#9F1239',
    textInverse: '#FFFFFF',

    border: '#FECDD3',
    borderLight: '#FFE4E6',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 6. Vedic Dark / Black
const blackTheme: AppTheme = {
  id: 'black',
  name: 'Vedic Dark / Black',
  thickColor: '#0F172A',
  liteColor: '#1E293B',
  colors: {
    header: '#0F172A',
    headerBorder: '#334155',
    headerText: '#F8FAFC',
    headerSubtitle: '#94A3B8',

    primary: '#F59E0B',
    primaryDark: '#D97706',
    primaryLight: '#FCD34D',
    primaryUltraLight: '#334155',

    gold: '#F59E0B',
    goldDark: '#D97706',
    goldLight: '#FEF3C7',
    goldAccent: '#FCD34D',
    saffron: '#EA580C',
    saffronLight: '#475569',
    saffronDark: '#0F172A',

    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    surfaceMuted: '#475569',
    card: '#1E293B',

    text: '#F8FAFC',
    textMuted: '#CBD5E1',
    textLight: '#94A3B8',
    textInverse: '#0F172A',

    border: '#334155',
    borderLight: '#1E293B',

    success: '#22C55E',
    successLight: '#14532D',
    warning: '#F59E0B',
    warningLight: '#78350F',
    danger: '#EF4444',
    dangerLight: '#7F1D1D',
    info: '#38BDF8',
    infoLight: '#0C4A6E',

    gradeA: '#22C55E',
    gradeB: '#38BDF8',
    gradeC: '#F59E0B',
    gradeD: '#FB923C',
    gradeE: '#EF4444',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 7. Krishna Purple
const purpleTheme: AppTheme = {
  id: 'purple',
  name: 'Krishna Purple',
  thickColor: '#7C3AED',
  liteColor: '#F5F3FF',
  colors: {
    header: '#7C3AED',
    headerBorder: '#6D28D9',
    headerText: '#FFFFFF',
    headerSubtitle: '#EDE9FE',

    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    primaryLight: '#A78BFA',
    primaryUltraLight: '#F5F3FF',

    gold: '#D4AF37',
    goldDark: '#B45309',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#8B5CF6',
    saffronLight: '#DDD6FE',
    saffronDark: '#5B21B6',

    background: '#F5F3FF',
    surface: '#FFFFFF',
    surfaceVariant: '#EDE9FE',
    surfaceMuted: '#DDD6FE',
    card: '#FFFFFF',

    text: '#2E1065',
    textMuted: '#5B21B6',
    textLight: '#7C3AED',
    textInverse: '#FFFFFF',

    border: '#DDD6FE',
    borderLight: '#EDE9FE',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 8. Yamuna Teal
const tealTheme: AppTheme = {
  id: 'teal',
  name: 'Yamuna Teal',
  thickColor: '#0D9488',
  liteColor: '#F0FDFA',
  colors: {
    header: '#0D9488',
    headerBorder: '#0F766E',
    headerText: '#FFFFFF',
    headerSubtitle: '#CCFBF1',

    primary: '#0D9488',
    primaryDark: '#0F766E',
    primaryLight: '#2DD4BF',
    primaryUltraLight: '#F0FDFA',

    gold: '#D4AF37',
    goldDark: '#B45309',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#14B8A6',
    saffronLight: '#99F6E4',
    saffronDark: '#115E59',

    background: '#F0FDFA',
    surface: '#FFFFFF',
    surfaceVariant: '#CCFBF1',
    surfaceMuted: '#99F6E4',
    card: '#FFFFFF',

    text: '#134E4A',
    textMuted: '#115E59',
    textLight: '#0D9488',
    textInverse: '#FFFFFF',

    border: '#99F6E4',
    borderLight: '#CCFBF1',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 9. Radha Kunda Crimson / Maroon
const maroonTheme: AppTheme = {
  id: 'maroon',
  name: 'Vrindavan Maroon',
  thickColor: '#991B1B',
  liteColor: '#FEF2F2',
  colors: {
    header: '#991B1B',
    headerBorder: '#7F1D1D',
    headerText: '#FFFFFF',
    headerSubtitle: '#FEE2E2',

    primary: '#991B1B',
    primaryDark: '#7F1D1D',
    primaryLight: '#DC2626',
    primaryUltraLight: '#FEF2F2',

    gold: '#D4AF37',
    goldDark: '#B45309',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#B91C1C',
    saffronLight: '#FECACA',
    saffronDark: '#7F1D1D',

    background: '#FEF2F2',
    surface: '#FFFFFF',
    surfaceVariant: '#FEE2E2',
    surfaceMuted: '#FECACA',
    card: '#FFFFFF',

    text: '#450A0A',
    textMuted: '#7F1D1D',
    textLight: '#991B1B',
    textInverse: '#FFFFFF',

    border: '#FECACA',
    borderLight: '#FEE2E2',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 10. Sunset Amber Gold
const goldTheme: AppTheme = {
  id: 'gold',
  name: 'Sunset Amber Gold',
  thickColor: '#B45309',
  liteColor: '#FFFBEB',
  colors: {
    header: '#B45309',
    headerBorder: '#92400E',
    headerText: '#FFFFFF',
    headerSubtitle: '#FEF3C7',

    primary: '#B45309',
    primaryDark: '#92400E',
    primaryLight: '#F59E0B',
    primaryUltraLight: '#FFFBEB',

    gold: '#D4AF37',
    goldDark: '#92400E',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#D97706',
    saffronLight: '#FDE68A',
    saffronDark: '#92400E',

    background: '#FFFBEB',
    surface: '#FFFFFF',
    surfaceVariant: '#FEF3C7',
    surfaceMuted: '#FDE68A',
    card: '#FFFFFF',

    text: '#451A03',
    textMuted: '#78350F',
    textLight: '#92400E',
    textInverse: '#FFFFFF',

    border: '#FDE68A',
    borderLight: '#FEF3C7',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 11. Devotional Emerald Forest
const emeraldTheme: AppTheme = {
  id: 'emerald',
  name: 'Kadamba Emerald',
  thickColor: '#047857',
  liteColor: '#ECFDF5',
  colors: {
    header: '#047857',
    headerBorder: '#065F46',
    headerText: '#FFFFFF',
    headerSubtitle: '#D1FAE5',

    primary: '#047857',
    primaryDark: '#065F46',
    primaryLight: '#10B981',
    primaryUltraLight: '#ECFDF5',

    gold: '#D4AF37',
    goldDark: '#B45309',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#059669',
    saffronLight: '#A7F3D0',
    saffronDark: '#064E3B',

    background: '#ECFDF5',
    surface: '#FFFFFF',
    surfaceVariant: '#D1FAE5',
    surfaceMuted: '#A7F3D0',
    card: '#FFFFFF',

    text: '#022C22',
    textMuted: '#065F46',
    textLight: '#047857',
    textInverse: '#FFFFFF',

    border: '#A7F3D0',
    borderLight: '#D1FAE5',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 12. Shyama Sundar Midnight Navy
const navyTheme: AppTheme = {
  id: 'navy',
  name: 'Midnight Navy',
  thickColor: '#1E3A8A',
  liteColor: '#EFF6FF',
  colors: {
    header: '#1E3A8A',
    headerBorder: '#172554',
    headerText: '#FFFFFF',
    headerSubtitle: '#DBEAFE',

    primary: '#1E3A8A',
    primaryDark: '#172554',
    primaryLight: '#3B82F6',
    primaryUltraLight: '#EFF6FF',

    gold: '#F59E0B',
    goldDark: '#D97706',
    goldLight: '#FEF3C7',
    goldAccent: '#FCD34D',
    saffron: '#2563EB',
    saffronLight: '#BFDBFE',
    saffronDark: '#1E3A8A',

    background: '#EFF6FF',
    surface: '#FFFFFF',
    surfaceVariant: '#DBEAFE',
    surfaceMuted: '#BFDBFE',
    card: '#FFFFFF',

    text: '#0F172A',
    textMuted: '#1E3A8A',
    textLight: '#2563EB',
    textInverse: '#FFFFFF',

    border: '#BFDBFE',
    borderLight: '#DBEAFE',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 13. Chandan Sandalwood Bronze
const sandalwoodTheme: AppTheme = {
  id: 'sandalwood',
  name: 'Chandan Bronze',
  thickColor: '#854D0E',
  liteColor: '#FEFCE8',
  colors: {
    header: '#854D0E',
    headerBorder: '#713F12',
    headerText: '#FFFFFF',
    headerSubtitle: '#FEF9C3',

    primary: '#854D0E',
    primaryDark: '#713F12',
    primaryLight: '#CA8A04',
    primaryUltraLight: '#FEFCE8',

    gold: '#D4AF37',
    goldDark: '#B45309',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#A16207',
    saffronLight: '#FDE68A',
    saffronDark: '#713F12',

    background: '#FEFCE8',
    surface: '#FFFFFF',
    surfaceVariant: '#FEF9C3',
    surfaceMuted: '#FDE68A',
    card: '#FFFFFF',

    text: '#422006',
    textMuted: '#713F12',
    textLight: '#854D0E',
    textInverse: '#FFFFFF',

    border: '#FDE68A',
    borderLight: '#FEF9C3',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

// 14. Deep Bhakti Violet
const violetTheme: AppTheme = {
  id: 'violet',
  name: 'Deep Bhakti Violet',
  thickColor: '#5B21B6',
  liteColor: '#F5F3FF',
  colors: {
    header: '#5B21B6',
    headerBorder: '#4C1D95',
    headerText: '#FFFFFF',
    headerSubtitle: '#EDE9FE',

    primary: '#5B21B6',
    primaryDark: '#4C1D95',
    primaryLight: '#7C3AED',
    primaryUltraLight: '#F5F3FF',

    gold: '#D4AF37',
    goldDark: '#B45309',
    goldLight: '#FEF3C7',
    goldAccent: '#FEF08A',
    saffron: '#6D28D9',
    saffronLight: '#DDD6FE',
    saffronDark: '#4C1D95',

    background: '#F5F3FF',
    surface: '#FFFFFF',
    surfaceVariant: '#EDE9FE',
    surfaceMuted: '#DDD6FE',
    card: '#FFFFFF',

    text: '#2E1065',
    textMuted: '#581C87',
    textLight: '#6D28D9',
    textInverse: '#FFFFFF',

    border: '#DDD6FE',
    borderLight: '#EDE9FE',

    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#EFF6FF',

    gradeA: '#15803D',
    gradeB: '#2563EB',
    gradeC: '#D97706',
    gradeD: '#EA580C',
    gradeE: '#DC2626',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadows,
};

export const THEME_PALETTES: Record<ThemeId, AppTheme> = {
  orange: orangeTheme,
  blue: blueTheme,
  green: greenTheme,
  yellow: yellowTheme,
  pink: pinkTheme,
  black: blackTheme,
  purple: purpleTheme,
  teal: tealTheme,
  maroon: maroonTheme,
  gold: goldTheme,
  emerald: emeraldTheme,
  navy: navyTheme,
  sandalwood: sandalwoodTheme,
  violet: violetTheme,
};

// Default export for backward compatibility
export const THEME = orangeTheme;
