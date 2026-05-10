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
  voice?: "female" | "male" | "professional" | "youth";
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceReturn {
  speak: (text: string, lang?: string) => Promise<void>;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  ttsSupported: boolean;
  ttsEngine: "edge" | "browser" | "none";

  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  isListening: boolean;
  transcript: string;
  asrSupported: boolean;
  asrEngine: "native" | "browser" | "none";
}

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor injects this object on native iOS/Android
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  if (!cap || typeof cap.isNativePlatform !== "function" || !cap.isNativePlatform()) {
    return false;
  }
  // Plugin must also be actually registered (Capacitor 7 SPM mode may skip CocoaPods-only plugins)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugins = cap.Plugins || {};
  return "SpeechRecognition" in plugins;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    lang = "zh-CN",
    rate = 0.9,
    voice = "female",
    onResult,
    onError,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionShim | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const browserTtsSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  // Server TTS always works (network call to /api/tts), so ttsSupported is effectively always true client-side
  const ttsSupported = typeof window !== "undefined";
  const ttsEngine: UseVoiceReturn["ttsEngine"] = ttsSupported ? "edge" : "none";

  // Cleanup audio object URL
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // Browser TTS fallback
  const browserSpeak = useCallback(
    (text: string, overrideLang?: string) => {
      if (!browserTtsSupported || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = overrideLang || lang;
      u.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const zh = voices.find((v) => v.lang === "zh-CN") || voices.find((v) => v.lang.startsWith("zh"));
      if (zh) u.voice = zh;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [browserTtsSupported, lang, rate],
  );

  // Server TTS (Microsoft Edge Neural) with browser fallback
  const speak = useCallback(
    async (text: string, overrideLang?: string) => {
      if (!text || typeof window === "undefined") return;
      cleanupAudio();
      setIsSpeaking(true);

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice, rate }),
        });

        if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);

        const blob = await res.blob();
        if (blob.size === 0) throw new Error("Empty audio blob");

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          cleanupAudio();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          cleanupAudio();
          // Fallback to browser TTS on play error
          browserSpeak(text, overrideLang);
        };
        await audio.play();
      } catch (err) {
        console.warn("Edge TTS failed, falling back to browser:", err);
        cleanupAudio();
        browserSpeak(text, overrideLang);
      }
    },
    [voice, rate, cleanupAudio, browserSpeak],
  );

  const stopSpeaking = useCallback(() => {
    cleanupAudio();
    if (browserTtsSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [browserTtsSupported, cleanupAudio]);

  // ASR support detection
  const browserAsrSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const nativeAsrSupported = isCapacitorNative();
  const asrSupported = browserAsrSupported || nativeAsrSupported;
  const asrEngine: UseVoiceReturn["asrEngine"] = nativeAsrSupported
    ? "native"
    : browserAsrSupported
      ? "browser"
      : "none";

  // Native ASR via @capacitor-community/speech-recognition
  const startNativeListening = useCallback(async () => {
    try {
      const mod = await import("@capacitor-community/speech-recognition");
      const SpeechRecognition = mod.SpeechRecognition;

      const perm = await SpeechRecognition.checkPermissions();
      if (perm.speechRecognition !== "granted") {
        const req = await SpeechRecognition.requestPermissions();
        if (req.speechRecognition !== "granted") {
          onError?.("Speech recognition permission denied");
          return;
        }
      }

      setTranscript("");
      setIsListening(true);

      // Listen for partial results stream
      SpeechRecognition.addListener("partialResults", (data: { matches?: string[] }) => {
        if (data.matches?.[0]) setTranscript(data.matches[0]);
      });

      const result = await SpeechRecognition.start({
        language: lang,
        maxResults: 1,
        prompt: "请说中文",
        partialResults: true,
        popup: false,
      });

      // result on iOS contains final matches
      const finalText = result?.matches?.[0] || "";
      if (finalText) {
        setTranscript(finalText);
        onResult?.(finalText);
      }
      setIsListening(false);
    } catch (err) {
      console.warn("Native ASR error:", err);
      onError?.(err instanceof Error ? err.message : String(err));
      setIsListening(false);
    }
  }, [lang, onResult, onError]);

  const stopNativeListening = useCallback(async () => {
    try {
      const mod = await import("@capacitor-community/speech-recognition");
      await mod.SpeechRecognition.stop();
    } catch (err) {
      console.warn("Native ASR stop error:", err);
    }
    setIsListening(false);
  }, []);

  // Browser ASR (Web Speech)
  const startBrowserListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.abort();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      onError?.("Speech recognition is not supported");
      return;
    }
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
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const current = finalText || interim;
      setTranscript(current);
      if (finalText) onResult?.(finalText);
    };
    recognition.onerror = (event: { error: string }) => {
      if (event.error !== "aborted") onError?.(event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, onResult, onError]);

  const stopBrowserListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (nativeAsrSupported) await startNativeListening();
    else if (browserAsrSupported) startBrowserListening();
    else onError?.("Speech recognition not available");
  }, [nativeAsrSupported, browserAsrSupported, startNativeListening, startBrowserListening, onError]);

  const stopListening = useCallback(async () => {
    if (nativeAsrSupported) await stopNativeListening();
    else stopBrowserListening();
  }, [nativeAsrSupported, stopNativeListening, stopBrowserListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanupAudio]);

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    ttsSupported,
    ttsEngine,
    startListening,
    stopListening,
    isListening,
    transcript,
    asrSupported,
    asrEngine,
  };
}
