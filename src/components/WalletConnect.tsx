import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { fingerprintToFixedLengthHex, validateBIP32Path } from '@caravan/bitcoin';
import TrezorConnect from '@trezor/connect-web';
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import { AppClient } from "ledger-bitcoin";

import { parseEncryptedDescriptor } from '../lib/parse';

// Source: https://github.com/bitcoinerlab/descriptors/blob/main/src/ledger.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ledgerAppInfo(transport: any) {
  const r = await transport.send(0xb0, 0x01, 0x00, 0x00);
  let i = 0;
  const format = r[i++];
  const nameLength = r[i++];
  const name = r.slice(i, (i += nameLength!)).toString('ascii');
  const versionLength = r[i++];
  const version = r.slice(i, (i += versionLength!)).toString('ascii');
  const flagLength = r[i++];
  const flags = r.slice(i, (i += flagLength!));
  return { name, version, flags, format };
}

async function getLedgerTransport() {
  const transport = await TransportWebUSB.create();
  const { name: openName, version } = await ledgerAppInfo(transport);
  if (openName !== 'Bitcoin') {
    throw new Error('Please open the Bitcoin app.');
  }
  const [major, minor,] = version.split('.').map(Number);
  if (major < 2 || (major === 2 && minor < 1)) {
    throw new Error(`Please upgrade the Bitcoin app`);
  }
  return transport;
}

interface WalletConnectProps {
  encryptedInput?: string;
  onXpub?: (xpub: string) => void;
  onXfp?: (xfp: string) => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ encryptedInput, onXpub, onXfp }) => {
  const [selectedWallet, setSelectedWallet] = useState('');
  const [derivationPath, setDerivationPath] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const title = onXpub ? 'Derive Extended Public Key' : 'Retrieve Master Fingerprint';

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError('');
    try {
      if (!navigator.usb) {
        throw new Error('This browser is not supported. Please use Chrome instead.');
      }

      if (!selectedWallet) {
        throw new Error('Please select a wallet');
      }

      if (onXpub) {
        if (!derivationPath) {
          throw new Error('Please enter a derivation path');
        }
  
        const bip32Path = 'm' + '/' + derivationPath.replace(/h/g, `'`);
        if (validateBIP32Path(bip32Path)) {
          throw new Error('Invalid derivation path format');
        }
  
        let xpub;
        if (selectedWallet === 'ledger') {
          const app = new AppClient(await getLedgerTransport());
          try {
            // Try getting the xpub without user confirmation
            xpub = await app.getExtendedPubkey(bip32Path, false);
          } catch (err) {
            xpub = await app.getExtendedPubkey(bip32Path, true);
          }
        } else if (selectedWallet === 'trezor') {
          const result = await TrezorConnect.getPublicKey({
            path: bip32Path,
            coin: 'btc'
          });
          if (result.success) {
            xpub = result.payload.xpub;
          } else {
            throw new Error('Something went wrong. Please try again.');
          }
        } else {
          throw new Error('Wallet not supported.');
        }
        onXpub(xpub);
      } else if (onXfp) {
        let xfp;
        if (selectedWallet === 'ledger') {
          const app = new AppClient(await getLedgerTransport());
          xfp = await app.getMasterFingerprint();
        } else if (selectedWallet === 'trezor') {
          const result = await TrezorConnect.getPublicKey({
            path: `m/45'`,
            coin: 'btc'
          });
          if (result.success) {
            xfp = fingerprintToFixedLengthHex(result.payload.fingerprint);
          } else {
            throw new Error('Something went wrong. Please try again.');
          }
        } else {
          throw new Error('Wallet not supported.');
        }
        onXfp(xfp);
      }
      closeDialog();
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message.includes("UNKNOWN_ERROR")) {
        setError(e.message + " - make sure the Bitcoin app is open");
      } else {
        setError(e.message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const onOpenChange = (isOpen: boolean) => {
    setDialogOpen(isOpen);

    if (!navigator.usb) {
      setError('This browser is not supported. Please use Chrome instead.');
    } 
    
    if (derivationPath === '' && encryptedInput) {
      const { bip32Paths } = parseEncryptedDescriptor(encryptedInput);
      // Filter out non-standard derivation paths
      const standardPaths = bip32Paths.filter(str => 
        str.startsWith('44') ||
        str.startsWith('45') ||
        str.startsWith('48') ||
        str.startsWith('49') ||
        str.startsWith('84') ||
        str.startsWith('86')
      );

      // Automatically set derivation path if all standard paths are the same
      if (standardPaths.every(path => path === bip32Paths[0])) {
        setDerivationPath(bip32Paths[0]);
      }
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="text-xs text-cyan-900 p-2">
          Connect hardware device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className='hidden' />
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
            </SelectContent>
          </Select>
        </div>

        {
          onXpub && (
            <div className="space-y-2">
            <label className="text-sm font-medium">Derivation Path</label>
            <Input
              placeholder="e.g. 45h/0h/0h/0"
              value={derivationPath}
              onChange={(e) => setDerivationPath(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Use ' or h for hardened indices (e.g., 45h/0h/0h/0)
            </p>
          </div>
          )
        }

        <div className="space-y-2">
          <Button 
            className="w-full"
            onClick={connectWallet}
            disabled={isConnecting || selectedWallet === ''}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnect;