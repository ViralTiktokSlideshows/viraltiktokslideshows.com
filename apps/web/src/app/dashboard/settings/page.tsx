"use client";

import { Check, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@viraltiktokslideshows/ui/components/alert-dialog";
import { Button } from "@viraltiktokslideshows/ui/components/button";
import { Input } from "@viraltiktokslideshows/ui/components/input";
import { Switch } from "@viraltiktokslideshows/ui/components/switch";
import { cn } from "@viraltiktokslideshows/ui/lib/utils";

import {
  FORMAT_LABELS,
  deleteAccount,
  fetchSettings,
  openBillingPortal,
  updateSettings,
  type SlideFormat,
  type UserSettings,
} from "@/lib/settings-client";

const FORMAT_OPTIONS = Object.keys(FORMAT_LABELS) as SlideFormat[];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [savingFormat, setSavingFormat] = useState(false);
  const [savingHashtags, setSavingHashtags] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSettings().then((data) => {
      setSettings(data);
      setNameDraft(data?.name ?? "");
    });
  }, []);

  async function handleSaveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === settings?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const updated = await updateSettings({ name: trimmed });
      setSettings(updated);
      setEditingName(false);
      toast.success("Name updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your name.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleFormatChange(format: SlideFormat) {
    if (!settings || format === settings.defaultFormat) return;
    const previous = settings;
    setSettings({ ...settings, defaultFormat: format });
    setSavingFormat(true);
    try {
      const updated = await updateSettings({ defaultFormat: format });
      setSettings(updated);
    } catch (error) {
      setSettings(previous);
      toast.error(error instanceof Error ? error.message : "Could not update your default format.");
    } finally {
      setSavingFormat(false);
    }
  }

  async function handleHashtagsChange(checked: boolean) {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, autoAppendHashtags: checked });
    setSavingHashtags(true);
    try {
      const updated = await updateSettings({ autoAppendHashtags: checked });
      setSettings(updated);
    } catch (error) {
      setSettings(previous);
      toast.error(error instanceof Error ? error.message : "Could not update this preference.");
    } finally {
      setSavingHashtags(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open billing portal.");
      setPortalLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete your account.");
      setDeleting(false);
    }
  }

  if (settings === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Settings</h1>
      <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
        Manage your account, billing, and generation preferences.
      </p>

      <div className="mt-8 flex max-w-2xl flex-col gap-6">
        {/* Account */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-bold text-foreground">Account</h2>

          <div className="mt-4 flex items-center gap-3">
            {settings.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.image} alt="" className="size-11 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-display text-sm font-bold text-foreground">
                {(settings.name || settings.email).charAt(0).toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSaveName();
                      if (event.key === "Escape") {
                        setNameDraft(settings.name ?? "");
                        setEditingName(false);
                      }
                    }}
                    className="h-9"
                    maxLength={80}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleSaveName}
                    disabled={savingName}
                    aria-label="Save name"
                  >
                    {savingName ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="group flex items-center gap-1.5 text-sm font-semibold text-foreground"
                >
                  {settings.name || "Add your name"}
                  <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{settings.email}</p>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {settings.hasGoogle ? "Signed in with Google" : "Signed in via email link"}
            </span>
          </div>
        </section>

        {/* Plan & Billing */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-bold text-foreground">Plan &amp; billing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You pay per slideshow &mdash; $2 to unlock each one, no subscription to manage or
            cancel.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={!settings.hasBillingHistory || portalLoading}
              title={
                settings.hasBillingHistory
                  ? undefined
                  : "Available after your first purchase"
              }
            >
              {portalLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Manage billing
            </Button>
            <Button variant="ghost" nativeButton={false} render={<Link href="/generate/upgrade" />}>
              Looking for a monthly plan?
            </Button>
          </div>
          {!settings.hasBillingHistory ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Receipts and payment methods show up here after your first unlock.
            </p>
          ) : null}
        </section>

        {/* Generation defaults */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-bold text-foreground">Generation defaults</h2>

          <div className="mt-4">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Default format
            </p>
            <div className="mt-2 inline-flex rounded-2xl border border-border bg-muted p-1">
              {FORMAT_OPTIONS.map((format) => (
                <button
                  key={format}
                  type="button"
                  disabled={savingFormat}
                  onClick={() => handleFormatChange(format)}
                  className={cn(
                    "rounded-2xl px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
                    settings.defaultFormat === format
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {FORMAT_LABELS[format]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-append hashtags</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add relevant hashtags to your caption automatically after each generation.
              </p>
            </div>
            <Switch
              checked={settings.autoAppendHashtags}
              onCheckedChange={handleHashtagsChange}
              disabled={savingHashtags}
            />
          </div>
        </section>

        {/* Delete account */}
        <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
          <h2 className="font-display text-sm font-bold text-foreground">Delete account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently deletes your account, saved slideshows, and purchase history. This
            can&apos;t be undone.
          </p>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" className="mt-4 gap-1.5">
                  <Trash2 className="size-3.5" />
                  Delete account
                </Button>
              }
            />
            <AlertDialogPopup>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account, saved slideshows, and purchase history.
                There&apos;s no way to undo this.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="outline">Cancel</Button>} />
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Delete account
                </Button>
              </AlertDialogFooter>
            </AlertDialogPopup>
          </AlertDialog>
        </section>
      </div>
    </div>
  );
}
