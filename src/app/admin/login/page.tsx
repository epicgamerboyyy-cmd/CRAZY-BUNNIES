import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminConfigError, isAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Owner sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const configError = adminConfigError();

  return (
    <div className={`wrap ${styles.login}`}>
      <h1>Owner sign in</h1>
      {configError ? (
        <div className="notice notice-warn" role="note">
          <strong>The dashboard isn&apos;t set up yet.</strong>
          <p>
            {configError} Add <code>ADMIN_PASSWORD</code> and <code>SESSION_SECRET</code> to the environment variables, then
            redeploy.
          </p>
        </div>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}
