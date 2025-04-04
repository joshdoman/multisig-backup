import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';

import { parseWitness, Inscription } from 'micro-ordinals';
import { Transaction } from '@scure/btc-signer';
import { utf8 } from '@scure/base';

import WalletConnect from './WalletConnect';
import decrypt from '../lib/decrypt';
import CopyableTextarea from './CopyableTextarea';
import { hexToUint8Array, joinUint8Arrays, sha256, uint8ArrayToHex } from '../lib/utils';
import { parseEncryptedDescriptor } from '@/lib/parse';
import { DescriptorChecksum } from '@/lib/checksum';

const RECOVER_URL = import.meta.env.VITE_RECOVER_URL || 'https://api.multisigbackup.com';
const ORD_URL = import.meta.env.VITE_ORD_URL || 'https://ordinals.com';
const MEMPOOL_URL = import.meta.env.VITE_MEMPOOL_URL || 'https://mempool.space/testnet4';

interface InscriptionValue {
  value: string;
  isTestnet: boolean;
}

export interface RecoverState {
  showXfps: boolean;
  xfp0: string;
  xfp1: string;
  xpubs: string[];
  input: string;
  inscriptions: InscriptionValue[];
  selectedInscription: string;
  decryptedDescriptor: string;
}

interface RecoverProps {
  state: RecoverState;
  setState: React.Dispatch<React.SetStateAction<RecoverState>>;
}

