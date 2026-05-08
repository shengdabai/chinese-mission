"use client";
import { useState, useCallback, useRef, useEffect } from "react";

/* Web Speech API type shims (not in all TS libs) */
interface SpeechRecognitionShim extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface UseVoiceOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceReturn {
  // TTS
  speak: (text: string, lang?: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  ttsSupported: boolean;

  // ASR
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  transcript: string;
  asrSupported: boolean;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    lang = "zh-CN",
    rate = 0.8,
    pitch = 1,
    onResult,
    onError,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionShim | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const ttsSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const asrSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Find best Chinese voice
  const getChineseVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!ttsSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    // Prefer zh-CN voices, then any zh voice
    const zhCN = voices.find(
      (v) => v.lang === "zh-CN" || v.lang === "zh_CN"
    );
    if (zhCN) return zhCN;
    const zhAny = voices.find((v) => v.lang.startsWith("zh"));
    if (zhAny) return zhAny;
    return null;
  }, [ttsSupported]);

  // TTS: speak
  const speak = useCallback(
    (text: string, overrideLang?: string) => {
      if (!ttsSupported || !text) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = overrideLang || lang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      const voice = getChineseVoice();
      if (voice) utterance.voice = voice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [ttsSupported, lang, rate, pitch, getChineseVoice]
  );

  // TTS: stop
  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [ttsSupported]);

  // ASR: start listening
  const startListening = useCallback(() => {
    if (!asrSupported) {
      onError?.("Speech recognition is not supported in this browser.");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition: SpeechRecognitionShim = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
      let interim = "";
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      const current = finalText || interim;
      setTranscript(current);
      if (finalText) {
        onResult?.(finalText);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== "aborted") {
        onError?.(event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [asrSupported, lang, onResult, onError]);

  // ASR: stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Ensure voices are loaded (some browsers load them async)
  useEffect(() => {
    if (!ttsSupported) return;
    const handleVoicesChanged = () => {
      // Trigger re-render when voices load
    };
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, [ttsSupported]);

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    ttsSupported,
    startListening,
    stopListening,
    isListening,
    transcript,
    asrSupported,
  };
}
