'use client'
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import VoiceRecorder from '@/components/VoiceRecorder';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardTitle } from "@/components/ui/card"

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast()

  const handleSendMessage = async () => {
    if (!phoneNumber || !message) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter both phone number and message.",
      })
      return;
    }

    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, message }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "WhatsApp message sent successfully.",
        })
      } else {
        throw new Error('Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send WhatsApp message.",
      })
    }
  };

  return (
    <>
      <Toaster />
      <main className="flex flex-col min-h-screen w-full items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
        <Card className="w-full max-w-md">
          <CardTitle className="p-4 text-2xl font-bold">Send WhatsApp Message</CardTitle>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Enter message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button onClick={handleSendMessage} className="w-full">
                Send WhatsApp Message
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}