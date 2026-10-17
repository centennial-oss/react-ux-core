/** Strings for TextField's and TextArea's character counter with a recommended length. */
export interface TextFieldMessages {
  /** The counter with a recommended length and no maximum ("42 / 60 recommended"). */
  recommendedCharacterCount: (params: { count: number; recommended: number }) => string;
  /** The counter past the recommended length, without a maximum. */
  overRecommendedLength: (params: { count: number; recommended: number }) => string;
  /** The counter past the recommended length, with a maximum. */
  overRecommendedWithMax: (params: { count: number; max: number; recommended: number }) => string;
  /** Announced once when the text grows past the recommended length. */
  recommendedLengthExceeded: (params: { recommended: number }) => string;
}

/** English defaults of the recommended-length strings. */
export const defaultTextFieldMessages: TextFieldMessages = {
  recommendedCharacterCount: ({ count, recommended }) => `${count} / ${recommended} recommended`,
  overRecommendedLength: ({ count, recommended }) =>
    `${count} / ${recommended}, longer than recommended`,
  overRecommendedWithMax: ({ count, max, recommended }) =>
    `${count} / ${max}, longer than the recommended ${recommended}`,
  recommendedLengthExceeded: ({ recommended }) =>
    `Longer than the recommended ${recommended} characters`,
};
