"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, Building2, Bell, Target, Zap, Save, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthz } from "@/lib/auth/authz-context";
import { KPI_FIELD_DEFS, type KpiMetricKey } from "@/features/kpis/utils/kpi-metrics";
import { notificationPreferences, integrations } from "@/mock/settings";
import { changeOwnPasswordSchema, type ChangeOwnPasswordInput } from "@/features/auth/schemas/password.schema";
import {
  DEFAULT_APP_SETTINGS,
  defaultUserPreferencesState,
  type AppSettingsState,
  type UserPreferencesState,
} from "@/features/settings/schemas/settings.schema";

function SettingRow({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <span className="text-sm font-medium font-mono text-foreground">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { can } = useAuthz();
  const { setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const showAdminSettings = can("settings:admin_sections");
  const [activeTab, setActiveTab] = useState<string>("general");

  const [org, setOrg] = useState<AppSettingsState>(() => ({ ...DEFAULT_APP_SETTINGS }));
  const [userPrefs, setUserPrefs] = useState<UserPreferencesState>(() => defaultUserPreferencesState());
  const [settingsLoading, setSettingsLoading] = useState(true);

  const passwordForm = useForm<ChangeOwnPasswordInput>({
    resolver: zodResolver(changeOwnPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  const [passwordPending, setPasswordPending] = useState(false);

  const [acquisitionsTargetsDraft, setAcquisitionsTargetsDraft] = useState<Partial<Record<KpiMetricKey, number>>>({});
  const [dispositionsTargetsDraft, setDispositionsTargetsDraft] = useState<Partial<Record<KpiMetricKey, number>>>({});
  const [targetsLoading, setTargetsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSettingsLoading(true);
      try {
        const [appRes, meRes] = await Promise.all([
          fetch("/api/settings/app", { credentials: "include" }),
          fetch("/api/settings/me", { credentials: "include" }),
        ]);
        if (!appRes.ok) {
          const err = (await appRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error ?? "Failed to load organization settings");
        }
        if (!meRes.ok) {
          const err = (await meRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error ?? "Failed to load your preferences");
        }
        const appJson = (await appRes.json()) as { settings: AppSettingsState };
        const meJson = (await meRes.json()) as { preferences: UserPreferencesState };
        if (cancelled) return;
        setOrg(appJson.settings);
        setUserPrefs(meJson.preferences);
        setTheme(meJson.preferences.theme);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load settings");
        }
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  useEffect(() => {
    if (!showAdminSettings) return;
    setTargetsLoading(true);
    const load = async () => {
      try {
        const [acqRes, dispRes] = await Promise.all([
          fetch("/api/kpis/targets?team=acquisitions", { credentials: "include" }),
          fetch("/api/kpis/targets?team=dispositions", { credentials: "include" }),
        ]);
        if (!acqRes.ok || !dispRes.ok) throw new Error("Failed to load KPI targets");

        const acq = (await acqRes.json()) as { targets: Partial<Record<KpiMetricKey, number>> };
        const disp = (await dispRes.json()) as { targets: Partial<Record<KpiMetricKey, number>> };
        setAcquisitionsTargetsDraft(acq.targets ?? {});
        setDispositionsTargetsDraft(disp.targets ?? {});
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load KPI targets");
      } finally {
        setTargetsLoading(false);
      }
    };
    void load();
  }, [showAdminSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === "targets") {
        const buildPayload = (defs: typeof KPI_FIELD_DEFS.acquisitions, draft: Partial<Record<KpiMetricKey, number>>) =>
          Object.fromEntries(defs.map((d) => [d.metricKey, draft[d.metricKey] ?? 0]));

        const acqTargets = buildPayload(KPI_FIELD_DEFS.acquisitions, acquisitionsTargetsDraft);
        const dispTargets = buildPayload(KPI_FIELD_DEFS.dispositions, dispositionsTargetsDraft);

        const [acqRes, dispRes] = await Promise.all([
          fetch("/api/kpis/targets", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team: "acquisitions", reportingPeriodStart: null, targets: acqTargets }),
          }),
          fetch("/api/kpis/targets", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team: "dispositions", reportingPeriodStart: null, targets: dispTargets }),
          }),
        ]);

        if (!acqRes.ok || !dispRes.ok) {
          const bad = !acqRes.ok ? acqRes : dispRes;
          const err = (await bad.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error ?? "Failed to update KPI targets");
        }

        toast.success("KPI targets updated");
        return;
      }

      if (activeTab === "general") {
        const tasks: Promise<Response>[] = [];
        if (showAdminSettings) {
          tasks.push(
            fetch("/api/settings/app", {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(org),
            })
          );
        }
        tasks.push(
          fetch("/api/settings/me", {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: userPrefs.theme }),
          })
        );
        const results = await Promise.all(tasks);
        for (const res of results) {
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(err?.error ?? "Failed to save settings");
          }
        }
        if (showAdminSettings) {
          const appJson = (await results[0].json()) as { settings: AppSettingsState };
          setOrg(appJson.settings);
          const meJson = (await results[1].json()) as { preferences: UserPreferencesState };
          setUserPrefs(meJson.preferences);
          setTheme(meJson.preferences.theme);
        } else {
          const meJson = (await results[0].json()) as { preferences: UserPreferencesState };
          setUserPrefs(meJson.preferences);
          setTheme(meJson.preferences.theme);
        }
        toast.success("Settings saved");
        return;
      }

      if (activeTab === "draws") {
        if (!showAdminSettings) {
          toast.error("Only administrators can save draw rules.");
          return;
        }
        const res = await fetch("/api/settings/app", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            drawRequireAdminApproval: org.drawRequireAdminApproval,
            drawAutoRecoupOnClose: org.drawAutoRecoupOnClose,
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error ?? "Failed to save draw rules");
        }
        const data = (await res.json()) as { settings: AppSettingsState };
        setOrg(data.settings);
        toast.success("Draw rules saved");
        return;
      }

      if (activeTab === "notifications") {
        const res = await fetch("/api/settings/me", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifications: userPrefs.notifications }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error ?? "Failed to save notifications");
        }
        const data = (await res.json()) as { preferences: UserPreferencesState };
        setUserPrefs(data.preferences);
        toast.success("Notification preferences saved");
        return;
      }

      if (activeTab === "points" || activeTab === "integrations") {
        toast.message("Nothing to save on this tab yet.");
        return;
      }

      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = passwordForm.handleSubmit(async (values) => {
    setPasswordPending(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update password");
      toast.success("Password updated");
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setPasswordPending(false);
    }
  });

  const saveDisabled =
    saving || activeTab === "security" || settingsLoading || (activeTab === "targets" && targetsLoading);

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <PageHeader title="Settings" description="Configure business rules, targets, and application settings">
        <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saveDisabled}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {showAdminSettings && <TabsTrigger value="targets">KPI Targets</TabsTrigger>}
          {showAdminSettings && <TabsTrigger value="points">Points Rules</TabsTrigger>}
          {showAdminSettings && <TabsTrigger value="draws">Draw Rules</TabsTrigger>}
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {showAdminSettings && <TabsTrigger value="integrations">Integrations</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Company Information</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {showAdminSettings
                ? "These values are stored for the whole organization."
                : "Only administrators can edit organization details."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={org.companyName}
                  onChange={(e) => setOrg((o) => ({ ...o, companyName: e.target.value }))}
                  disabled={!showAdminSettings || settingsLoading || saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input
                  value={org.industry}
                  onChange={(e) => setOrg((o) => ({ ...o, industry: e.target.value }))}
                  disabled={!showAdminSettings || settingsLoading || saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={org.location}
                  onChange={(e) => setOrg((o) => ({ ...o, location: e.target.value }))}
                  disabled={!showAdminSettings || settingsLoading || saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Reporting Period</Label>
                <Input
                  value={org.reportingPeriodLabel}
                  onChange={(e) => setOrg((o) => ({ ...o, reportingPeriodLabel: e.target.value }))}
                  disabled={!showAdminSettings || settingsLoading || saving}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Dark mode</p>
                  <p className="text-xs text-muted-foreground">Applied for your account (light / dark)</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={settingsLoading || saving}
                    onClick={() => {
                      setUserPrefs((p) => ({ ...p, theme: "system" }));
                      setTheme("system");
                    }}
                  >
                    System
                  </Button>
                  <Switch
                    checked={userPrefs.theme === "dark"}
                    onCheckedChange={(on) => {
                      const next = on ? "dark" : "light";
                      setUserPrefs((p) => ({ ...p, theme: next }));
                      setTheme(next);
                    }}
                    disabled={settingsLoading || saving}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Lock reporting periods</p>
                  <p className="text-xs text-muted-foreground">Prevent edits to past KPI weeks (org-wide)</p>
                </div>
                <Switch
                  checked={org.lockReportingPeriods}
                  onCheckedChange={(on) => setOrg((o) => ({ ...o, lockReportingPeriods: on }))}
                  disabled={!showAdminSettings || settingsLoading || saving}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-calculate points</p>
                  <p className="text-xs text-muted-foreground">Org preference — awarding logic still lives in the app pipeline</p>
                </div>
                <Switch
                  checked={org.autoCalculatePoints}
                  onCheckedChange={(on) => setOrg((o) => ({ ...o, autoCalculatePoints: on }))}
                  disabled={!showAdminSettings || settingsLoading || saving}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Change password</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your current password, then choose a new one (8–128 characters).
            </p>
            <Form {...passwordForm}>
              <form onSubmit={onPasswordSubmit} className="space-y-4 max-w-md">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="current-password" disabled={passwordPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="new-password" disabled={passwordPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="new-password" disabled={passwordPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={passwordPending}>
                  {passwordPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Update password
                </Button>
              </form>
            </Form>
          </div>
        </TabsContent>

        <TabsContent value="targets" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Acquisitions Weekly Targets</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {KPI_FIELD_DEFS.acquisitions.map((t) => (
                <div key={t.metricKey} className="space-y-2">
                  <Label className="text-xs">{t.label}</Label>
                  <Input
                    type="number"
                    className="h-9"
                    disabled={targetsLoading || saving}
                    step={t.kind === "int" ? 1 : 0.01}
                    value={acquisitionsTargetsDraft[t.metricKey] ?? 0}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setAcquisitionsTargetsDraft((prev) => ({
                        ...prev,
                        [t.metricKey]: Number.isFinite(n) ? n : 0,
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Dispositions Weekly Targets</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {KPI_FIELD_DEFS.dispositions.map((t) => (
                <div key={t.metricKey} className="space-y-2">
                  <Label className="text-xs">{t.label}</Label>
                  <Input
                    type="number"
                    className="h-9"
                    disabled={targetsLoading || saving}
                    step={t.kind === "int" ? 1 : 0.01}
                    value={dispositionsTargetsDraft[t.metricKey] ?? 0}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setDispositionsTargetsDraft((prev) => ({
                        ...prev,
                        [t.metricKey]: Number.isFinite(n) ? n : 0,
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="points" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Points calculation rules</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              These tiers are enforced in application code. Values below are read-only reference for your team.
            </p>
            <div className="space-y-0">
              <SettingRow label="Base points per funded deal" value="2 points" description="Awarded to both Acq and Dispo reps" />
              <SettingRow label="Under $8,000 fee penalty" value="−1 point" description="Reduces base to 1 point" />
              <SettingRow label="$10,000+ fee bonus" value="+1 point" description="Total: 3 points" />
              <SettingRow label="$15,000+ fee bonus" value="+2 points" description="Total: 4 points" />
              <SettingRow label="$20,000+ fee bonus" value="+3 points" description="Total: 5 points" />
              <SettingRow label="TC points per funded deal" value="0.5 points" description="Fixed for every funded deal" />
            </div>
            <div className="bg-muted/50 rounded-md p-4 text-xs text-muted-foreground space-y-1 mt-2">
              <p className="font-semibold text-foreground text-sm">Quick Reference:</p>
              <p>$7,500 fee = 1 point · $8,000 = 2 points · $10,000 = 3 points</p>
              <p>$15,000 = 4 points · $20,000+ = 5 points</p>
              <p>
                Bonus tiers are <strong>not cumulative</strong> — the highest qualifying tier applies.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="draws" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Draw eligibility rules</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Deal status and EMD rules are enforced in code. Toggles below are saved for the organization.
            </p>
            <SettingRow label="Deal status requirement" value="Assigned" description="Deal must be at Assigned status or later" />
            <SettingRow label="EMD requirement" value="Received" description="Buyer EMD must be marked as received" />
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-sm font-medium">Require admin approval</p>
                <p className="text-xs text-muted-foreground">All draw requests require admin sign-off</p>
              </div>
              <Switch
                checked={org.drawRequireAdminApproval}
                onCheckedChange={(on) => setOrg((o) => ({ ...o, drawRequireAdminApproval: on }))}
                disabled={!showAdminSettings || settingsLoading || saving}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-recoup on close</p>
                <p className="text-xs text-muted-foreground">Automatically recoup draws when deal funds</p>
              </div>
              <Switch
                checked={org.drawAutoRecoupOnClose}
                onCheckedChange={(on) => setOrg((o) => ({ ...o, drawAutoRecoupOnClose: on }))}
                disabled={!showAdminSettings || settingsLoading || saving}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Notification preferences</h3>
            </div>
            <p className="text-xs text-muted-foreground">Stored per user. Delivery channels are not wired yet.</p>
            {notificationPreferences.map((n) => (
              <div key={n.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <Switch
                  checked={userPrefs.notifications[n.key] ?? true}
                  onCheckedChange={(on) =>
                    setUserPrefs((p) => ({
                      ...p,
                      notifications: { ...p.notifications, [n.key]: on },
                    }))
                  }
                  disabled={settingsLoading || saving}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Integrations</h3>
            </div>
            {integrations.map((i) => (
              <div key={i.name} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{i.desc}</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  {i.connected ? "Connected" : "Connect"}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