const Recover: React.FC<RecoverProps> = ({ state, setState }) => {
  const {
    showXfps,
    xfp0,
    xfp1,
    xpubs,
    input,
    inscriptions,
    selectedInscription,
    decryptedDescriptor,
  } = state;
  const [decryptError, setDecryptError] = useState<string>('');
  const [recoverError, setRecoverError] = useState<string>('');
  const [requiredShares, setRequiredShares] = useState<number>(0);
  const [decryptedShares, setDecryptedShares] = useState<number>(0);
  const textToDecrypt = selectedInscription || input;

  const handleAddXpub = () => {
    setState((prevState: RecoverState) => ({
      ...prevState,
      xpubs: [...xpubs, ''],
    }));
  };

  const updateXpub = (index: number, value: string) => {
    const newXpubs = [...xpubs];
    newXpubs[index] = value;
    setState((prevState: RecoverState) => ({
      ...prevState,
      xpubs: newXpubs,
    }));
  };

  const updateXfp0 = (value: string) => {
    setState((prevState: RecoverState) => ({
      ...prevState,
      xfp0: value,
    }));
  };

  const updateXfp1 = (value: string) => {
    setState((prevState: RecoverState) => ({
      ...prevState,
      xfp1: value,
    }));
  };

  const updateInput = (value: string) => {
    setState((prevState: RecoverState) => ({
      ...prevState,
      input: value,
    }));
  };

  const updateShowXfps = (showXfps: boolean) => {
    setState((prevState: RecoverState) => ({
      ...prevState,
      showXfps,
    }));
  }

  const updateSelectedInscription = (value: string) => {
    const newXpubs = xpubs;
    try {
      // Add xpubs if requiredSigs exceeds xpubs.length
      const { groupedEncryptedShares } = parseEncryptedDescriptor(stripTestnetIndicator(value));
      const requiredSigs = groupedEncryptedShares.reduce((max, obj) => 
        Math.max(max, obj.requiredSigs
      ), 1);
      while (newXpubs.length < requiredSigs) {
        newXpubs.push('');
      }
    } catch {
      // We've already parsed every inscription, so error cannot be thrown here
    }

    setState((prevState: RecoverState) => ({
      ...prevState,
      xpubs: newXpubs,
      selectedInscription: value,
    }));
  }

  const updateDecryptedDescriptor = (value: string) => {
    setState((prevState: RecoverState) => ({
      ...prevState,
      decryptedDescriptor: value,
    }));
  }

  const validateXfp = (xfp: string) => {
    const hexRegex = /[a-f0-9]{8}/;
    return hexRegex.test(xfp) && xfp.length === 8;
  }

  const handleRecover = async () => {
    try {
      setRecoverError('');

      if (!xfp0 || !xfp1) {
        throw new Error('Please enter two master fingerprints');
      }

      if (!validateXfp(xfp0) || !validateXfp(xfp1)) {
        throw new Error('Invalid master fingerprint');
      }

      const xfpPairFingerprint = await sha256(
        joinUint8Arrays([xfp0, xfp1].map(hexToUint8Array).sort())
      ).then(hash => uint8ArrayToHex(hash.slice(0, 4)));

      const xfpResponse = await fetch(`${RECOVER_URL}/inscriptionIds/${xfpPairFingerprint}`);
      const inscriptionIds = await xfpResponse.json().then(json => json.inscriptionIds);

      if (inscriptionIds.length === 0) {
        throw new Error(`
          No inscription was found at this xfp pair. Please try again if your inscription
          was recently confirmed. Newly confirmed inscriptions take up to 1 minute to be indexed.
        `);
      }

      let requiredSigs = 1;
      const inscriptions: InscriptionValue[] = [];
      const remainingInscriptionIds: string[] = [];
      for (let i = 0; i < inscriptionIds.length; i++) {
        try {
          const ordResponse = await fetch(`${ORD_URL}/content/${inscriptionIds[i]}`);
          if (ordResponse.status !== 200) throw new Error("Not found");
          const encryptedText = await ordResponse.text();
          const { groupedEncryptedShares } = parseEncryptedDescriptor(encryptedText);
          if (i === 0) {
            groupedEncryptedShares.forEach(g => {
              requiredSigs = Math.max(requiredSigs, g.requiredSigs);
            })
          }
          inscriptions.push({
            value: encryptedText,
            isTestnet: false,
          });
        } catch {
          remainingInscriptionIds.push(inscriptionIds[i]);
        }
      }

      // Failed to fetch inscription from `ord`, try to fetch from mempool.space (for testnet inscriptions)
      for (let i = 0; i < remainingInscriptionIds.length; i++) {
        try {
          const split: string[] = remainingInscriptionIds[i].split('i');
          if (split.length < 2) continue;
          const txid = split[0];
          const index = Number(split[1]);
          const mempoolResponse = await fetch(`${MEMPOOL_URL}/api/tx/${txid}/hex`);
          const hex = await mempoolResponse.text();
          const bytes = Uint8Array.from(Buffer.from(hex, 'hex'));
          const tx = Transaction.fromRaw(bytes, { 
            allowUnknownOutputs: true,
            disableScriptCheck: true,
          });

          const txInscriptions: Inscription[] = [];
          for (let i = 0; i < tx.inputsLength; i++) {
            const input = tx.getInput(i);
            if (!input || !input.finalScriptWitness) continue;
            try {
              const inputInscriptions = parseWitness(input.finalScriptWitness);
              if (!inputInscriptions) continue;
              txInscriptions.push(...inputInscriptions);
            } catch {
              // Skip if inscription parsing fails
            }
          }

          if (index < txInscriptions.length) {
            const inscription = txInscriptions[index];
            if (!inscription.tags.contentType?.startsWith('text/plain')) continue;
            const encryptedText = utf8.encode(inscription.body);
            const { groupedEncryptedShares } = parseEncryptedDescriptor(encryptedText);
            if (inscriptions.length === 0 && i === 0) {
              groupedEncryptedShares.forEach(g => {
                requiredSigs = Math.max(requiredSigs, g.requiredSigs);
              })
            }
            inscriptions.push({
              value: encryptedText,
              isTestnet: true,
            });
          }
        } catch {
          // Skip if failed to fetch or if there's an error parsing the descriptor
        }
      }

      if (inscriptions.length === 0) {
        if (inscriptionIds.length > 0) {
          throw new Error(`Failed to fetch valid inscription(s) from ${RECOVER_URL}.`);
        } else {
          throw new Error(`Failed to fetch inscription(s) from ${ORD_URL}.`);
        }
      }
      
      const newXpubs = xpubs;
      while (newXpubs.length < requiredSigs) {
        newXpubs.push('');
      }
      setState((prevState: RecoverState) => ({
        ...prevState,
        showXfps: false,
        xpubs: newXpubs,
        inscriptions,
        selectedInscription: displayInscription(inscriptions[0]),
      }));
    } catch (err) {
      setRecoverError(((err as Error)?.message || "unknown error"));
    }
  }

  const handleDecrypt = async () => {
    try {
      setDecryptError('');
      updateDecryptedDescriptor('');

      if (!textToDecrypt) {
        throw new Error('Please enter the encrypted descriptor');
      }

      if (!xpubs[0]) {
        throw new Error('Please enter at least one xpub');
      }

      const { descriptor, decryptedShares, requiredShares } = await decrypt(
        stripTestnetIndicator(textToDecrypt),
        xpubs
      );

      setDecryptedShares(decryptedShares);
      setRequiredShares(requiredShares);
      if (descriptor) {
        const checksum = DescriptorChecksum(descriptor);
        updateDecryptedDescriptor(`${descriptor}#${checksum}`);
      }
    } catch (err) {
      setDecryptError(((err as Error)?.message || "unknown error"));
    }
  };

  useEffect(() => {
    if (xpubs.length > 0 && decryptedShares < requiredShares) {
      setDecryptError(`Need ${requiredShares - decryptedShares} more xpub(s) to decrypt`);
    }
  }, [xpubs, decryptedShares, requiredShares]);

  const shortenInscription = (inscription: string) => {
    const split = inscription.split(')');
    if (split.length < 3) {
      return inscription;
    }
    return `${split[0]})${split[2].substring(0,8)}...`
  }

  const testnetText = '(testnet4) ';
  const stripTestnetIndicator = (value: string) => value.startsWith(testnetText) ? value.split(testnetText)[1] : value;

  const displayInscription = (inscription: InscriptionValue, shorten: boolean = false) => {
    const text = shorten ? shortenInscription(inscription.value) : inscription.value;
    return (inscription.isTestnet) ? `${testnetText}${text}` : text;
  }

  const xpubLabel = selectedInscription.startsWith(testnetText) ? 'tpub' : 'xpub';

  return showXfps ? (
    <>
      <p className='text-sm'>
        <span className='font-bold'>Step 1: </span>
        Recover the encrypted descriptor using two of its master fingerprints.
      </p>
      <div>
        <Input
          placeholder='Enter xfp 1'
          value={xfp0}
          onChange={(e) => updateXfp0(e.target.value)}
          />
        <WalletConnect
          onXfp={updateXfp0}
          />
      </div>
      <div>
        <Input
          placeholder='Enter xfp 2'
          value={xfp1}
          onChange={(e) => updateXfp1(e.target.value)}
          />
        <WalletConnect
          onXfp={updateXfp1}
          />
      </div>
      
      <Button 
        onClick={handleRecover}
        className="w-full"
      >
        Recover
      </Button>

      <Button
        onClick={() => updateShowXfps(false)}
        variant="outline"
        className="w-full"
      >
        Skip
      </Button>

      {recoverError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{recoverError}</AlertDescription>
        </Alert>
      )}
    </>
  ) : (
    <>
      <div className="flex justify-between items-center">
        <p className='text-left text-sm'>
          <span className='font-bold'>Step 2: </span>
          Decrypt the descriptor using any <span className='font-bold'>
            {inscriptions.length > 0 ? xpubs.length : 'k'}
          </span> extended public keys.
        </p>
        <p
          onClick={() => updateShowXfps(true)}
          className="text-right text-sm hover:underline text-cyan-900 cursor-pointer pr-2"
          >
          Step 1
        </p>
      </div>

      {inscriptions.length > 0 ? (
        <Select value={selectedInscription} onValueChange={updateSelectedInscription}>
          <SelectTrigger >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-full">
            {inscriptions.map((inscription, index) => (
              <SelectItem key={index} value={displayInscription(inscription)}>
                {displayInscription(inscription, /** shorten */ true)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          placeholder='Enter encrypted decriptor (i.e. "wsh(sortedmulti(...))xyz123...")'
          value={input}
          onChange={(e) => updateInput(e.target.value)}
          />
      )}
      
      {xpubs.map((xpub, index) => (
        <div key={index}>
          <Input
            placeholder={`Enter ${xpubLabel} ${index + 1}`}
            value={xpub}
            onChange={(e) => updateXpub(index, e.target.value)}
          />
          <WalletConnect
            encryptedInput={textToDecrypt}
            onXpub={(xpub: string) => updateXpub(index, xpub)}
            />
        </div>
      ))}

      {inscriptions.length === 0 && (
        <Button
          onClick={handleAddXpub}
          variant="outline"
          className="w-full"
          >
          Add Another Xpub
        </Button>
      )}
      
      <Button 
        onClick={handleDecrypt}
        className="w-full"
      >
        Decrypt
      </Button>

      {decryptedDescriptor && (
        <CopyableTextarea value={decryptedDescriptor} />
      )}

      {decryptError && !decryptedDescriptor && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{decryptError}</AlertDescription>
        </Alert>
      )}  

      {decryptedShares > 0 && !decryptedDescriptor && (
        <Alert className="mt-4">
          <AlertDescription>
            Decrypted {decryptedShares} of {requiredShares} required shares. 
            {requiredShares - decryptedShares > 0 && 
              ` Please provide ${requiredShares - decryptedShares} more xpub(s).`}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}

export default Recover;