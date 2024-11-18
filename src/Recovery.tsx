import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import WalletConnect from './WalletConnect';
import decrypt from './lib/decrypt';
import CopyableTextarea from './CopyableTextarea';

const Recovery = () => {
  const [decryptXpubs, setDecryptXpubs] = useState<string[]>(['']);
  const [encryptedInput, setEncryptedInput] = useState<string>('');
  const [decryptedDescriptor, setDecryptedDescriptor] = useState<string>('');
  const [decryptError, setDecryptError] = useState<string>('');
  const [requiredShares, setRequiredShares] = useState<number>(0);
  const [decryptedShares, setDecryptedShares] = useState<number>(0);

  const handleAddXpub = () => {
    setDecryptXpubs([...decryptXpubs, '']);
  };

  const updateXpub = (index: number, value: string) => {
    const newXpubs = [...decryptXpubs];
    newXpubs[index] = value;
    setDecryptXpubs(newXpubs);
  };

  const handleDecrypt = async () => {
    try {
      setDecryptError('');
      setDecryptedDescriptor('');

      if (!encryptedInput || !decryptXpubs[0]) {
        throw new Error('Please enter encrypted data and at least one xpub');
      }

      const { descriptor, decryptedShares, requiredShares } = await decrypt(encryptedInput, decryptXpubs);

      setDecryptedShares(decryptedShares);
      setRequiredShares(requiredShares);
      if (descriptor) {
        setDecryptedDescriptor(descriptor);
      }
    } catch (err) {
      setDecryptError(((err as Error)?.message || "unknown error"));
    }
  };

  useEffect(() => {
    if (decryptXpubs.length > 0 && decryptedShares < requiredShares) {
      setDecryptError(`Need ${requiredShares - decryptedShares} more xpub(s) to decrypt`);
    }
  }, [decryptXpubs, decryptedShares, requiredShares]);

  return (
    <>
      <Input
        placeholder='Enter encrypted decriptor (i.e. "wsh(sortedmulti(...))xyz123...")'
        value={encryptedInput}
        onChange={(e) => setEncryptedInput(e.target.value)}
      />
      
      {decryptXpubs.map((xpub, index) => (
        <div key={index}>
          <Input
            placeholder={`Enter xpub ${index + 1}`}
            value={xpub}
            onChange={(e) => updateXpub(index, e.target.value)}
          />
          <WalletConnect
            encryptedInput={encryptedInput}
            onNewXpub={(xpub: string) => updateXpub(index, xpub)}
            />
        </div>
      ))}

      <Button
          onClick={handleAddXpub}
          variant="outline"
          className="w-full"
        >
        Add Another Xpub
      </Button>
      
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

export default Recovery;