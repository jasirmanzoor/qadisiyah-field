'use client';

import { useRef, useState } from 'react';

// Minimal shape of the non-standard Web Speech API we rely on.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceNotes({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [supported] = useState(() => getSpeechRecognition() !== null);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<'en-US' | 'ar-SA'>('en-US');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const toggle = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (result.isFinal) onTranscript(result[0].transcript);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  if (!supported) return null;

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
          listening ? 'bg-red-500 text-white' : 'bg-surface-2 text-foreground'
        }`}
      >
        {listening ? '⏺ Listening…' : '🎙 Voice note'}
      </button>
      <div className="flex rounded-full bg-surface-2 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setLang('en-US')}
          className={`rounded-full px-2 py-1 font-medium ${lang === 'en-US' ? 'bg-accent text-accent-contrast' : 'text-muted'}`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang('ar-SA')}
          className={`rounded-full px-2 py-1 font-medium ${lang === 'ar-SA' ? 'bg-accent text-accent-contrast' : 'text-muted'}`}
        >
          AR
        </button>
      </div>
    </div>
  );
}
