"use client";
import { useState } from "react";
import Link from "next/link";
export default function Password() {
  const [message, setMessage] = useState("");
  return (
    <main className="auth-page">
      <h1>A fresh start.</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const password = new FormData(e.currentTarget).get("password");
          const r = await fetch("/api/auth", {
            method: "POST",
            body: JSON.stringify({ action: "update", password }),
          });
          const v = await r.json();
          setMessage(
            v.error ?? "Password updated. You can return to your library.",
          );
        }}
      >
        <label>
          New password
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="primary">Update password</button>
      </form>
      <p role="status">{message}</p>
      <Link href="/app">Return to Reading Room</Link>
    </main>
  );
}
