"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials");
    } else {
      router.push("/projects");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background lightning streaks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-px h-full opacity-10" style={{ background: "linear-gradient(180deg, transparent, #ff0000 40%, #ff000088 60%, transparent)", animation: "surge 4s linear infinite" }} />
        <div className="absolute top-0 right-1/3 w-px h-full opacity-8" style={{ background: "linear-gradient(180deg, transparent, #cc000066 50%, transparent)", animation: "surge 6s linear infinite 2s" }} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5" style={{ width: 110, height: 110 }}>
            {/* Outer rings */}
            <div className="absolute inset-0 rounded-full" style={{ border: "1px dashed #cc000033", animation: "spin-slow 20s linear infinite" }} />
            <div className="absolute inset-2 rounded-full" style={{ border: "1px solid #cc000044", boxShadow: "0 0 20px #cc000044, inset 0 0 20px #cc000011" }} />
            {/* Corner sparks */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
              <Zap size={10} style={{ color: "#ff4444", filter: "drop-shadow(0 0 5px #ff4444)" }} />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2">
              <Zap size={10} style={{ color: "#ff4444", filter: "drop-shadow(0 0 5px #ff4444)" }} />
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2">
              <Zap size={8} style={{ color: "#cc0000", filter: "drop-shadow(0 0 3px #cc0000)", transform: "rotate(-90deg)" }} />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2">
              <Zap size={8} style={{ color: "#cc0000", filter: "drop-shadow(0 0 3px #cc0000)", transform: "rotate(90deg)" }} />
            </div>
            {/* Logo */}
            <div className="absolute inset-4">
              <Image
                src="/logo.png"
                alt="TD Manager"
                fill
                className="object-contain"
                style={{ animation: "logo-breathe 4s ease-in-out infinite" }}
              />
            </div>
          </div>

          <h1
            className="text-2xl font-bold tracking-widest uppercase glow-red"
            style={{ fontFamily: "var(--font-geist-mono)", color: "#ff3333" }}
          >
            TD MANAGER
          </h1>
          <p className="text-xs tracking-widest mt-1 uppercase font-mono" style={{ color: "#442222" }}>
            Test Developer System
          </p>
        </div>

        <div className="red-divider mb-8" />

        {/* Card */}
        <div className="cyber-card cyber-card-red p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={12} style={{ color: "#cc0000" }} />
            <p className="text-xs tracking-widest uppercase" style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)" }}>
              Authenticate
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-mono">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cyber-input w-full"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1.5 font-mono">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cyber-input w-full"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2 rounded" style={{ background: "#1a0000", border: "1px solid #660000" }}>
                <Zap size={10} style={{ color: "#ff4444", flexShrink: 0 }} />
                <p className="text-xs text-red-400 font-mono">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cyber-btn w-full mt-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full border-t border-red-500 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Zap size={13} />
                  Login
                </>
              )}
            </button>
          </form>
        </div>

        <div className="red-divider mt-8" />
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-700 font-mono tracking-wider">INTERNAL USE ONLY</p>
          <a
            href="/report"
            className="text-xs font-mono transition-colors flex items-center gap-1 hover:text-red-400"
            style={{ color: "#443333" }}
          >
            Report a ticket →
          </a>
        </div>
      </div>
    </div>
  );
}
