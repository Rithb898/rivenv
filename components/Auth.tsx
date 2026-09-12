"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { authClient } from "@/lib/auth-client";

type AuthMode = "signin" | "signup";

const Auth = () => {
  return <AuthForm />;
};

function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("signin");

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background px-4 py-12 text-foreground">
      <PageBackdrop />
      <div className="relative w-full max-w-sm">
        <Card className="p-7">
          <CardHeader className="flex flex-col items-center gap-4 p-0 text-center">
            <BrandName />
            <div className="flex flex-col gap-1.5">
              <h1 className="font-heading text-2xl tracking-tight">
                {mode === "signin" ? "Welcome back" : "Create an account"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {mode === "signin"
                  ? "Sign in to RiVenv"
                  : "Create your RiVenv account"}
              </p>
            </div>
          </CardHeader>

          <CardPanel className="mt-6 flex flex-col gap-5 p-0">
            {mode === "signin" ? <SignInForm /> : <SignUpForm />}
            <FooterLinks mode={mode} onModeChange={setMode} />
          </CardPanel>
        </Card>
      </div>
    </div>
  );
}

function PageBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background: [
          "radial-gradient(50% 40% at 0% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 70%)",
          "radial-gradient(55% 45% at 100% 100%, color-mix(in oklch, var(--foreground) 8%, transparent), transparent 70%)",
        ].join(", "),
      }}
    />
  );
}

function BrandName() {
  return (
    <span className="font-heading text-xl font-semibold tracking-tight">
      RiVenv
    </span>
  );
}

function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setPending(true);
    setError(null);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Unable to sign in.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          nativeInput
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          reveal={reveal}
          onRevealChange={setReveal}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (signUpError) {
        setError(signUpError.message || "Unable to create your account.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to create your account. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          type="text"
          required
          placeholder="Your name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          nativeInput
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="signup-email">Email</FieldLabel>
        <Input
          id="signup-email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          nativeInput
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="signup-password">Password</FieldLabel>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          reveal={reveal}
          onRevealChange={setReveal}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="confirm-password">
          Confirm password
        </FieldLabel>
        <Input
          id="confirm-password"
          type={reveal ? "text" : "password"}
          required
          placeholder="Enter your password again"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          nativeInput
        />
      </Field>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
        Create account
      </Button>
    </form>
  );
}

function PasswordInput({
  id,
  autoComplete,
  value,
  onChange,
  reveal,
  onRevealChange,
}: {
  id: string;
  autoComplete: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  reveal: boolean;
  onRevealChange: (reveal: boolean) => void;
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        type={reveal ? "text" : "password"}
        required
        placeholder="Enter your password"
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        nativeInput
      />
      <InputGroupAddon align="inline-end">
        <button
          type="button"
          onClick={() => onRevealChange(!reveal)}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {reveal ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      </InputGroupAddon>
    </InputGroup>
  );
}

function FooterLinks({
  mode,
  onModeChange,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}) {
  const isSignIn = mode === "signin";

  return (
    <div className="flex items-baseline justify-between gap-4 text-xs">
      {isSignIn ? (
        <a
          href="#"
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Forgot password?
        </a>
      ) : (
        <span />
      )}
      <p className="text-muted-foreground">
        {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => onModeChange(isSignIn ? "signup" : "signin")}
          className="cursor-pointer text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isSignIn ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}


export default Auth;
