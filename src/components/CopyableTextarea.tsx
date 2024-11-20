import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";

interface CopyableTextareaProps {
  value: string
}

const CopyableTextarea: React.FC<CopyableTextareaProps> = ({ value }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "The text has been copied to your clipboard."
    });
  };

  return (
    <div className="relative">
      <Textarea
        value={value}
        readOnly
        className="pr-10"
        style={{ height: '150px' }}
      />
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0"
        onClick={() => copyToClipboard(value)}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default CopyableTextarea;