import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: undefined,
  android: undefined,
  default: undefined,
});

export const typography = {
  fontFamily,
  h1: {
    fontSize: 28,
    fontWeight: '800' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  h4: {
    fontSize: 17,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0,
    lineHeight: 16,
  },
  pill: {
    fontSize: 13,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
  },
};
