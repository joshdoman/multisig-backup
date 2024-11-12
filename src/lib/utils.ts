import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert base64 string to Uint8Array
export const base64ToUint8Array = (base64: string) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

// Convert Uint8Array to base64 string, stripped of padding
export const uint8ArrayToBase64 = (arr: Uint8Array) => btoa(String.fromCharCode.apply(null, Array.from(arr))).replace(/=/g, '');

// Convert hex string to Uint8Array
export const hexToUint8Array = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);

// Convert Uint8Array to hex string
export const uint8ArrayToHex = (uint8: Uint8Array) => Array.from(uint8).map(byte => byte.toString(16).padStart(2, '0')).join('');

// Joins an array of Uint8Arrays
export const joinUint8Arrays = (arrays: Uint8Array[]) => arrays.reduce((result, arr) => {
  const newResult = new Uint8Array(result.length + arr.length);
  newResult.set(result);
  newResult.set(arr, result.length);
  return newResult;
}, new Uint8Array());

// Convert number to Uint8Array
export const numberToUint8Array = (number: number) => Uint8Array.from(Array(Math.ceil(Math.log2(number + 1) / 8)), (_, i) => (number >> (8 * (Math.ceil(Math.log2(number + 1) / 8) - i - 1))) & 0xFF);

// Hash Uint8Array using SHA256
export const sha256 = async (data: Uint8Array) => {
  if (!window.isSecureContext) {
    throw new Error('Https required');
  }
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
};

// Generates HKDF-derived 256-bit key from entropy
export const hkdf = async (entropy: Uint8Array) => {
  try {
    const hkdfKey = await crypto.subtle.importKey(
      'raw',
      entropy,
      { name: 'HKDF' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        salt: new ArrayBuffer(0),
        info: new ArrayBuffer(0),
        hash: 'SHA-256',
      },
      hkdfKey,
      256
    );

    return new Uint8Array(derivedBits);
  } catch (err) {
    throw new Error('Failed to derive key: ' + ((err as Error)?.message || "unknown error"));
  }
}