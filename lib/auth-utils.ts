import crypto from "crypto";

/**
 * Generates the default plain-text password for an employee:
 * Always defaults to "Welcome@123" for new employees.
 */
export function generateDefaultPassword(code: string, name: string): string {
  return "Welcome@123";
}

/**
 * Hashes a plain-text password using SHA-256.
 */
export function hashPassword(password: string): string {
  if (!password) return "";
  return crypto.createHash("sha256").update(password.trim()).digest("hex");
}

/**
 * Verifies an input password against a stored hash or computed default password.
 */
export function verifyPassword(
  inputPassword: string,
  storedHash: string | undefined,
  code: string,
  name: string
): boolean {
  if (!inputPassword) return false;
  const inputTrimmed = inputPassword.trim();
  const inputHash = hashPassword(inputTrimmed);

  // If a custom/hashed password exists in DB, strictly verify ONLY against storedHash
  if (storedHash && storedHash.trim() !== "") {
    return inputHash === storedHash;
  }

  // Fallback to default computed password ONLY if no passwordHash exists in DB
  const expectedPlain = generateDefaultPassword(code, name);
  const expectedHash = hashPassword(expectedPlain);
  if (inputHash === expectedHash) {
    return true;
  }

  if (inputTrimmed.toLowerCase() === expectedPlain.toLowerCase()) {
    return true;
  }

  return false;
}
