import bcrypt from 'bcryptjs';

/**
 * Standard salt rounds used for bcrypt hashing in the application.
 * 10 rounds provide strong security while maintaining excellent client performance.
 */
export const SALT_ROUNDS = 10;

/**
 * Regex pattern to identify valid bcrypt hash strings ($2a$, $2b$, $2y$, $2x$).
 */
const BCRYPT_REGEX = /^\$2[abyx]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * Checks if a given string is already a valid bcrypt hash.
 *
 * @param str The string to inspect
 * @returns True if the string is formatted as a bcrypt hash
 */
export const isHashedPassword = (str?: string | null): boolean => {
  if (!str || typeof str !== 'string') return false;
  return BCRYPT_REGEX.test(str.trim());
};

/**
 * Asynchronously hashes a plain-text password using bcrypt-js with salt.
 *
 * @param plainPassword The plain-text password to hash
 * @param saltRounds Optional custom salt rounds (defaults to 10)
 * @returns Promise resolving to the secure bcrypt hash string
 */
export const hashPassword = async (
  plainPassword: string,
  saltRounds: number = SALT_ROUNDS
): Promise<string> => {
  if (!plainPassword) {
    throw new Error('Password string cannot be empty for hashing.');
  }

  // If already hashed, return as-is to avoid double hashing
  if (isHashedPassword(plainPassword)) {
    return plainPassword.trim();
  }

  return await bcrypt.hash(plainPassword, saltRounds);
};

/**
 * Synchronous version of hashPassword for instantaneous initialization or sync routines.
 *
 * @param plainPassword The plain-text password to hash
 * @param saltRounds Optional custom salt rounds (defaults to 10)
 * @returns Secure bcrypt hash string
 */
export const hashPasswordSync = (
  plainPassword: string,
  saltRounds: number = SALT_ROUNDS
): string => {
  if (!plainPassword) {
    throw new Error('Password string cannot be empty for hashing.');
  }

  // If already hashed, return as-is
  if (isHashedPassword(plainPassword)) {
    return plainPassword.trim();
  }

  return bcrypt.hashSync(plainPassword, saltRounds);
};

/**
 * Asynchronously verifies if a plain-text password matches a bcrypt hash or legacy string.
 * Supports transparent backward-compatibility with seamless upgrade.
 *
 * @param plainPassword The candidate plain-text password entered by user
 * @param storedHashOrPlain The stored password (either bcrypt hash or legacy plain text)
 * @returns Promise resolving to true if passwords match, false otherwise
 */
export const comparePassword = async (
  plainPassword: string,
  storedHashOrPlain?: string | null
): Promise<boolean> => {
  if (!plainPassword || !storedHashOrPlain) {
    return false;
  }

  const cleanCandidate = plainPassword.trim();
  const cleanStored = storedHashOrPlain.trim();

  // 1. If stored value is a standard bcrypt hash, use bcrypt.compare
  if (isHashedPassword(cleanStored)) {
    try {
      return await bcrypt.compare(cleanCandidate, cleanStored);
    } catch (err) {
      console.warn('bcrypt compare error:', err);
      return false;
    }
  }

  // 2. Legacy fallback: Direct string comparison for migration transition
  return cleanCandidate === cleanStored;
};

/**
 * Synchronous version of comparePassword.
 *
 * @param plainPassword The candidate plain-text password entered by user
 * @param storedHashOrPlain The stored password (either bcrypt hash or legacy plain text)
 * @returns True if passwords match, false otherwise
 */
export const comparePasswordSync = (
  plainPassword: string,
  storedHashOrPlain?: string | null
): boolean => {
  if (!plainPassword || !storedHashOrPlain) {
    return false;
  }

  const cleanCandidate = plainPassword.trim();
  const cleanStored = storedHashOrPlain.trim();

  if (isHashedPassword(cleanStored)) {
    try {
      return bcrypt.compareSync(cleanCandidate, cleanStored);
    } catch (err) {
      console.warn('bcrypt compareSync error:', err);
      return false;
    }
  }

  return cleanCandidate === cleanStored;
};

/**
 * Utility helper to ensure any given user object has its password safely hashed.
 *
 * @param password Raw password or hash
 * @returns Bcrypt hashed string
 */
export const ensureHashedPassword = (password: string): string => {
  if (!password) return hashPasswordSync('admin123');
  if (isHashedPassword(password)) return password.trim();
  return hashPasswordSync(password.trim());
};
