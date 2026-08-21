export const emotionalQuestions = [
  { id: 'startingNow', prompt: 'Why are you starting now?' },
  { id: 'holdingBack', prompt: 'What keeps you from becoming who you should be?' },
  { id: 'oneYearCost', prompt: 'If nothing changes, where will you be one year from now?' },
  { id: 'brokenPromise', prompt: 'What promise do you keep breaking?' },
  { id: 'dayNinety', prompt: 'At day 90, what must be different?' },
] as const;

export type EmotionalQuestionId = (typeof emotionalQuestions)[number]['id'];
