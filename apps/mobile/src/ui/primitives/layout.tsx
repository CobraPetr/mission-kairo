import { type PropsWithChildren, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme/tokens';

type ScreenProps = PropsWithChildren<{
  footer?: ReactNode;
  scroll?: boolean;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
  testID?: string;
}>;

export function Screen({ children, footer, scroll = false, scrollProps, testID }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      {...scrollProps}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  return (
    <View style={styles.screen} testID={testID}>
      {content}
      {footer}
    </View>
  );
}

type SafeScreenProps = ScreenProps & {
  edges?: Edge[];
};

export function SafeScreen({ edges = ['top', 'left', 'right'], ...props }: SafeScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <Screen {...props} />
    </SafeAreaView>
  );
}

type StackProps = ViewProps & {
  gap?: keyof typeof spacing;
};

export function Stack({ gap = 'x4', style, ...props }: StackProps) {
  return <View style={[styles.stack, { gap: spacing[gap] }, style]} {...props} />;
}

type InlineProps = ViewProps & {
  align?: ViewStyle['alignItems'];
  gap?: keyof typeof spacing;
  justify?: ViewStyle['justifyContent'];
};

export function Inline({
  align = 'center',
  gap = 'x3',
  justify = 'flex-start',
  style,
  ...props
}: InlineProps) {
  return (
    <View
      style={[
        styles.inline,
        { alignItems: align, gap: spacing[gap], justifyContent: justify },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
  },
  scrollContent: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    minHeight: '100%',
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing.x10,
  },
  stack: {
    flexDirection: 'column',
  },
  inline: {
    flexDirection: 'row',
  },
});
