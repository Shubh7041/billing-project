import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button, Card, LoadingState } from "../../components/ui";
import { PageContainer } from "../../components/layout/PageContainer";
import { ROUTES } from "../../app/routePaths";
import { useAuth } from "./authContext";
import "./auth.css";

interface ReturnLocation {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { session, isLoading, error: sessionError, configurationError, signInWithPassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return <main className="auth-loading"><LoadingState message="Restoring your session" /></main>;
  }
  if (session) return <Navigate to={ROUTES.dashboard} replace />;

  const returnLocation = location.state as ReturnLocation | null;
  const returnPath = returnLocation?.from?.pathname;
  const destination = returnPath?.startsWith("/") && returnPath !== ROUTES.login
    ? returnPath
    : ROUTES.dashboard;
  const visibleError = configurationError ?? formError ?? sessionError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signInWithPassword(email, password);
      navigate(destination, { replace: true });
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <PageContainer title="Sign in" description="Use your Cracker Mall staff account to continue.">
        <Card className="auth-card">
          <form className="auth-form" onSubmit={handleSubmit}>
            {visibleError && <p className="auth-error" role="alert">{visibleError}</p>}
            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
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
                autoComplete="current-password"
                required
                disabled={Boolean(configurationError) || isSubmitting}
              />
            </label>
            <Button type="submit" fullWidth loading={isSubmitting} disabled={Boolean(configurationError)}>
              Sign in
            </Button>
            <p className="auth-helper-text">
              Accounts are provisioned by a store administrator. Self-service sign-up is not available.
            </p>
          </form>
        </Card>
      </PageContainer>
    </main>
  );
}