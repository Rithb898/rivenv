"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type SignedInProps = {
  user: {
    name: string;
    email: string;
  };
};

export default function SignedIn({ user }: SignedInProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setPending(true);
    setError(null);

    try {
      const { error: signOutError } = await authClient.signOut();

      if (signOutError) {
        setError(signOutError.message || "Unable to sign out.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <h1 className="font-heading text-2xl tracking-tight">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          loading={pending}
          onClick={handleSignOut}
          className="w-full"
        >
          Sign out
        </Button>
      </div>
    </main>
  );
}
