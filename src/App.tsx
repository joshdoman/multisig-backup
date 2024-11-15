import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy } from 'lucide-react';
import { Textarea } from './components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from "@/components/ui/toaster";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import WalletConnect from './WalletConnect';
import { useToast } from "@/components/ui/use-toast";
import TrezorConnect from '@trezor/connect-web';

import encrypt from './lib/encrypt';
import decrypt from './lib/decrypt';
import Footer from './Footer';

try {
  TrezorConnect.init({
    lazyLoad: true,
    manifest: {
      email: "contact@multisigbackup.com",
      appUrl: "multisigbackup.com",
    },
  });
} catch (e) {
  console.error("Unable to call TrezorConnect.manifest.");
}

const App = () => {
  const [descriptor, setDescriptor] = useState<string>('');
  const [encryptedData, setEncryptedData] = useState<string>('');
  const [decryptXpubs, setDecryptXpubs] = useState<string[]>(['']);
  const [encryptedInput, setEncryptedInput] = useState<string>('');
  const [decryptedDescriptor, setDecryptedDescriptor] = useState<string>('');
  const [encryptWarning, setEncryptWarning] = useState<string>('');
  const [encryptError, setEncryptError] = useState<string>('');
  const [decryptError, setDecryptError] = useState<string>('');
  const [requiredShares, setRequiredShares] = useState<number>(0);
  const [decryptedShares, setDecryptedShares] = useState<number>(0);
  const { toast } = useToast();

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "The text has been copied to your clipboard."
    });
  };

  const handleAddXpub = () => {
    setDecryptXpubs([...decryptXpubs, '']);
  };

  const updateXpub = (index: number, value: string) => {
    const newXpubs = [...decryptXpubs];
    newXpubs[index] = value;
    setDecryptXpubs(newXpubs);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-2xl mx-auto m-4">
        <CardHeader>
          <CardTitle>Bitcoin Multisig Backup</CardTitle>
          <p className='italic'>Encrypt and inscribe your <span className='font-bold'>k-of-n</span> multisig on Bitcoin — recover with any <span className='font-bold'>k</span> seeds.</p>
          <p className='font-bold pt-4'>How It Works</p>
          <p className='text-sm'>
            This tool encrypts the sensitive data in your <span className='font-bold'>k-of-n</span> descriptor 
            so you can safely inscribe it on Bitcoin.
            Recovery is easy - simply decrypt by deriving any <span className='font-bold'>k</span> extended public keys.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="encrypt" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="encrypt" className="w-1/3">Inscribe</TabsTrigger>
              <TabsTrigger value="decrypt" className="w-1/3">Recover</TabsTrigger>
              <TabsTrigger value="faq" className="w-1/3">FAQ</TabsTrigger>
            </TabsList>

            <TabsContent value="encrypt" className="space-y-4">
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
                <>
                  <div className="relative">
                    <Textarea
                      value={encryptedData}
                      readOnly
                      className="pr-10"
                      style={{ height: '150px' }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0"
                      onClick={() => copyToClipboard(encryptedData)}  
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`https://btcscribe.org?msg=${encodeURIComponent(encryptedData)}`} target="_blank">
                      Inscribe on Bitcoin
                    </a>
                  </Button>
                </>
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
            </TabsContent>

            <TabsContent value="decrypt" className="space-y-4">
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
                  className="w-full p-0 m-0 mt-0"
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
                <div className="relative">
                  <Textarea
                    value={decryptedDescriptor}
                    readOnly
                    className="pr-10"
                    style={{ height: '150px' }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => copyToClipboard(decryptedDescriptor)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  </div>
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
              </TabsContent>

              <TabsContent value="faq" className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Where do I find my descriptor?</AccordionTrigger>
                    <AccordionContent>
                      Several multisig wallets natively support output descriptors (see 
                      the <a className='underline' href="https://outputdescriptors.org/" target="_blank" rel="noopener">full list</a>). 
                      If you use a wallet that does not, you can get the descriptor by importing it into one
                      that does. We recommend using <a className='underline' href="https://sparrowwallet.com/" target="_blank" rel="noopener">Sparrow</a> to
                      do this.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>How is my descriptor encrypted?</AccordionTrigger>
                    <AccordionContent>
                      This tool encrypts the xpubs and master fingerprints in the descriptor with a random seed,
                      splits the seed into <span className='font-bold'>n</span> shares
                      using <a className='underline' href="https://github.com/privy-io/shamir-secret-sharing" target="_blank" rel="noopener">shamir secret sharing</a> so 
                      that <span className='font-bold'>k</span> shares is enough to recover the seed, and then encrypts each share
                      such that it can be decrypted with the corresponding xpub. This ensures the descriptor can always be recovered 
                      as long as the user has <span className='font-bold'>k</span> keys.
                      <br/><br/>
                      This tool uses the encryption algorithms ChaCha20 and ChaCha20-Poly1305, as implemented
                      in the audited <a className='underline' href="https://github.com/paulmillr/noble-ciphers" target="_blank" rel="noopener">noble</a> library.
                      For more details, see <a className='underline' href="https://github.com/joshdoman/multisig-backup" target="_blank" rel="noopener">here</a>.                      
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger>How do I recover my descriptor?</AccordionTrigger>
                    <AccordionContent>
                      To recover your descriptor, simply input the encrypted text and
                      any <span className='font-bold'>k</span> xpubs.
                      If you do not know the xpubs but have <span className='font-bold'>k</span> seeds,
                      use the derivation paths at the start of the encrypted text to
                      compute them.
                      <br/><br/>
                      If you inscribed the encrypted text on Bitcoin, you can find it
                      at any time by looking up the reveal transaction on any
                      inscription-compatible block explorer, 
                      like <a className='underline' href="https://ordinals.com" target="_blank" rel="noopener">ordinals.com</a> or <a className='underline' href="https://mempool.space" target="_blank" rel="noopener">mempool.space</a>.
                      <br/><br/>
                      If you do not know the txid, you can still find the encrypted text by
                      indexing the blockchain. To make this easier, each pair of master fingerprints is hashed with SHA256,
                      with the first four bytes appended to the encrypted text. By building an index
                      of these hashes, you can quickly find the encrypted text for any pair of seeds.
                      An open source indexer is under development.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4">
                    <AccordionTrigger>Do you see my data?</AccordionTrigger>
                    <AccordionContent>
                      No, this tool runs 100% in your browser and never transmits your data.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-5">
                    <AccordionTrigger>Is it open source?</AccordionTrigger>
                    <AccordionContent>
                      Yes! This project is 100% open source and released under MIT License.
                      To inspect or learn more, check out the project on <a className='underline' href="https://github.com/joshdoman/multisig-backup" target="_blank" rel="noopener">Github</a>.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <Footer />
        <Toaster />
      </div>
    );
  };
  
  export default App;