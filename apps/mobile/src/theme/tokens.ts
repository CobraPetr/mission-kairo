export const colors = {
  black: '#000000',
  canvas: '#010204',
  surface: '#050A0F',
  surfaceRaised: '#09111A',
  navy: '#00275A',
  border: '#17314C',
  borderStrong: '#28587C',
  frost: '#DCE4F2',
  text: '#DCE4F2',
  textMuted: '#8797AA',
  textDim: '#53667A',
  accent: '#65AFE3',
  accentMuted: '#234B6A',
  accentWash: 'rgba(101, 175, 227, 0.10)',
  success: '#75C5A4',
  warning: '#E3B86B',
  danger: '#DF7B82',
  transparent: 'transparent',
} as const;

export const fontFamilies = {
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemibold: 'IBMPlexMono_600SemiBold',
} as const;

export const spacing = {
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x5: 20,
  x6: 24,
  x8: 32,
  x10: 40,
  x12: 48,
  x16: 64,
} as const;

export const radii = {
  hairline: 2,
  control: 6,
  panel: 10,
  sheet: 16,
  full: 999,
} as const;

export const motion = {
  fast: 120,
  standard: 220,
  deliberate: 360,
} as const;

export const layout = {
  gutter: 20,
  maxContentWidth: 520,
  minTouchTarget: 48,
  tabBarHeight: 78,
} as const;
