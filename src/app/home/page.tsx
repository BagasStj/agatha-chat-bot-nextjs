'use client'
import { Toaster } from '@/components/ui/toaster';
import VoiceRecorder from '@/components/VoiceRecorder';

export default function Home() {
  return (
    <>
      <Toaster />
      <main className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-4xl h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] md:h-[calc(100vh-4rem)] lg:h-[calc(100vh-6rem)]">
          <VoiceRecorder />
        </div>
      </main>
    </>
  );
}