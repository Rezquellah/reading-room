"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, BookOpen, Mail } from "lucide-react";
import {
  onboardingSchema,
  welcomeGoals,
  welcomeLanguages,
  type OnboardingPreferences,
} from "@/lib/onboarding";

export default function SignupJourney({
  configured,
  onSignIn,
}: {
  configured: boolean;
  onSignIn: () => void;
}) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<OnboardingPreferences>({
    language: "English",
    goal: "understand",
    minutes: "15",
    interest: "",
  });
  const [languageChoice, setLanguageChoice] = useState("English");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const dialog = heading.current?.closest('[role="dialog"]');
    if (dialog) dialog.scrollTop = 0;
  }, [step, sent]);
  function update<K extends keyof OnboardingPreferences>(
    key: K,
    value: OnboardingPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = onboardingSchema.safeParse(preferences);
    if (!parsed.success) {
      setError("Please enter a language between 2 and 30 characters.");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup",
          email,
          password,
          onboarding: parsed.data,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "We couldn’t create your account. Please try again.",
        );
      setPassword("");
      if (result.signedIn) {
        location.reload();
        return;
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div className="welcome-journey welcome-confirmation">
        <Mail size={34} strokeWidth={1.3} />
        <h3 ref={heading} tabIndex={-1}>
          One small step: check your email.
        </h3>
        <p>
          Follow the confirmation link sent to <strong>{email}</strong>, then
          sign in. Your choices will be waiting for you.
        </p>
        <div className="welcome-preview">
          <BookOpen size={25} />
          <div>
            <strong>{preferences.language} Library</strong>
            <span>{welcomeGoals[preferences.goal].title}</span>
          </div>
        </div>
        <p className="muted">
          Already registered? Sign in with your existing account. If a
          confirmation message doesn’t arrive, check your spam folder.
        </p>
        <button className="primary" onClick={onSignIn}>
          Go to sign in <ArrowRight size={16} />
        </button>
      </div>
    );
  const titles = [
    "What language will you learn in?",
    "What brings you to Reading Room?",
    "Make room for a small habit.",
    "Your room is ready to begin.",
  ];
  const descriptions = [
    "Choose the language for your first workspace and study explanations. You can add more workspaces later.",
    "Pick the purpose that feels right today. You can adjust it for each book or chapter.",
    "A little consistency goes a long way. Choose a session length that fits your life—this is a guide, not a commitment.",
    "Create your account to save your choices. We’ll create your workspace after you confirm your email and sign in.",
  ];
  return (
    <div className="welcome-journey">
      <ol className="welcome-progress" aria-label="Registration progress">
        {["Language", "Purpose", "Rhythm", "Account"].map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={i <= step ? "reached" : ""}
          >
            <span>{i < step ? <Check size={12} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <span className="eyebrow">
        STEP {step + 1} OF 4 · YOUR OWN WAY TO LEARN
      </span>
      <h3 ref={heading} tabIndex={-1}>
        {titles[step]}
      </h3>
      <p className="welcome-description">{descriptions[step]}</p>
      <form onSubmit={submit}>
        {step === 0 && (
          <>
            <label>
              Learning language
              <select
                value={languageChoice}
                onChange={(e) => {
                  setLanguageChoice(e.target.value);
                  update(
                    "language",
                    e.target.value === "Other" ? "" : e.target.value,
                  );
                }}
              >
                {welcomeLanguages.map((language) => (
                  <option key={language}>{language}</option>
                ))}
                <option>Other</option>
              </select>
            </label>
            {languageChoice === "Other" && (
              <label>
                Your language
                <input
                  required
                  minLength={2}
                  maxLength={30}
                  value={preferences.language}
                  onChange={(e) => update("language", e.target.value)}
                  placeholder="For example, Dutch"
                />
              </label>
            )}
            <div className="welcome-preview">
              <BookOpen size={27} strokeWidth={1.3} />
              <div>
                <strong>
                  {preferences.language || "Your language"} Library
                </strong>
                <span>Your first workspace, created automatically.</span>
              </div>
            </div>
            <p className="welcome-footnote">
              This sets your learning language. App navigation currently
              supports English and French.
            </p>
          </>
        )}
        {step === 1 && (
          <fieldset className="welcome-options">
            <legend className="sr-only">Your learning purpose</legend>
            {Object.entries(welcomeGoals).map(([value, goal]) => (
              <label className="welcome-option" key={value}>
                <input
                  type="radio"
                  name="goal"
                  value={value}
                  checked={preferences.goal === value}
                  onChange={() =>
                    update("goal", value as OnboardingPreferences["goal"])
                  }
                />
                <span>
                  <strong>{goal.title}</strong>
                  <small>{goal.detail}</small>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {step === 2 && (
          <>
            <fieldset className="welcome-rhythm">
              <legend>A comfortable session</legend>
              {[
                ["5", "5 minutes", "A small beginning"],
                ["15", "15 minutes", "A little room to think"],
                ["30", "30 minutes", "Time to go deeper"],
                ["flexible", "Keep it flexible", "Follow my own pace"],
              ].map(([value, title, detail]) => (
                <label className="welcome-option" key={value}>
                  <input
                    type="radio"
                    name="minutes"
                    value={value}
                    checked={preferences.minutes === value}
                    onChange={() =>
                      update(
                        "minutes",
                        value as OnboardingPreferences["minutes"],
                      )
                    }
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <label>
              What would you like to explore?{" "}
              <span className="muted">(optional)</span>
              <textarea
                maxLength={300}
                rows={2}
                value={preferences.interest}
                onChange={(e) => update("interest", e.target.value)}
                placeholder={
                  preferences.goal === "exam"
                    ? "For example, biology for my final exam"
                    : preferences.goal === "skill"
                      ? "For example, negotiation or public speaking"
                      : "For example, psychology, history, or a book you love"
                }
              />
            </label>
            <p className="welcome-footnote">
              No reminder emails or notifications are enabled by this choice.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <div className="welcome-preview">
              <BookOpen size={25} />
              <div>
                <strong>{preferences.language} Library</strong>
                <span>
                  {welcomeGoals[preferences.goal].title} ·{" "}
                  {preferences.minutes === "flexible"
                    ? "Your own pace"
                    : `${preferences.minutes}-minute sessions`}
                </span>
              </div>
            </div>
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <p className="welcome-footnote">
              Use at least 8 characters. Read how we handle your account and
              study content in our{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy page
              </Link>
              .
            </p>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="welcome-controls">
          {step > 0 && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <button
            className="primary"
            disabled={busy || (step === 3 && !configured)}
          >
            {busy
              ? "Creating your account…"
              : step === 3
                ? "Create my reading room"
                : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
      <button
        className="text-button welcome-signin"
        onClick={onSignIn}
        disabled={busy}
      >
        Already have an account? Sign in
      </button>
    </div>
  );
}
