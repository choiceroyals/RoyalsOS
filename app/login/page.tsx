"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendLoginLink() {
    const cleanEmail = email.trim();

    setMessage("");

    if (!cleanEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        setMessage(`Login error: ${error.message}`);
        return;
      }

      setMessage("Login link sent. Check your email.");
    } catch (error) {
      console.error("RoyalOS login error:", error);

      setMessage(
        error instanceof Error
          ? `Login error: ${error.message}`
          : "RoyalOS could not send the login link."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070812] text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold">👑 RoyalOS Login</h1>

        <p className="mt-3 text-gray-400">
          Enter your email to access the AI Workforce Command Center.
        </p>

        <label
          htmlFor="email"
          className="mt-6 block text-sm font-semibold text-gray-300"
        >
          Email address
        </label>

        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !loading) {
              void sendLoginLink();
            }
          }}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 p-4 text-white outline-none placeholder:text-gray-500 focus:border-purple-500"
        />

        <button
          type="button"
          onClick={() => void sendLoginLink()}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-purple-600 p-4 font-semibold transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
        >
          {loading ? "Sending login link..." : "Send Login Link"}
        </button>

        {message && (
          <p
            className={`mt-4 rounded-xl p-3 text-sm ${
              message.startsWith("Login link sent")
                ? "bg-green-500/10 text-green-300"
                : "bg-red-500/10 text-red-300"
            }`}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}