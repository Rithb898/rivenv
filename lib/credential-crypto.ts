import { env } from "cloudflare:workers";

const ENCRYPTION_KEY_VERSION = 1;
const NONCE_LENGTH = 12;

type EncryptionEnv = {
  RIVENV_ENCRYPTION_KEY?: string;
};

export type EncryptedCredential = {
  encryptedValue: string;
  nonce: string;
  encryptionKeyVersion: number;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + chunkSize),
    );
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer as ArrayBuffer;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const rawKey = (env as unknown as EncryptionEnv).RIVENV_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("RIVENV_ENCRYPTION_KEY is not configured.");
  }

  const keyBytes = base64ToBytes(rawKey);

  if (keyBytes.byteLength !== 32) {
    throw new Error(
      "RIVENV_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function getAdditionalData(credentialId: string): Uint8Array {
  return new TextEncoder().encode(`rivenv:credential:${credentialId}`);
}

export async function encryptCredential(
  credentialId: string,
  value: string,
): Promise<EncryptedCredential> {
  const key = await getEncryptionKey();
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  const plaintext = new TextEncoder().encode(value);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(nonce),
      additionalData: toArrayBuffer(getAdditionalData(credentialId)),
    },
    key,
    plaintext,
  );

  return {
    encryptedValue: bytesToBase64(new Uint8Array(encrypted)),
    nonce: bytesToBase64(nonce),
    encryptionKeyVersion: ENCRYPTION_KEY_VERSION,
  };
}

export async function decryptCredential(
  credentialId: string,
  encryptedValue: string,
  nonce: string,
  encryptionKeyVersion: number,
): Promise<string> {
  if (encryptionKeyVersion !== ENCRYPTION_KEY_VERSION) {
    throw new Error(
      `Unsupported encryption key version: ${encryptionKeyVersion}`,
    );
  }

  const key = await getEncryptionKey();

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(base64ToBytes(nonce)),
      additionalData: toArrayBuffer(getAdditionalData(credentialId)),
    },
    key,
    toArrayBuffer(base64ToBytes(encryptedValue)),
  );

  return new TextDecoder().decode(decrypted);
}
