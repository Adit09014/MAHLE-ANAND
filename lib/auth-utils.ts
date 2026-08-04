import crypto from "crypto";

/**
 * Generates the default plain-text password for an employee:
 * Last 4 digits/characters of Employee Code + First 4 letters of Name.
 * Example: M1003 + "Vikram Singh" => "1003Vikr"
 */
export function generateDefaultPassword(code: string, name: string): string {
  const cleanCode = (code || "").trim();
  const codePart = cleanCode.length >= 4 ? cleanCode.slice(-4) : cleanCode;

  const cleanName = (name || "").replace(/[^a-zA-Z]/g, "");
  const namePart = cleanName.length >= 4 ? cleanName.slice(0, 4) : cleanName;

  return `${codePart}${namePart}`;
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
