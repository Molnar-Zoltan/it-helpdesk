/**
 * Matches emoji and emoji-adjacent symbols: pictographs, transport/map symbols,
 * flags (regional indicators), dingbats, variation selectors, zero-width joiners,
 * and skin-tone modifiers. Deliberately does NOT match general Unicode letters,
 * so accented/non-Latin names (e.g. "Zoltán", "田中") are unaffected.
 */
const EMOJI_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;

/** Returns true if the string contains any emoji or emoji-related codepoint. */
export function containsEmoji(value: string): boolean {
  return EMOJI_PATTERN.test(value);
}
