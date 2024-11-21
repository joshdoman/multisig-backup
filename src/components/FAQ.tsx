import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  return (
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
          To recover your descriptor, start by inputting two master fingerprints and
          pressing "Recover." This will fetch all descriptors that have been encrypted
          and inscribed on Bitcoin that contain these two master fingerprints.

          <br/><br/>

          Next, select the descriptor you wish to decrypt and input
          any <span className='font-bold'>k</span> xpubs. If you do not know the xpubs 
          but have <span className='font-bold'>k</span> seeds, use the derivation paths
          at the start of the encrypted text to derive them.

          <br/><br/>

          Trezor and Ledger are supported natively. If you hvae a different device,
          follow the device's instructions to obtain the xpubs and master fingerprints.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger>Can you see my descriptor?</AccordionTrigger>
        <AccordionContent>
          No, this tool never transmits your plaintext descriptor, xpubs, or master fingrprints.
          Your data is encrypted and decrypted entirely within your browser.
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
  )
}