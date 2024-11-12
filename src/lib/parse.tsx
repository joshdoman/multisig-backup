import bs58check from 'bs58check';

import { base64ToUint8Array, hexToUint8Array } from './utils';

// Extracts each multisig in the descriptor, including xpubs, xfps, and the number
// of required signatures
export const parseDescriptor = (descriptor: string) => {
  if (descriptor.includes("tr(")) {
    throw new Error('Taproot descriptors not supported yet');
  }

  const taprootPubKeyMatch = descriptor.match(/(?<=tr\()([xyztuvUVYZ]pub[a-zA-Z0-9]{107})(?=,)/g);
  const taprootPubKey = taprootPubKeyMatch ? bs58check.decode(taprootPubKeyMatch[0]) : undefined;

  const multiSigMatch = descriptor.match(/multi(?:_a)?\(([^)]*)\)/g);
  if (!multiSigMatch) {
    throw new Error('Invalid multsig descriptor. Must contain "[sorted]multi[_a](...)".');
  }

  const multisigs = [];
  for (const multisig of multiSigMatch) {
    const submatch = multisig.match(/multi(?:_a)?\((\d+),([^)]+)/);
    if (!submatch) {
      throw new Error('Invalid descriptor format.');
    }
    const requiredSigs = parseInt(submatch[1]);
    const fingerprintRegex = /\[([a-f0-9]{8})\//g;
    const xpubRegex = /([xyztuvUVYZ]pub[a-zA-Z0-9]{107})/g;
    const xfps = [...submatch[2].matchAll(fingerprintRegex)].map(match => hexToUint8Array(match[1]));
    const xpubs = [
      ...submatch[2].matchAll(xpubRegex),
    ].map(m => m[1]).map(bs58check.decode);
    const numXpubs = submatch[2].split(',').length;
    const numXfps = submatch[2].split('[').length - 1;
    multisigs.push({ requiredSigs, xfps, xpubs, numXfps, numXpubs });
  }

  return { taprootPubKey, multisigs };
};

// Extracts stripped descriptor, required signatures, encrypted shares, encrypted data,
// numXfps, numXpubs, and xfp pair hashes from the encrypted text
export const parseEncryptedDescriptor = (encryptedText: string) => {
  // Since the checksum is stripped from the descriptor, the encrypted descriptor
  // always ends with ")" followed by Base64 encoded text
  const parts = encryptedText.match(/(.*\))([A-Za-z0-9+/]*)/);
  if (!parts || parts.length !== 3) {
    throw new Error('Invalid encrypted text');
  }

  const strippedDescriptor = parts[1];
  const encodedData = base64ToUint8Array(parts[2]);
  const { multisigs: strippedMultisigs } = parseDescriptor(strippedDescriptor);
  let totalXpubs = 0;
  let totalXfps = 0;
  let i = 0;
  const groupedEncryptedShares = [];
  for (const { requiredSigs, numXfps, numXpubs } of strippedMultisigs) {
    if (requiredSigs === 0 || numXpubs === 0) {
      throw new Error('Invalid encrypted text');
    }
    totalXpubs += numXpubs;
    totalXfps += numXfps;

    const encryptedShareBytes = numXpubs > 1 && requiredSigs > 1 ? 33 : 32;
    if (i + encryptedShareBytes * numXpubs > encodedData.length) {
      throw new Error('Invalid encrypted text');
    }

    const allEncryptedShares = encodedData.slice(i, i + encryptedShareBytes * numXpubs);
    const encryptedShares = Array.from({ length: numXpubs }, (_, j) => 
      allEncryptedShares.slice(j * encryptedShareBytes, (j + 1) * encryptedShareBytes)
    );

    i = encryptedShareBytes * numXpubs;
    groupedEncryptedShares.push({
      encryptedShares,
      requiredSigs
    })
  }

  // Encrypted bytes: 4 bytes per xfp, 74 bytes per xpub
  const encryptedBytes = 4 * totalXfps + 74 * totalXpubs;
  if (i + encryptedBytes > encodedData.length) {
    throw new Error('Invalid encrypted text');
  }
  const encryptedData = encodedData.slice(i, i + encryptedBytes);

  // [Optional] 4 byte xfp pair hashes
  const numXfpPairs = totalXfps * (totalXfps - 1) / 2;
  const xfpPairHashes = (i + encryptedBytes + 4 * numXfpPairs <= encodedData.length) ?
    encodedData.slice(i + encryptedBytes, i + encryptedBytes + 4 * numXfpPairs) : [];

  return {
    strippedDescriptor,
    groupedEncryptedShares,
    encryptedData,
    xfpPairHashes,
    totalXfps,
    totalXpubs,
  };
}