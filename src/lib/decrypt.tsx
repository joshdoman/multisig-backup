import bs58check from 'bs58check';
import { chacha20, chacha20poly1305 } from '@noble/ciphers/chacha';
import { combine } from 'shamir-secret-sharing';

import {
  uint8ArrayToHex,
  hexToUint8Array,
  joinUint8Arrays,
  numberToUint8Array,
  sha256,
  hkdf,
} from '@/lib/utils';
import { parseEncryptedDescriptor } from "./parse";

// Returns the number of requiredShares, the number of decryptedShares, and the
// decrypted descriptor, if successful.
export default async function decrypt(encryptedText: string, decryptXpubs: string[]) {
  const {
    strippedDescriptor,
    groupedEncryptedShares,
    encryptedData,
    totalXfps,
    totalXpubs,
  } = parseEncryptedDescriptor(encryptedText);

  // Decode provided xpubs
  const decodedXpubs = [];
  let versionBytes = hexToUint8Array('0488b21e'); // 'xpub'
  for (const xpub of decryptXpubs) {
    if (!xpub) continue;
    const decodedXpub = bs58check.decode(xpub);
    decodedXpubs.push(decodedXpub);
    versionBytes = decodedXpub.slice(0, 4); // set output version bytes
  }

  let result = undefined;
  let shareIndex = 0;
  let requiredShares = 0;
  let decryptedShares = 0;
  for (const { encryptedShares, requiredSigs } of groupedEncryptedShares) {
    requiredShares = requiredSigs;

    // Try to decrypt shares with xpub hashes
    const newDecryptedShares = [];
    for (const encryptedShare of encryptedShares) {
      for (const xpub of decodedXpubs) {
        try {
          // Generate unique key by hashing the xpub (excluding the first 4 bytes) 
          // with the encrypted data and the share index.
          const key = await sha256(joinUint8Arrays([
            xpub.slice(4),
            encryptedData,
            numberToUint8Array(shareIndex),
          ]));

          // Decrypt share using zero nonce
          const decryptedShare = chacha20poly1305(key, new Uint8Array(12)).decrypt(encryptedShare);
          newDecryptedShares.push(decryptedShare);
        } catch {
          continue;
        }
      }
      shareIndex++;
    }

    decryptedShares = newDecryptedShares.length;

    if (newDecryptedShares.length >= requiredSigs) {
      // We have enough shares to reconstruct the secret
      const secret = requiredSigs > 1 ? await combine(newDecryptedShares) : newDecryptedShares[0];
      const derivedKey = await hkdf(secret);
      result = chacha20(derivedKey, new Uint8Array(12), encryptedData);
    }
  }

  const xfps: string[] = [];
  const xpubs: string[] = [];
  if (result) {
    for (let i = 0; i < totalXfps; i++) {
      xfps.push(uint8ArrayToHex(result.slice(4 * i, 4 * i + 4)));
    }
    for (let i = 0; i < totalXpubs; i++) {
      const xpubData = joinUint8Arrays([versionBytes, result.slice(4 * totalXfps + 74 * i, 4 * totalXfps + 74 * (i + 1))]);
      xpubs.push(bs58check.encode(xpubData));
    }
  }

  let descriptor = undefined;
  if (xpubs.length > 0) {
    const xfpRegex = /\[(?![\da-f]{8})/g;
    const xpubRegex = /([,\]])([\d,)<])/g;
    let xfpIndex = 0;
    let xpubIndex = 0;
    descriptor = strippedDescriptor.replace(xpubRegex, (match, p1, p2) => {
      if (xpubIndex < xpubs.length) {
        const separator = (!isNaN(p2) || p2 == '<') ? '/' : '';
        return `${p1}${xpubs[xpubIndex++]}${separator}${p2}`;
      }
      return match;
    }).replace(xfpRegex, (match) => {
      if (xfpIndex < xfps.length) {
        return `[${xfps[xfpIndex++]}/`;
      }
      return match;
    });
  }

  return { descriptor, decryptedShares, requiredShares };
}