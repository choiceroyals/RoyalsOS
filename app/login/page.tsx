"use client";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#070812] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/10 border border-white/10 rounded-3xl p-8">
        <h1 className="text-4xl font-bold">👑 RoyalOS Login Test</h1>

        <p className="mt-4">
          Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "FOUND" : "MISSING"}
        </p>

        <p className="mt-2">
          Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "FOUND" : "MISSING"}
        </p>
      </div>
    </main>
  );
}