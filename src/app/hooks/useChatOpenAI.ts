import { useState } from 'react';

export const useChatOpenAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);

  const chatWithAI = async (transcription: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: transcription }],
          model: 'gpt-3.5-turbo', // Atur model sesuai kebutuhan
          temperature: 0.7, // Atur parameter sesuai kebutuhan
          topP: 1,
          presencePenalty: 0.9,
          frequencyPenalty: 0.9,
          maxTokens: 150,
          traceId: 'your-trace-id', // Ganti dengan trace ID yang sesuai
        }),
      });

      if (!res.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await res.json();
      setResponse(data); // Simpan respons dari AI
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { chatWithAI, loading, error, response };
};