import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

import encrypt from './lib/encrypt';
import CopyableTextarea from './CopyableTextarea';

const Inscribe = () => {
  const [descriptor, setDescriptor] = useState<string>('');
  const [encryptedData, setEncryptedData] = useState<string>('');
  const [encryptWarning, setEncryptWarning] = useState<string>('');
  const [encryptError, setEncryptError] = useState<string>('');

  const handleEncrypt = async () => {
    try {
      setEncryptWarning('');
      setEncryptError('');
      if (!descriptor) {
        throw new Error('Please enter a descriptor');
      }

      const { encryptedText, missingXfps } = await encrypt(descriptor);
      setEncryptedData(encryptedText);

      if (missingXfps) {
        setEncryptWarning(`
          Some master fingerprints and derivation paths are missing.
          This can make it challenging to recover the descriptor.
          Use at your own risk.
        `);
      }
    } catch (err) {
      setEncryptError(((err as Error)?.message || "unknown error"));
    }
  };

  return (
    <>
      <Input
        placeholder='Enter Bitcoin multisig descriptor (i.e. "wsh(sortedmulti(k,...")'
        value={descriptor}
        onChange={(e) => setDescriptor(e.target.value)}
      />
      
      <Button 
        onClick={handleEncrypt}
        className="w-full"
      >
        Encrypt
      </Button>

      {encryptedData && (
        <CopyableTextarea value={encryptedData} />
      )}

      {encryptError && !encryptedData && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{encryptError}</AlertDescription>
        </Alert>
      )}

      {encryptWarning && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{encryptWarning}</AlertDescription>
        </Alert>
      )}
    </>
  )
}

export default Inscribe;