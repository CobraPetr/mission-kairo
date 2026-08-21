import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';

import { emotionalAnswerSchema } from '@/features/onboarding/onboarding-schema';
import { useOnboarding } from '@/features/onboarding/onboarding-provider';
import { emotionalQuestions } from '@/features/onboarding/questions';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';
import { colors, fontFamilies, radii, spacing } from '@/theme/tokens';
import {
  AppText,
  Button,
  Inline,
  MonoLabel,
  SafeScreen,
  Stack,
  TypewriterText,
} from '@/ui/primitives';

const MIN_INPUT_HEIGHT = 48;
const MAX_INPUT_HEIGHT = 180;
const webInputFocusReset = Platform.select({
  web: {
    boxShadow: 'none',
    outline: 'none',
  } as unknown as TextStyle,
});

export default function EmotionalQuestionsScreen() {
  const { draft, hydrated, setEmotionalAnswer, setEmotionalIndex, setSection } = useOnboarding();
  const reduceMotion = useReducedMotionPreference();
  const inputRef = useRef<TextInput>(null);
  const [transition] = useState(() => new Animated.Value(0));
  const [questionTyped, setQuestionTyped] = useState(false);
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [error, setError] = useState<string>();
  const [transitioning, setTransitioning] = useState(false);

  const index = draft.emotionalIndex;
  const question = emotionalQuestions[index];
  const answer = draft.emotionalAnswers[question.id];
  const handleQuestionTyped = useCallback(() => setQuestionTyped(true), []);

  useEffect(() => {
    if (questionTyped) {
      inputRef.current?.focus();
    }
  }, [questionTyped]);

  useEffect(() => {
    if (!hydrated) return;
    if (reduceMotion) {
      transition.setValue(1);
      return;
    }
    const entrance = Animated.timing(transition, {
      duration: 420,
      easing: Easing.out(Easing.exp),
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    });
    entrance.start();
    return () => entrance.stop();
  }, [hydrated, reduceMotion, transition]);

  if (!hydrated) {
    return null;
  }

  function moveToNextQuestion() {
    setQuestionTyped(false);
    setInputHeight(MIN_INPUT_HEIGHT);
    setError(undefined);
    setEmotionalIndex(index + 1);

    if (reduceMotion) {
      transition.setValue(1);
      setTransitioning(false);
      return;
    }

    transition.setValue(0);
    requestAnimationFrame(() => {
      Animated.timing(transition, {
        duration: 360,
        easing: Easing.out(Easing.exp),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setTransitioning(false));
    });
  }

  function confirmAnswer() {
    const result = emotionalAnswerSchema.safeParse(answer);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Write your response before continuing.');
      return;
    }

    setEmotionalAnswer(question.id, result.data);
    if (index === emotionalQuestions.length - 1) {
      setSection('identity');
      router.replace('/(onboarding)/identity');
      return;
    }

    setTransitioning(true);
    if (reduceMotion) {
      moveToNextQuestion();
      return;
    }

    Animated.timing(transition, {
      duration: 150,
      easing: Easing.in(Easing.quad),
      toValue: 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start(moveToNextQuestion);
  }

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={8}
        style={styles.keyboard}
      >
        <Stack style={styles.page}>
          <Inline gap="x1" style={styles.progress}>
            {emotionalQuestions.map((item, progressIndex) => (
              <View
                key={item.id}
                style={[
                  styles.progressSegment,
                  progressIndex <= index && styles.progressSegmentActive,
                ]}
              />
            ))}
          </Inline>

          <Animated.View
            style={[
              styles.questionStage,
              {
                opacity: transition,
                transform: [
                  {
                    translateY: transition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.question}>
              <TypewriterText
                key={question.id}
                color="text"
                onComplete={handleQuestionTyped}
                speed={31}
                style={styles.questionText}
                text={question.prompt}
                variant="body"
              />
            </View>

            <Stack gap="x2" style={[styles.responseZone, { minHeight: inputHeight + 96 }]}>
              <MonoLabel>RESPONSE CHANNEL</MonoLabel>
              {error ? (
                <AppText accessibilityRole="alert" color="danger" variant="caption">
                  {error}
                </AppText>
              ) : null}
              <Inline align="flex-end" gap="x3" style={styles.responseRow}>
                <MonoLabel color="accent" size="medium" style={styles.prompt}>
                  &gt;
                </MonoLabel>
                <TextInput
                  ref={inputRef}
                  accessibilityLabel="Your answer"
                  editable={!transitioning}
                  maxLength={360}
                  multiline
                  onChangeText={(value) => setEmotionalAnswer(question.id, value)}
                  onContentSizeChange={(event) =>
                    setInputHeight(
                      Math.min(
                        Math.max(event.nativeEvent.contentSize.height, MIN_INPUT_HEIGHT),
                        MAX_INPUT_HEIGHT,
                      ),
                    )
                  }
                  placeholder="ENTER RESPONSE..."
                  placeholderTextColor={colors.textDim}
                  selectionColor={colors.accent}
                  style={[styles.input, webInputFocusReset, { height: inputHeight }]}
                  textAlignVertical="top"
                  value={answer}
                />
                <Button
                  disabled={!answer.trim() || transitioning}
                  label={index === emotionalQuestions.length - 1 ? 'Lock in' : 'Continue'}
                  onPress={confirmAnswer}
                  style={styles.continueButton}
                  variant="secondary"
                />
              </Inline>
            </Stack>
          </Animated.View>
        </Stack>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingTop: spacing.x6,
    paddingBottom: spacing.x3,
  },
  progress: {
    width: '100%',
  },
  progressSegment: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
  },
  progressSegmentActive: {
    backgroundColor: colors.accent,
  },
  questionStage: {
    flex: 1,
  },
  question: {
    flex: 1,
    paddingTop: spacing.x12,
  },
  questionText: {
    maxWidth: 500,
    fontFamily: fontFamilies.mono,
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  responseZone: {
    justifyContent: 'flex-end',
    paddingTop: spacing.x4,
  },
  responseRow: {
    minHeight: 56,
    paddingVertical: spacing.x2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  prompt: {
    paddingBottom: 13,
  },
  input: {
    flex: 1,
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderWidth: 0,
    borderRadius: radii.hairline,
    color: colors.text,
    fontFamily: fontFamilies.mono,
    fontSize: 15,
    lineHeight: 22,
  },
  continueButton: {
    width: 118,
    minHeight: 48,
  },
});
