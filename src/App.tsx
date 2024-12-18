import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from "@/components/ui/toaster";
import TrezorConnect from '@trezor/connect-web';

import Footer from './components/Footer';
import Recover, { RecoverState } from './components/Recover';
import Inscribe from './components/Inscribe';
import FAQ from './components/FAQ';

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
  const [recoverState, setRecoverState] = useState<RecoverState>({
    showXfps: true,
    xfp0: '',
    xfp1: '',
    xpubs: [''],
    input: '',
    inscriptions: [],
    selectedInscription: '',
    decryptedDescriptor: '',
  });
  
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
            Recovery is easy - all you need is two master fingerprints 
            and <span className='font-bold'>k</span> extended public keys.
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
              <Inscribe descriptor={descriptor} setDescriptor={setDescriptor} />
            </TabsContent>

            <TabsContent value="decrypt" className="space-y-4">
              <Recover state={recoverState} setState={setRecoverState} />
            </TabsContent>

            <TabsContent value="faq" className="space-y-4">
              <FAQ />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Footer />
      <Toaster />
    </div>
  )};
  
  export default App;