import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

export function SignupForm({ kind }: { kind: "waitlist" | "clinic" }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(""), 4500);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          email: data.get("email"),
          name: data.get("name") || "",
          clinic: data.get("clinic") || "",
          website: data.get("website") || "",
          consent: data.get("consent") === "on",
        }),
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json();
      if (!response.ok || result.saved !== true)
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Please try again shortly.",
        );
      const message =
        kind === "clinic"
          ? "Thank you. Your clinic pilot inquiry has been saved."
          : "Thank you. You’re on the Papaya Health waitlist.";
      setSaved(true);
      showToast(message);
    } catch (failure) {
      setError(
        failure instanceof Error &&
          failure.name !== "TimeoutError" &&
          failure.name !== "TypeError"
          ? failure.message
          : "We could not confirm your signup. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="signup-container">
      {toastMessage && (
        <p role="status" className="signup-toast">
          {toastMessage}
        </p>
      )}
      {saved ? (
        <p role="status" className="signup-success">
          {kind === "clinic"
            ? "Thank you. Your clinic pilot inquiry has been saved."
            : "Thank you. You’re on the Papaya Health waitlist."}
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="signup-form"
          aria-label={
            kind === "clinic" ? "Clinic pilot inquiry" : "Join the waitlist"
          }
        >
          {kind === "clinic" && (
            <>
              <label htmlFor={`${id}-name`}>
                Your name
                <input
                  id={`${id}-name`}
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
              <label htmlFor={`${id}-clinic`}>
                Clinic name
                <input
                  id={`${id}-clinic`}
                  name="clinic"
                  autoComplete="organization"
                  maxLength={160}
                  required
                />
              </label>
            </>
          )}
          <label htmlFor={`${id}-email`}>
            {kind === "clinic" ? "Work email" : "Email address"}
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
          <div className="signup-trap" aria-hidden="true">
            <label htmlFor={`${id}-website`}>
              Leave this empty
              <input
                id={`${id}-website`}
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          <label className="signup-consent">
            <input name="consent" type="checkbox" required />
            <span>
              {kind === "clinic"
                ? "I agree to be contacted about a Papaya Health clinic pilot."
                : "I agree to receive email updates about Papaya Health’s launch."}{" "}
              See our <Link to="/privacy">Privacy Policy</Link>.
            </span>
          </label>
          {error && (
            <p role="alert" className="signup-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="p-button p-button--primary"
            disabled={busy}
          >
            {busy
              ? "Saving…"
              : kind === "clinic"
                ? "Request pilot information"
                : "Join the waitlist"}
          </button>
        </form>
      )}
    </div>
  );
}
