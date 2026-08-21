const CAPITAL_A = 0x1d670
const LOWERCASE_A = 0x1d68a
const DIGIT_ZERO = 0x1d7f6

export function toFancyMono(value: string) {
  return [...value]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0

      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(CAPITAL_A + code - 65)
      }

      if (code >= 97 && code <= 122) {
        return String.fromCodePoint(LOWERCASE_A + code - 97)
      }

      if (code >= 48 && code <= 57) {
        return String.fromCodePoint(DIGIT_ZERO + code - 48)
      }

      return character
    })
    .join('')
}
