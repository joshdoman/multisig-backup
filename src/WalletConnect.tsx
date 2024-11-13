import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const WalletConnect = () => {
  const [selectedWallet, setSelectedWallet] = useState('');
  const [derivationPath, setDerivationPath] = useState('');
  const [xpub, setXpub] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError('');
    try {
      // This is where you would implement the actual hardware wallet connection
      // You would need to use libraries specific to each wallet type:
      // - @ledgerhq/hw-transport-webusb for Ledger
      // - trezor-connect for Trezor
      // - @coldcard/sdk for Coldcard
      throw new Error('Wallet connection not implemented');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const deriveXpub = async () => {
    setError('');
    try {
      if (!selectedWallet) {
        throw new Error('Please select a wallet first');
      }
      if (!derivationPath) {
        throw new Error('Please enter a derivation path');
      }

      // Validate derivation path format
      const pathRegex = /^(\d+h?\/)*\d+h?$/;
      if (!pathRegex.test(derivationPath)) {
        throw new Error('Invalid derivation path format');
      }

      // This is where you would implement the actual xpub derivation
      // The implementation would depend on the selected wallet type
      throw new Error('XPUB derivation not implemented');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">Connect Hardware Wallet</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Hardware Wallet Xpub Derivation</DialogTitle>
          {/* <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription> */}
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Wallet Type</label>
          <Select value={selectedWallet} onValueChange={setSelectedWallet}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a wallet..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ledger">Ledger</SelectItem>
              <SelectItem value="trezor">Trezor</SelectItem>
              <SelectItem value="coldcard">Coldcard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Derivation Path</label>
          <Input
            placeholder="e.g. 45h/0h/0h/0"
            value={derivationPath}
            onChange={(e) => setDerivationPath(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Use h for hardened indices (e.g., 44h/0h/0h/0)
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            className="w-full"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
          
          <Button 
            className="w-full"
            onClick={deriveXpub}
            disabled={!selectedWallet}
          >
            Derive XPUB
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {xpub && (
          <div className="space-y-2">
            <label className="text-sm font-medium">XPUB</label>
            <div className="p-2 bg-gray-100 rounded break-all">
              {xpub}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnect;