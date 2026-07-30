/**
 * RFC 5321 §4.5.3.1.3 caps the total length of a reverse-path/forward-path
 * (i.e. an email address) at 254 characters. Used for frontend maxlength
 * hints and backend @MaxLength() checks.
 *
 * Deliberately no shared email *format* regex here: format validity is kept
 * backend-authoritative via class-validator's IsEmail (validator.js), which
 * is far more thorough than a hand-rolled pattern. Duplicating it here would
 * risk the two falling out of sync. The frontend can rely on
 * `<input type="email">` plus this length cap for a good-enough live check,
 * and defer to the backend's 400 response for the authoritative answer.
 */
export const EMAIL_MAX_LENGTH = 254;
