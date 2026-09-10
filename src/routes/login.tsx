import { createFileRoute, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { COPY } from "@/lib/i18n";
import { formatJoinCode } from "@/lib/utils";
import { usePrefs } from "@/stores/prefs";
import { useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    team: typeof s.team === "string" ? s.team : "",
  }),
  component: Login,
});

const JOIN_KEY = "qads-join";

function stashCode(code: string) {
  const v = code.trim();
  if (typeof sessionStorage === "undefined") return;
  if (v) sessionStorage.setItem(JOIN_KEY, v);
  else sessionStorage.removeItem(JOIN_KEY);
}

function Login() {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const { user, isPending } = useCurrentUserState();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamCode, setTeamCode] = useState(() => (search.team ? formatJoinCode(search.team) : ""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.team) stashCode(search.team);
  }, [search.team]);

  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }
  if (user) return <Navigate to="/" />;

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    stashCode(teamCode);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 text-fg">
      <div className="w-full max-w-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Al Qadisiyah · East Riyadh</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Qadisiyah Field</h1>
        <p className="mt-2 text-sm text-muted">{t.signInBlurb}</p>
        <p className="mt-1 text-sm text-muted" dir="rtl">
          {COPY.ar.signInBlurb}
        </p>

        {authEnabled ? (
          <div className="mt-6 flex flex-col gap-2">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                variant="secondary"
                className="w-full"
                onClick={() => {
                  stashCode(teamCode);
                  signIn(p.providerId, { callbackURL: "/" });
                }}
              >
                Continue with {p.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        )}

        <p className="my-4 text-center text-xs text-faint">or with email</p>
        <form className="flex flex-col gap-2" onSubmit={(e) => void onEmail(e)}>
          {mode === "up" ? (
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          ) : null}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            required
            minLength={8}
          />
          <Input
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
            placeholder={t.teamCodeOptional}
            autoComplete="off"
            inputMode="text"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Working…" : mode === "up" ? t.createAccount : t.signIn}
          </Button>
        </form>
        <button
          type="button"
          className="mt-3 w-full text-center text-sm text-muted"
          onClick={() => setMode(mode === "up" ? "in" : "up")}
        >
          {mode === "up" ? t.haveAccount : t.needAccount}
        </button>
      </div>
    </main>
  );
}
