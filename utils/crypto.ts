
// Simple XOR cipher for obfuscation. This is not cryptographically secure but prevents
// casual reading of the data stored in localStorage.
const xorStrings = (a: string, b: string): string => {
  let result = '';
  // Ensure the key is not empty to avoid division by zero
  if (b.length === 0) return a;
  for (let i = 0; i < a.length; i++) {
    result += String.fromCharCode(a.charCodeAt(i) ^ b.charCodeAt(i % b.length));
  }
  return result;
};

/**
 * "Encrypts" data by XORing it with the PIN and then Base64 encoding it.
 * @param data The user data object.
 * @param pin The session PIN.
 * @returns An encrypted string.
 */
export const encryptData = (data: object, pin: string): string => {
  if (!pin) return ''; // Should not happen in normal flow
  const jsonString = JSON.stringify(data);
  const xorred = xorStrings(jsonString, pin);
  return btoa(unescape(encodeURIComponent(xorred))); // Handle UTF-8 characters properly
};

/**
 * "Decrypts" data by Base64 decoding it and then XORing it with the PIN.
 * @param encryptedData The encrypted string from localStorage.
 * @param pin The session PIN.
 * @returns The user data object or null if decryption fails.
 */
export const decryptData = (encryptedData: string, pin: string): object | null => {
  if (!pin || !encryptedData) return null;
  try {
    const fromBase64 = decodeURIComponent(escape(atob(encryptedData)));
    const xorred = xorStrings(fromBase64, pin);
    return JSON.parse(xorred);
  } catch (e) {
    console.error("Decryption failed. This could be due to a wrong PIN or corrupted data.", e);
    return null;
  }
};

/**
 * Hashes a PIN using the Web Crypto API (SHA-256) for secure storage.
 * @param pin The PIN to hash.
 * @returns A hex string representation of the hash.
 */
export const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
