import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Card, LoadingState } from "../../components/ui";
import { PageContainer } from "../../components/layout/PageContainer";
import { ROUTES } from "../../app/routePaths";
import { useAuth } from "./authContext";

interface RegistrationReceipt {
  userId: string;
  email: string;
  storeName: string;
  sessionAvailable: boolean;
}

export function OwnerSetupPage() {
  const { session, isLoading, configurationError, signUpWithPassword, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [registration, setRegistration] = useState<RegistrationReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signUpWithPassword({
        email,
        password,
        displayName,
        requestedStoreName: storeName,
      });
      setRegistration({
        userId: result.userId,
        email: email.trim(),
        storeName: storeName.trim(),
        sessionAvailable: result.sessionAvailable,
      });
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Unable to create the Auth account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyUserId(userId: string) {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
    } catch {
      setError("Clipboard access is unavailable. Select and copy the Auth user ID manually.");
    }
  }

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      setRegistration(null);
      setCopied(false);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Unable to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return <main className="auth-loading"><LoadingState message="Restoring your session" /></main>;
  }

  const activeUserId = session?.user.id
    ?? (registration?.sessionAvailable ? registration.userId : null);
  const confirmationPending = !session && registration !== null && !registration.sessionAvailable;
  const activeEmail = registration?.email ?? session?.user.email ?? "";
  const requestedStoreName = registration?.storeName
    ?? (typeof session?.user.user_metadata.requested_store_name === "string"
      ? session.user.user_metadata.requested_store_name
      : null);

  return (
    <main className="auth-page">
      <PageContainer
        title="First-time owner setup"
        description="Create the first Auth account and request the initial store. Store ownership is provisioned separately by a trusted administrator."
      >
        <Card className="auth-card">
          {configurationError && <p className="auth-error" role="alert">{configurationError}</p>}
          {error && activeUserId && <p className="auth-error" role="alert">{error}</p>}

          {activeUserId || confirmationPending ? (
            <div className="auth-form">
              <div className="owner-setup-status" role="status">
                <h2>{confirmationPending ? "Confirm your email" : "Auth account ready"}</h2>
                <p>
                  {confirmationPending
                    ? `Supabase returned no session. If email confirmation is enabled, check ${activeEmail} and follow its link. If no email arrives, try signing in or contact the administrator; Auth may not reveal whether the address already has an account.`
                    : "You have an Auth session, but no store access has been granted yet. A trusted administrator must run the reviewed bootstrap SQL for this exact user ID."}
                </p>
              </div>
              {activeUserId && (
                <>
                  <label>
                    <span>Auth user ID for administrator</span>
                    <input readOnly value={activeUserId} aria-label="Auth user ID" />
                  </label>
                  <Button type="button" variant="outline" onClick={() => void copyUserId(activeUserId)}>
                    {copied ? "Copied" : "Copy user ID"}
                  </Button>
                </>
              )}
              {activeUserId && requestedStoreName && (
                <p className="auth-helper-text">
                  Requested store: {requestedStoreName}. This request metadata is not trusted authorization; the administrator must verify the name before provisioning.
                </p>
              )}
              {session && (
                <Button type="button" variant="ghost" onClick={() => void handleSignOut()} loading={isSigningOut}>
                  Use a different account
                </Button>
              )}
              <p className="auth-helper-text">
                After email confirmation and administrator provisioning, use <Link to={ROUTES.login}>Sign in</Link>. This page never assigns roles or writes store records.
              </p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <label>
                <span>Owner display name</span>
                <input
                  name="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  required
                  disabled={Boolean(configurationError) || isSubmitting}
                />
              </label>
              <label>
                <span>Store name</span>
                <input
                  name="storeName"
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  autoComplete="organization"
                  required
                  disabled={Boolean(configurationError) || isSubmitting}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  disabled={Boolean(configurationError) || isSubmitting}
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={Boolean(configurationError) || isSubmitting}
                />
              </label>
              <Button type="submit" fullWidth loading={isSubmitting} disabled={Boolean(configurationError)}>
                Create Auth account
              </Button>
              <p className="auth-helper-text">
                This creates only a Supabase Auth user. It does not create a profile, store, or owner membership.
              </p>
              <p className="auth-helper-text">
                Already have an account? <Link to={ROUTES.login}>Return to Sign in</Link>
              </p>
            </form>
          )}
        </Card>
      </PageContainer>
    </main>
  );
}
