import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Loader2, Copy, Mail, MessageSquare, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Channel = "email" | "sms";
type Tone = "professional" | "casual";

interface GeneratedEmail {
  subject: string;
  body: string;
}

interface GeneratedSMS {
  sms: string;
}

export default function AdminMessageGenerator() {
  const [channel, setChannel] = useState<Channel>("email");
  const [tone, setTone] = useState<Tone>("professional");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailResult, setEmailResult] = useState<GeneratedEmail | null>(null);
  const [smsResult, setSmsResult] = useState<GeneratedSMS | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter your notes or prompt");
      return;
    }

    setIsGenerating(true);
    setEmailResult(null);
    setSmsResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-message", {
        body: { channel, prompt, tone },
      });

      if (error) {
        throw new Error(error.message || "Failed to generate message");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (channel === "email" && data.subject && data.body) {
        setEmailResult({ subject: data.subject, body: data.body });
        toast.success("Email generated!");
      } else if (channel === "sms" && data.sms) {
        setSmsResult({ sms: data.sms });
        toast.success("SMS generated!");
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate message");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-accent" />
            AI Message Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate email or SMS copy from your notes using AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Message</CardTitle>
            <CardDescription>
              Describe what you want to say, and AI will craft the perfect message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="channel">Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                  <SelectTrigger id="channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </span>
                    </SelectItem>
                    <SelectItem value="sms">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual / Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Your Notes / Prompt</Label>
              <Textarea
                id="prompt"
                placeholder={
                  channel === "email"
                    ? "E.g., Remind Coach Johnson that their team's uniform order is ready for pickup. Include our hours."
                    : "E.g., Flash sale on team uniforms this weekend, 20% off"
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate {channel === "email" ? "Email" : "SMS"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Email Result */}
        {emailResult && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Generated Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Subject Line</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(emailResult.subject, "Subject")}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-3 bg-background rounded-md border text-sm">
                  {emailResult.subject}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Body</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(emailResult.body, "Body")}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-3 bg-background rounded-md border text-sm whitespace-pre-wrap">
                  {emailResult.body}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  copyToClipboard(
                    `Subject: ${emailResult.subject}\n\n${emailResult.body}`,
                    "Full email"
                  )
                }
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Full Email
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SMS Result */}
        {smsResult && (
          <Card className="border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Generated SMS
                <span className="text-sm font-normal text-muted-foreground ml-auto">
                  {smsResult.sms.length} / 300 chars
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-background rounded-md border text-sm">
                {smsResult.sms}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(smsResult.sms, "SMS")}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy SMS Text
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
