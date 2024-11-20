import { split } from "shamir-secret-sharing";
import { chacha20, chacha20poly1305 } from "@noble/ciphers/chacha";
import {
  uint8ArrayToBase64,
  joinUint8Arrays,
  numberToUint8Array,
  sha256,
  hkdf,
} from '@/lib/utils';
import { parseDescriptor } from "./parse";

// Returns stripped descriptor concatenated with Base64 encoded encrypted data
export default async function encrypt(descriptor: string) {
  const { multisigs } = parseDescriptor(descriptor);
  const shares = [];
  const data = [];
  const xfpPairHashes = [];
  const allXfps = [];
  const allXpubs = [];
  const secret = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await hkdf(secret);
  for (const { xfps, xpubs, requiredSigs } of multisigs) {
    if (xpubs.length < requiredSigs) {
      throw new Error('Not enough xpubs for required signatures');
    }

    // Hash each unique pair of fingerprints
    xfpPairHashes.push(...await Promise.all(xfps
      .flatMap((a, i) => xfps.slice(i + 1)
      .map(b => sha256(joinUint8Arrays((a < b) ? [a, b] : [b, a]))))));

    if (xpubs.length > 1 && requiredSigs > 1) {
      // Use Shamir's Secret Sharing
      shares.push(...await split(secret, xpubs.length, requiredSigs));
    } else {
      // Single signature case
      shares.push(...xpubs.map(() => secret));
    }

    allXfps.push(...xfps);
    allXpubs.push(...xpubs);
  }

  // Decode each fingerprint followed by each xpub, without version bytes
  const xfpXpubData: Uint8Array[] = [];
  allXfps.forEach(xfp => xfpXpubData.push(xfp));
  allXpubs.forEach(xpub => xfpXpubData.push(xpub.slice(4)));

  // Encrypt xfp and xpub data using entropy-derived 256-bit key
  const encryptedData = chacha20(derivedKey, new Uint8Array(12), joinUint8Arrays(xfpXpubData));

  for (const [i, xpub] of allXpubs.entries()) {
    // Generate unique key by hashing the xpub (excluding the first 4 bytes) with
    // the encrypted data and the share index.
    const key = await sha256(joinUint8Arrays([
      xpub.slice(4),
      encryptedData, 
      numberToUint8Array(i),
    ]));

    // Encrypt each share using zero nonce (this is safe because key reuse can't occur)
    data.push(chacha20poly1305(key, new Uint8Array(12)).encrypt(shares[i]));
  }
  data.push(encryptedData);

  // Append first four bytes of each xfp pair hash
  xfpPairHashes.forEach(hash => data.push(hash.slice(0, 4)));

  // Strip xpub, fingerprint, and checksum from descriptor
  const strippedDescriptor = descriptor
    .replace(/[xyztuvUVYZ]pub[a-zA-Z0-9]{107}\/?/g, "")
    .replace(/\[[a-f0-9]{8}\//g, "[")
    .split('#')[0];

  const encryptedText = strippedDescriptor + uint8ArrayToBase64(joinUint8Arrays(data));
  return { encryptedText, missingXfps: allXfps.length < allXpubs.length };
}