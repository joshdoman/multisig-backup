// Source: https://github.com/bitcoinerlab/descriptors/blob/main/src/checksum.ts

// Converted to Javascript by Jose-Luis Landabaso, 2023 - https://bitcoinerlab.com
// Source: https://github.com/bitcoin/bitcoin/blob/master/src/script/descriptor.cpp
// Distributed under the MIT software license
const PolyMod = (c: bigint, val: bigint): bigint => {
  const c0: bigint = c >> 35n;
  c = ((c & 0x7ffffffffn) << 5n) ^ val;
  if (c0 & 1n) c ^= 0xf5dee51989n;
  if (c0 & 2n) c ^= 0xa9fdca3312n;
  if (c0 & 4n) c ^= 0x1bab10e32dn;
  if (c0 & 8n) c ^= 0x3706b1677an;
  if (c0 & 16n) c ^= 0x644d626ffdn;
  return c;
};

export const CHECKSUM_CHARSET: string = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

/**
 * Implements the Bitcoin descriptor's checksum algorithm described in
 * {@link https://github.com/bitcoin/bitcoin/blob/master/src/script/descriptor.cpp}
 */
export const DescriptorChecksum = (span: string): string => {
  const INPUT_CHARSET =
    '0123456789()[],\'/*abcdefgh@:$%{}IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~ijklmnopqrstuvwxyzABCDEFGH`#"\\ ';

  let c: bigint = 1n;
  let cls: bigint = 0n;
  let clscount: bigint = 0n;
  for (const ch of span as string) {
    const pos: bigint = BigInt(INPUT_CHARSET.indexOf(ch));
    if (pos === -1n) return '';
    c = PolyMod(c, pos & 31n);
    cls = cls * 3n + (pos >> 5n);
    if (++clscount === 3n) {
      c = PolyMod(c, cls);
      cls = 0n;
      clscount = 0n;
    }
  }
  if (clscount > 0n) c = PolyMod(c, cls);
  for (let j: number = 0; j < 8; ++j) c = PolyMod(c, 0n);
  c ^= 1n;

  let ret: string = '';
  for (let j = 0; j < 8; ++j) {
    const index = (c >> (5n * (7n - BigInt(j)))) & 31n;
    if (index < 0 || index > Number.MAX_SAFE_INTEGER)
      throw new Error(
        `Error: could not compute checksum, invalid index ${index}`
      );
    ret += CHECKSUM_CHARSET[Number(index)];
  }
  return ret;
};