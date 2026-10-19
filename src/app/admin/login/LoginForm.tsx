"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "../actions";
import styles from "../admin.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className={styles.loginForm}>
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className={styles.passwordRow}>
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            className="input"
            autoComplete="current-password"
            required
            autoFocus
            aria-invalid={!!state.error || undefined}
            aria-describedby={state.error ? "password-error" : undefined}
          />
          <button
            type="button"
            className="btn btn-secondary btn-small"
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
          >
            {show ? "Hide" : "Show"}
            <span className="sr-only"> password</span>
          </button>
        </div>
        {state.error && (
          <p id="password-error" className="field-error" role="alert">
            {state.error}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
