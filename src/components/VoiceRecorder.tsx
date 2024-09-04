import { useChat } from 'ai/react';
import { ElevenLabsClient, play } from 'elevenlabs';
import React, { useState, useRef, useEffect } from 'react';
import { ReadableStreamDefaultReadResult } from 'stream/web';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Mic, MicOff } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

const DEFAULT_PROMPT: any = {
  id: 'default',
  title: 'Chat AI',
  prompt: 'kaamu adalah angular developer',
  temperature: 0.20,
  topP: 1,
  presencePenalty: 0.48,
  frequencyPenalty: 0.52,
  maxTokens: 512,
};

const VoiceRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [langChainResponse, setLangChainResponse] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [params, setParams] = useState<any>(
    {
      prompt: DEFAULT_PROMPT.prompt,
      model: 'gpt-3.5-turbo',
      temperature: DEFAULT_PROMPT.temperature,
      topP: DEFAULT_PROMPT.topP,
      presencePenalty: DEFAULT_PROMPT.presencePenalty,
      frequencyPenalty: DEFAULT_PROMPT.frequencyPenalty,
      maxTokens: DEFAULT_PROMPT.maxTokens,
      titlePrompt: 'New Chat',
    }
  )
  const [firstMessage, setFirstMessage] = useState<string | null>('hai, adakaha yang bisa saya bantu');
  const [chatHistory, setChatHistory] = useState<{ id: string; title: string; messages: any[]; timestamp: number; prompt: string }[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isloading, setIsloading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isasking, setIsasking] = useState(false)
  const { toast } = useToast()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStart = Date.now();
      let isSpeaking = false;

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

        if (average > 20) { // Adjust this threshold as needed
          silenceStart = Date.now();
          if (!isSpeaking) {
            isSpeaking = true;
            setIsSpeaking(true);
          }
        } else if (isSpeaking && Date.now() - silenceStart > 1000) { // 1.5 seconds of silence
          isSpeaking = false;
          setIsSpeaking(false);
          if (isloading == false) {
            sendAudioToServer();
          }
        }
      };

      const intervalId = setInterval(checkAudioLevel, 100);

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        clearInterval(intervalId);
        // if(isloading == false){
        //   sendAudioToServer();
        // }
      };

      mediaRecorderRef.current.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      setIsSpeaking(false);
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setIsasking(false)
    }
  };

  const initRecording = async () => {
    setIsDialogOpen(true);
    setIsasking(true)
    const ttsResponse = await fetch('http://127.0.0.1:8080/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: firstMessage || 'haiii , adakaha yang bisa saya bantu' }),
    });

    if (!ttsResponse.ok) {
      throw new Error(`TTS error! status: ${ttsResponse.status}`);
    }

    const audioBlob = await ttsResponse.blob();
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);

    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
    await startRecording();
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: transcription,
          ...params,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLangChainResponse(data.response);
    } catch (error) {
      console.error('Error calling API:', error);
      toast({
        variant: "destructive",
        title: "API Error",
        description: "There was a problem with the chat API.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      })
    }
  };

  const sendAudioToServer = async () => {
    setIsloading(true)
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      const response = await fetch('http://127.0.0.1:8080/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Transcription error! status: ${response.status}`);
      }
      const data = await response.json();
      setTranscription(data.text);

      // Fetch the LangChain API with the transcription
      const langChainResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: data.text,
          model: 'gpt-3.5-turbo',
          temperature: DEFAULT_PROMPT.temperature,
          topP: DEFAULT_PROMPT.topP,
          presencePenalty: DEFAULT_PROMPT.presencePenalty,
          frequencyPenalty: DEFAULT_PROMPT.frequencyPenalty,
          maxTokens: DEFAULT_PROMPT.maxTokens,
          prompt: DEFAULT_PROMPT.prompt,
        }),
      });

      if (!langChainResponse.ok) {
        throw new Error(`LangChain error! status: ${langChainResponse.status}`);
      }

      const langChainData = await langChainResponse.json();
      console.log('LangChain Data:', langChainData);

      console.log('Audio sent to server');
      console.log('Transcription:', data.text);
      console.log('LangChain response:', langChainData);

      if (langChainData.response != '') {

        const ttsResponse = await fetch('http://127.0.0.1:8080/api/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: langChainData.response }),
        });

        if (!ttsResponse.ok) {
          throw new Error(`TTS error! status: ${ttsResponse.status}`);
        }

        const audioBlob = await ttsResponse.blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
        }
      }
      setIsloading(false);
      setIsasking(false);

      // startRecording();

      // Clear the chunks for the next recording
      chunksRef.current = [];

      // Don't automatically restart recording here
    } catch (error) {
      console.error('Error in sendAudioToServer:', error);
      toast({
        variant: "destructive",
        title: "API Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      })
    } finally {
      setIsloading(false)
      setIsasking(false)
    }
  };

  const getTest = async () => {
    const ttsResponse = await fetch('http://127.0.0.1:8080/api/home', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log(ttsResponse);
  }


  // useEffect(() => {
  //   getTest()
  // }, []);



  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleStopRecording = () => {
    stopRecording();
    setIsDialogOpen(false);
  };

  const handleMicrophoneClick = () => {
    if (!isRecording) {
      startRecording();
    }
  };

  return (
    <Card className="w-full h-full max-h-screen overflow-hidden">
      <div className="p-4 bg-gray-100 flex justify-between items-center">
        <CardTitle className="text-lg font-bold">AI Chat Configuration</CardTitle>
        <Button
          onClick={initRecording}
          variant="secondary"
          className="bg-gray-800 hover:bg-gray-500 text-white"
        >
          {'Start Asking'}
        </Button>
      </div>
      <CardContent className="p-4 overflow-y-auto">
        <div className="space-y-4">
          {transcription && (
            <div>
              <h3 className="font-semibold">Transcription:</h3>
              <p className="text-sm">{transcription}</p>
            </div>
          )}
          {langChainResponse && (
            <div>
              <h3 className="font-semibold">Response:</h3>
              <p className="text-sm">{langChainResponse}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">First Message</Label>
              <Input
                id="prompt"
                value={firstMessage || ''}
                onChange={(e) => setFirstMessage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <textarea
                id="prompt"
                value={params.prompt}
                onChange={(e) => setParams({ ...params, prompt: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                value={params.maxTokens}
                onChange={(e) => setParams({ ...params, maxTokens: parseInt(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Temperature: {params.temperature}</Label>
                <Slider
                  value={[params.temperature]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(value) => setParams({ ...params, temperature: value[0] })}
                />
              </div>
              <div className="space-y-2">
                <Label>Top P: {params.topP}</Label>
                <Slider
                  value={[params.topP]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(value) => setParams({ ...params, topP: value[0] })}
                />
              </div>
              <div className="space-y-2">
                <Label>Presence Penalty: {params.presencePenalty}</Label>
                <Slider
                  value={[params.presencePenalty]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(value) => setParams({ ...params, presencePenalty: value[0] })}
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency Penalty: {params.frequencyPenalty}</Label>
                <Slider
                  value={[params.frequencyPenalty]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(value) => setParams({ ...params, frequencyPenalty: value[0] })}
                />
              </div>
            </div>
          </form>
        </div>
        <audio
          ref={audioRef}
          controls
          autoPlay
          onEnded={() => setAudioUrl(null)}
          style={{ display: 'none' }}
        />
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center justify-center p-6">
            <div
              onClick={handleMicrophoneClick}
              className="cursor-pointer"
            >
              {
                isasking ? (
                  <Mic
                    size={64}
                    color='blue'
                  />
                ) : (
                  <MicOff
                    size={64}
                    color='red'
                  />
                )
              }
            </div>
            <div className={`mt-4 flex space-x-1 ${isSpeaking ? '' : 'invisible'}`}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-8 bg-blue-500 rounded-full animate-soundwave"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="mt-4 text-center">
              {isRecording
                ? (isSpeaking ? 'Listening...' : 'Waiting for speech...')
                : 'Click microphone to start recording'}
            </p>
            <Button
              onClick={handleStopRecording}
              variant="destructive"
              className="mt-4"
            >
              Stop Recording
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VoiceRecorder;