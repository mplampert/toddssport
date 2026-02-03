import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductForFlyer {
  imageUrl: string;
  title: string;
  description: string;
  priceLine: string;
}

interface Rep {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface ClientInfo {
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface FlyerEmailTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientInfo?: ClientInfo;
  products: ProductForFlyer[];
  rep?: Rep;
  pdfUrl?: string;
}

export function FlyerEmailTemplate({ 
  open, 
  onOpenChange, 
  clientName, 
  clientInfo,
  products, 
  rep,
  pdfUrl 
}: FlyerEmailTemplateProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const validProducts = products.filter(p => p.title.trim());
  
  // Generate the email content
  const generateEmail = () => {
    const greeting = clientInfo?.contactName 
      ? `Hi ${clientInfo.contactName.split(' ')[0]},`
      : clientName 
        ? `Hi ${clientName} Team,`
        : 'Hi,';
    
    const productList = validProducts.map((p, i) => {
      let line = `• ${p.title}`;
      if (p.priceLine) {
        const price = p.priceLine.startsWith('$') ? p.priceLine : `$${p.priceLine}`;
        line += ` - ${price}`;
      }
      return line;
    }).join('\n');
    
    const repSignature = rep 
      ? `${rep.name}\nTodd's Sporting Goods\n${rep.email}${rep.phone ? `\n${rep.phone}` : ''}`
      : "Todd's Sporting Goods\n(978) 927-1600\nwww.toddssportinggoods.com";
    
    const email = `${greeting}

I wanted to share some product recommendations I've put together for ${clientName || 'your team'}. I think these would be a great fit for your upcoming season.

Here's what I've selected:

${productList}

${pdfUrl ? `I've attached a flyer with all the details and images. You can also view it here:\n${pdfUrl}\n` : ''}
Let me know if you have any questions or would like to discuss sizing, customization options, or quantity pricing. I'm happy to set up a quick call or meeting at your convenience.

Looking forward to working with you!

Best regards,
${repSignature}`;

    return email;
  };

  const emailContent = generateEmail();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      toast({
        title: "Email copied!",
        description: "The email template has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please select the text and copy manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Email Template</DialogTitle>
          <DialogDescription>
            Copy this email and paste it into your email client to send to the customer.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              To: {clientInfo?.email || '(add client email to flyer)'}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Email
                </>
              )}
            </Button>
          </div>
          
          <Textarea
            value={emailContent}
            readOnly
            className="min-h-[400px] font-mono text-sm"
          />
          
          <p className="text-xs text-muted-foreground">
            Tip: After copying, paste into your email client (Gmail, Outlook, etc.) and attach the flyer PDF if available.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}