"use client";

import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

export type DashboardCredential = {
  id: string;
  collectionId: string;
  name: string;
  type: string;
  provider: string | null;
  exportName: string | null;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

type CredentialsDashboardProps = {
  workspaceId: string;
  collectionId: string;
  workspaceName: string;
  user: {
    name: string;
    email: string;
  };
  initialCredentials: DashboardCredential[];
};

type CredentialForm = {
  name: string;
  type: string;
  provider: string;
  exportName: string;
  value: string;
};

const EMPTY_FORM: CredentialForm = {
  name: "",
  type: "api_key",
  provider: "",
  exportName: "",
  value: "",
};

const TYPE_LABELS: Record<string, string> = {
  api_key: "API key",
  access_token: "Access token",
  environment_variable: "ENV variable",
  password: "Password",
  generic_secret: "Secret",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

function maskedValue(value?: string) {
  if (!value) return "••••••••••••••••";
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

export default function CredentialsDashboard({
  workspaceId,
  collectionId,
  workspaceName,
  user,
  initialCredentials,
}: CredentialsDashboardProps) {
  const router = useRouter();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<DashboardCredential | null>(null);
  const [form, setForm] = useState<CredentialForm>(EMPTY_FORM);
  const [busy, setBusy] = useState<"create" | "rotate" | "reveal" | "signout" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCredentials(initialCredentials);
  }, [initialCredentials]);

  const initials = useMemo(
    () =>
      user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [user.name],
  );

  const updateForm = (field: keyof CredentialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.value) {
      setError("Give this credential a name and a value.");
      return;
    }

    setBusy("create");
    setError(null);

    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          collectionId,
          name: form.name,
          type: form.type,
          provider: form.provider || null,
          exportName: form.exportName || null,
          value: form.value,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create credential.");
      }

      setCreateOpen(false);
      resetForm();
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create credential.",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleRotate = async () => {
    if (!rotateTarget || !form.value) {
      setError("Enter the new credential value.");
      return;
    }

    setBusy("rotate");
    setError(null);

    try {
      const response = await fetch("/api/credentials/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          credentialId: rotateTarget.id,
          value: form.value,
          changeReason: "Rotated from dashboard",
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to rotate credential.");
      }

      setRotateTarget(null);
      resetForm();
      setRevealed((current) => {
        const next = { ...current };
        delete next[rotateTarget.id];
        return next;
      });
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to rotate credential.",
      );
    } finally {
      setBusy(null);
    }
  };

  const reveal = async (credentialId: string) => {
    if (revealed[credentialId]) return revealed[credentialId];

    setBusy("reveal");
    setError(null);

    try {
      const params = new URLSearchParams({ workspaceId, credentialId });
      const response = await fetch(`/api/credentials/reveal?${params}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { value?: string; error?: string };

      if (!response.ok || typeof payload.value !== "string") {
        throw new Error(payload.error ?? "Unable to reveal credential.");
      }

      setRevealed((current) => ({ ...current, [credentialId]: payload.value! }));
      return payload.value;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reveal credential.",
      );
      return null;
    } finally {
      setBusy(null);
    }
  };

  const copyCredential = async (credentialId: string) => {
    const value = await reveal(credentialId);
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopiedId(credentialId);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const signOut = async () => {
    setBusy("signout");
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace("/");
          router.refresh();
        },
      },
    });
    setBusy(null);
  };

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
        <header className="mb-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <KeyRoundIcon className="size-4.5" />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold tracking-tight">RiVenv</p>
              <p className="text-muted-foreground text-xs">{workspaceName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border bg-card px-2 py-1.5 sm:flex">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-semibold">
                {initials}
              </span>
              <span className="max-w-32 truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              loading={busy === "signout"}
              onClick={signOut}
            >
              <LogOutIcon />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <section className="mb-8 flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground text-xs">
              <ShieldCheckIcon className="size-3.5 text-emerald-500" />
              <span>Encrypted credentials</span>
              <span className="text-border">/</span>
              <span>Personal collection</span>
            </div>
            <h1 className="font-heading text-3xl tracking-[-0.04em] sm:text-4xl">
              API keys & environment variables
            </h1>
            <p className="mt-3 max-w-lg text-muted-foreground text-sm leading-6">
              Keep the values your services need close at hand, without putting the secret itself in your codebase.
            </p>
          </div>

          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger
              render={
                <Button size="sm">
                  <PlusIcon />
                  New credential
                </Button>
              }
            />
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>New credential</DialogTitle>
                <DialogDescription>
                  The value is encrypted before it reaches the database.
                </DialogDescription>
              </DialogHeader>
              <DialogPanel className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="credential-name">Name</FieldLabel>
                  <Input
                    id="credential-name"
                    nativeInput
                    placeholder="Personal OpenAI"
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="credential-type">Type</FieldLabel>
                    <select
                      id="credential-type"
                      className="h-8.5 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-7.5"
                      value={form.type}
                      onChange={(event) => updateForm("type", event.target.value)}
                    >
                      <option value="api_key">API key</option>
                      <option value="environment_variable">ENV variable</option>
                      <option value="access_token">Access token</option>
                      <option value="password">Password</option>
                      <option value="generic_secret">Secret</option>
                    </select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="credential-provider">Provider</FieldLabel>
                    <Input
                      id="credential-provider"
                      nativeInput
                      placeholder="OpenAI"
                      value={form.provider}
                      onChange={(event) => updateForm("provider", event.target.value)}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="credential-export-name">Export name</FieldLabel>
                  <Input
                    id="credential-export-name"
                    nativeInput
                    placeholder="OPENAI_API_KEY"
                    value={form.exportName}
                    onChange={(event) => updateForm("exportName", event.target.value)}
                  />
                  <FieldDescription>Optional name used when exporting to an environment.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="credential-value">Value</FieldLabel>
                  <Textarea
                    id="credential-value"
                    rows={4}
                    spellCheck={false}
                    autoComplete="off"
                    placeholder="Paste the credential value"
                    value={form.value}
                    onChange={(event) => updateForm("value", event.target.value)}
                  />
                </Field>
                {error ? <p className="text-destructive text-sm">{error}</p> : null}
              </DialogPanel>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button loading={busy === "create"} onClick={handleCreate}>Save credential</Button>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        </section>

        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-700 dark:text-amber-300">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium text-sm">Treat these values like production access.</p>
            <p className="mt-1 text-xs leading-5 opacity-80">
              Reveal only when needed. RiVenv keeps values encrypted at rest and records reveal and rotation activity.
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border bg-card shadow-xs/5">
          <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
            <div>
              <h2 className="font-medium text-sm">Personal credentials</h2>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {credentials.length === 0 ? "Nothing stored yet" : `${credentials.length} stored ${credentials.length === 1 ? "credential" : "credentials"}`}
              </p>
            </div>
            <Badge variant="outline" size="sm" className="font-mono">
              encrypted
            </Badge>
          </div>

          {credentials.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex size-11 items-center justify-center rounded-full border bg-muted/40 text-muted-foreground">
                <KeyRoundIcon className="size-5" />
              </div>
              <h3 className="font-medium text-sm">Your collection is empty</h3>
              <p className="mt-1 max-w-xs text-muted-foreground text-xs leading-5">
                Add an API key or environment variable and it will appear here, masked until you ask to reveal it.
              </p>
              <Button size="sm" variant="outline" className="mt-5" onClick={() => setCreateOpen(true)}>
                <PlusIcon />
                Add your first credential
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-4 sm:ps-5">Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-px pe-4 sm:pe-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((item) => {
                  const value = revealed[item.id];
                  const isRevealing = busy === "reveal" && !value;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-56 ps-4 sm:ps-5">
                        <div className="truncate font-medium">{item.name}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-muted-foreground text-xs">
                          <span>{item.provider ?? "No provider"}</span>
                          {item.exportName ? (
                            <>
                              <span className="text-border">/</span>
                              <span className="font-mono">{item.exportName}</span>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex max-w-64 items-center gap-1 rounded-md border bg-background px-2 py-1 font-mono text-xs">
                          <span className="truncate text-muted-foreground">{maskedValue(value)}</span>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="shrink-0"
                            aria-label={value ? "Hide credential" : "Reveal credential"}
                            loading={isRevealing}
                            onClick={() => {
                              if (value) {
                                setRevealed((current) => {
                                  const next = { ...current };
                                  delete next[item.id];
                                  return next;
                                });
                              } else {
                                void reveal(item.id);
                              }
                            }}
                          >
                            {value ? <EyeOffIcon /> : <EyeIcon />}
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="shrink-0"
                            aria-label="Copy credential"
                            onClick={() => void copyCredential(item.id)}
                          >
                            {copiedId === item.id ? <CheckIcon /> : <CopyIcon />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                          {typeLabel(item.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {formatDate(item.updatedAt)}
                      </TableCell>
                      <TableCell className="pe-4 sm:pe-5">
                        <Menu>
                          <MenuTrigger
                            render={
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${item.name}`} />
                            }
                          >
                            <MoreHorizontalIcon />
                          </MenuTrigger>
                          <MenuPopup align="end">
                            <MenuItem onClick={() => void reveal(item.id)}>
                              <EyeIcon /> Reveal value
                            </MenuItem>
                            <MenuItem onClick={() => void copyCredential(item.id)}>
                              <CopyIcon /> Copy value
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                setRotateTarget(item);
                                resetForm();
                              }}
                            >
                              <RotateCwIcon /> Rotate credential
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem disabled className="text-muted-foreground">
                              Revoke credential
                            </MenuItem>
                          </MenuPopup>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(rotateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRotateTarget(null);
            resetForm();
          }
        }}
      >
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Rotate credential</DialogTitle>
            <DialogDescription>
              Replace <span className="font-medium text-foreground">{rotateTarget?.name}</span> with a new encrypted version.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="rotate-value">New value</FieldLabel>
              <Textarea
                id="rotate-value"
                rows={4}
                spellCheck={false}
                autoComplete="off"
                placeholder="Paste the replacement value"
                value={form.value}
                onChange={(event) => updateForm("value", event.target.value)}
              />
              <FieldDescription>The previous version remains in history.</FieldDescription>
            </Field>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </DialogPanel>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRotateTarget(null)}>Cancel</Button>
            <Button loading={busy === "rotate"} onClick={handleRotate}>Rotate credential</Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </main>
  );
}
