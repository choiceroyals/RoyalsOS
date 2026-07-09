"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setMessage("");

    if (!email.trim()) {
      setMessage("Please enter your email first.");
      return;
    }

    try {
      setLoading(true);

      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
        return;
      }

      setMessage("Login link sent. Check your email.");
    } catch (err) {
      setMessage(
        err instanceof Error ? `Error: ${err.message}` : "Unknown login error."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070812] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/10 border border-white/10 rounded-3xl p-8">
        <h1 className="text-4xl font-bold">👑 RoyalOS Login</h1>

        <p className="text-gray-400 mt-3">
          Enter your email to access the AI Workforce Command Center.
        </p>

        <input
          type="email"
          placeholder="your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-6 bg-black/40 border border-white/10 rounded-xl p-4 text-white"
        />

        <button
          type="button"
          onClick={login}
          disabled={loading}
          className="w-full mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-xl p-4 font-semibold"
        >
          {loading ? "Sending..." : "Send Login Link"}
        </button>

        {message && <p className="mt-4 text-purple-300">{message}</p>}
      </div>
    </main>
  );
}