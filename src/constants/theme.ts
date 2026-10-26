/**
 * TasteRank design tokens.
 * Dark charcoal surfaces with a single Ice Blue accent.
 *
 * Change `accent` and its related tokens here to re-theme the whole app.
 */

export const colors = {
  bg: '#101318',
  bgDeep: '#0B0E12',
  surface: '#171C23',
  surfaceAlt: '#1D232C',
  surfaceHi: '#242C37',
  border: '#28303B',
  borderStrong: '#3A4553',

  text: '#F4F7FA',
  textMuted: '#98A3B2',
  textFaint: '#6B7583',

  accent: '#7DD3FC',
  accentBright: '#BAE8FF',
  accentSoft: 'rgba(125, 211, 252, 0.14)',
  accentWash: 'rgba(125, 211, 252, 0.08)',
  accentBorder: 'rgba(125, 211, 252, 0.38)',
  accentLine: 'rgba(125, 211, 252, 0.55)',
  accentDim: '#4EA8D6',
  accentDeep: '#12384F',
  onAccent: '#081521',

  danger: '#FF6B6B',
  dangerSoft: 'rgba(255, 107, 107, 0.14)',
  dangerBorder: 'rgba(255, 107, 107, 0.4)',

  gold: '#FFD166',
  overlay: 'rgba(8, 10, 13, 0.72)',
} as const;

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 34,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.5,
    color: colors.text,
  },
  heading: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  bodyStrong: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  button: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
    color: colors.text,
  },
  buttonSmall: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: colors.text,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    color: colors.textMuted,
  },
  numeric: {
    fontFamily: fonts.bold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.8,
    color: colors.text,
  },
} as const;
