"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/editor");
    } else {
      setError("That's not it… try again ♡");
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center bg-canvas-bg px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-paper border border-hairline rounded-2xl px-8 py-10 text-center shadow-[0_12px_40px_rgba(43,38,32,0.08)]"
      >
        <div className="font-[family-name:var(--font-script)] text-accent text-4xl mb-1">
          Our Story
        </div>
        <p className="label-caps mb-8">The editor is just for us</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Secret word"
          autoFocus
          className="w-full border border-hairline rounded-lg px-4 py-3 text-center outline-none focus:border-accent transition-colors"
        />
        {error && <p className="text-accent text-sm mt-3">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-6 w-full bg-ink text-paper rounded-lg py-3 text-sm tracking-widest uppercase disabled:opacity-40 hover:bg-accent transition-colors"
        >
          {busy ? "…" : "Open"}
        </button>
      </form>
    </main>
  );
}
