"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <div className="text-center">
        <div className="text-4xl mb-4">🇨🇳</div>
        <h1 className="text-2xl font-bold text-slate-900">Chinese Mission</h1>
        <p className="text-slate-500 mt-2">Loading...</p>
      </div>
    </div>
  );
}
