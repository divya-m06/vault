/**
 * Calculate password strength based on length and character variety.
 * 
 * Rules:
 * - Passwords under 8 characters are always Weak
 * - Character variety (lowercase, uppercase, numbers, special) contributes to strength
 * - Length is an important factor: very short passwords with all character types are Good, not Strong
 * - Strong requires both sufficient length (12+ chars) and good character variety (all 4 types)
 * 
 * Returns: { level: "Weak" | "Fair" | "Good" | "Strong", score: 1 | 2 | 3 | 4 }
 * 
 * Examples:
 * - "abc" → Weak
 * - "Ab1!" → Weak (too short despite variety)
 * - "password" → Weak (no variety)
 * - "password123" → Fair (8+ chars, 2 char types)
 * - "Hello123" → Good (8+ chars, 3 char types)
 * - "H3llo!xP9#qL2" → Strong (12+ chars, all 4 char types)
 */
export function calculatePasswordStrength(password) {
  if (!password) {
    return { level: 'Weak', score: 1 }
  }

  const length = password.length

  // Rule 1: passwords under 8 characters are always weak
  if (length < 8) {
    return { level: 'Weak', score: 1 }
  }

  // Calculate character variety (number of different character type categories present)
  let charTypes = 0
  if (/[a-z]/.test(password)) charTypes++  // lowercase
  if (/[A-Z]/.test(password)) charTypes++  // uppercase
  if (/[0-9]/.test(password)) charTypes++  // numbers
  if (/[^a-zA-Z0-9]/.test(password)) charTypes++  // special characters

  // Insufficient variety = Weak
  if (charTypes < 2) {
    return { level: 'Weak', score: 1 }
  }

  // 2 character types = Fair
  if (charTypes === 2) {
    return { level: 'Fair', score: 2 }
  }

  // 3 character types = Good
  if (charTypes === 3) {
    return { level: 'Good', score: 3 }
  }

  // 4 character types (all types present)
  if (charTypes === 4) {
    // Strong requires both all character types AND sufficient length (12+)
    if (length >= 12) {
      return { level: 'Strong', score: 4 }
    }
    // Shorter passwords with all 4 types = Good
    return { level: 'Good', score: 3 }
  }

  // Fallback (should not reach)
  return { level: 'Fair', score: 2 }
}

/**
 * Get the Tailwind color class for strength bars based on level
 */
export function getStrengthBarColor(level) {
  switch (level) {
    case 'Weak':
      return 'bg-error'  // Red for weak
    case 'Fair':
      return 'bg-secondary-container'  // Light blue for fair
    case 'Good':
      return 'bg-primary-container'  // Teal for good
    case 'Strong':
      return 'bg-tertiary-container'  // Blue variant for strong
    default:
      return 'bg-outline-variant'  // Gray default
  }
}
