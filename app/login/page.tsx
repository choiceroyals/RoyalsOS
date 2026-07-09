"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function login() {
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login link sent. Check your email.");
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
          onClick={login}
          className="w-full mt-4 bg-purple-600 hover:bg-purple-700 rounded-xl p-4 font-semibold"
        >
          Send Login Link
        </button>

        {message && <p className="mt-4 text-purple-300">{message}</p>}
      </div>
    </main>
  );
}