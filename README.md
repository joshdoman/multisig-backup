# multisig-backup

A tool to encrypt and inscribe a `k-of-n` multisig descriptor on Bitcoin, so that `k` seeds is always enough to recover the funds.

This tool provides an easy way for someone to encrypt and inscribe their `k-of-n` descriptor, so it can always be recovered with `k` seeds. All sensitive data (master fingerprints, xpubs) is stripped from the descriptor and encrypted such that it can’t be decrypted without `k` of the xpubs.

To recover, the user simply inputs two master fingerprints, which are hashed and used to find the encrypted descriptor onchain. An open source indexer makes this near instantaneous (see [multisig-recovery](https://github.com/joshdoman/multisig-recovery)). Once the user has the encrypted descriptor, they use the derivation paths in the descriptor template to derive `k` xpubs. The tool then decrypts the encrypted data and reassembles the original descriptor. For ease of use, Ledger and Trezor are integrated into the recovery process.

An encrypted 2-of-3 descriptor is ~0.5kb of data, which costs ~400vb to inscribe, or ~800 sats at 2 sats/vb. This is equivalent to the cost of ~4 taproot transactions.

## The Problem

A 2-of-3 multisig can be a fantastic way to secure one's Bitcoin, but the user experience today needs improvement. Namely, users must save the multisig descriptor, in addition to their seeds, to prevent loss of funds in the event that one of their seeds is lost. This descriptor contains all three public keys, without which the funds cannot be spent.

This requirement is not intuitive and runs counter to the "2-of-3" moniker, which seems to imply that only two keys are necessary to recover one's funds. Users that forget to back up their descriptor or do so on a thumb drive or device liable to degradation risk losing access to their funds forever.

The goal of this project is to realize the "2-of-3" assumption, so that multisigs operate the way users expect them to. A naive solution is to inscribe the descriptor publicly on Bitcoin. This gives the descriptor the same data availability assumptions as Bitcoin itself, but it exposes the user's wallet activity to the world. This project aims to solve this problem by encrypting the sensitive data in the descriptor such that it can only be recovered with the threshold number of keys.

## How it works

### Encryption
This tool encrypts a `k-of-n` multisig descriptor using the following steps:
1. The master fingerprints (xfps) and extended public keys (xpubs) are extracted from the descriptor and encrypted with ChaCha20 using a random seed.
2. The seed is split into `n` shares using the [shamir secret sharing algorithm](https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing) so that `k` shares is enough to recover the seed.
3. Each share is encrypted with ChaCha20-Poly1305, using the SHA256 hash of the corresponding xpub, the encrypted data in (1), and the share index as the key.
4. The encrypted data is Base64 encoded, concatenated with the stripped descriptor, and inscribed publicly on Bitcoin, ensuring that the descriptor can always be recovered as long as the user has `k` keys.

In addition, each pair of master fingerprints is hashed with SHA256, and the first four bytes are appended to the final output. This data is not necessary for decryption, but it preserves user privacy and improves the user experience, by making it easy to index and recover the encrypted data.

#### Additional details
1. The random seed is derived from 128 bits of entropy using HKDF without a salt. The shamir shares are generated from this 128 bits of entropy.
2. A zero nonce is used when encrypting the plaintext and the shamir shares. This is safe because each key is guaranteed to be unique, even if an xpub appears multiple times in the descriptor or the descriptor is encrypted more than once.
3. In the plaintext of the encrypted data, the xfps appear first followed by the xpubs, in the order that they appear in the descriptor.

### Recovery
To recover the encrypted descriptor, the user inputs two master fingerprints (xfps) and presses "Recover." This sends the first four bytes of the SHA256 hash of the sorted xfps to a server, which returns the `inscriptionIds` matching this xfp pair. This server continuously indexes the blockchain, using the open source indexer available at [multisig-recovery](https://github.com/joshdoman/multisig-recovery). The encrypted descriptor(s) are then fetched from an `ord` server. The default is [ordinals.com](https://ordinals.com).

### Decryption
Decryption occurs through the following steps:
1. The user inputs the encrypted descriptor and at least `k` xpubs. The user derives the xpubs using their `k` seeds and the derivation paths in the descriptor template.
2. The threshold `k` and key count `n` are extracted from the stripped descriptor.
3. The encrypted shamir shares and encrypted data are extracted from the encrypted descriptor, using the descriptor template to calculate the byte count of each.
4. Each share is optimistically decrypted using the provided xpubs.
5. If `k` shares are decrypted, they are combined to recover the seed, and the seed is used to decrypt the list of xfps and xpubs.
6. Finally, the xfps and xpubs are inserted back into the descriptor in their original order.

## Getting the descriptor

Several multisig wallets natively support output descriptors (see the [full list](https://outputdescriptors.org/)). To create a new multisig wallet, or to import an existing one from a non-compatible wallet, we recommend using [Sparrow](https://sparrowwallet.com/). Use the following steps to obtain the descriptor:

### Sparrow
1.  Create a new multisig or go to `File` -> `Import Wallet` to import your existing wallet.
2.  Go to `Settings` -> `Export` -> `Output Descriptor` -> `Export File`.
3.  Open the `.txt` file in your downloads folder and copy the [BIP389](https://github.com/bitcoin/bips/blob/master/bip-0389.mediawiki) descriptor.

Sparrow can import non-standard multisig configuration files from several wallets, including Unchained, Blue Wallet, Jade, Passport, and others. 

## Screenshots
### Encryption
<img width="1460" alt="Screenshot 2024-11-12 at 3 44 28 PM" src="https://github.com/user-attachments/assets/bbd06478-a358-40ac-91d3-a77d22365624">

### Recovery
<img width="1462" alt="Screenshot 2024-11-20 at 2 24 33 PM" src="https://github.com/user-attachments/assets/2efef722-fa7a-4706-941f-ff39877feb71">

### Decryption
<img width="1463" alt="Screenshot 2024-11-20 at 2 25 08 PM" src="https://github.com/user-attachments/assets/506e9946-3b51-4248-ba98-8accb994e9c1">

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 14 or later)
- npm (usually comes with Node.js)

## Environment variables
| Name                          | Description                                             | Default Value                      |
| ----------------------------- | ------------------------------------------------------- | -----------------------------------|
| VITE_RECOVER_URL              | Specifies the url of the `multisig-recovery` indexer    | https://api.multisigbackup.com     |
| VITE_ORD_URL                  | Specifies the url of the `ord` server                   | https://ordinals.com               |

## Getting started

1. Clone the repository:
   ```
   git clone https://github.com/joshdoman/multisig-backup.git
   cd multisig-backup
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and visit `http://localhost:5173` to see the default app running.

## Building for production

To create a production build, run:

```
npm run build
```

This will generate optimized files in the `dist/` directory, ready for deployment.

## Troubleshooting

If you encounter any issues, try the following:

1. Clear your browser cache and restart the development server.
2. Delete the `node_modules` folder and run `npm install` again.
3. Make sure your Node.js version is compatible with the project requirements.
4. Check for any error messages in the console and search for solutions online.

If problems persist, please open an issue on this project's GitHub repository.

## License

This project is open source and available under the [MIT License](LICENSE).
