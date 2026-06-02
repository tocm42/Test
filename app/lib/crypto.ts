// Client-side encryption so the cloud backend only ever stores ciphertext.
// The encryption key is derived from the family PIN (PBKDF2), and data is
// sealed with AES-GCM. Without the PIN, the stored blob is meaningless — which
// is what lets us keep the database's public anon key in the (public) client.

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

interface EncBlob {
  v: 1;
  salt: string;
  iv: string;
  ct: string;
}

/** Encrypt any JSON-serializable value into a self-describing string. */
export async function encryptJSON(value: unknown, pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(JSON.stringify(value)),
  );
  const blob: EncBlob = {
    v: 1,
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
    ct: bufToBase64(ct),
  };
  return JSON.stringify(blob);
}

/** Decrypt a string produced by encryptJSON. Throws if the PIN is wrong. */
export async function decryptJSON<T>(payload: string, pin: string): Promise<T> {
  const blob = JSON.parse(payload) as EncBlob;
  const key = await deriveKey(pin, base64ToBytes(blob.salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(blob.iv) },
    key,
    base64ToBytes(blob.ct),
  );
  return JSON.parse(textDecoder.decode(plaintext)) as T;
}
