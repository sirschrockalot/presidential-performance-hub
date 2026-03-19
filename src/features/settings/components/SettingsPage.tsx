"use client";

import { useState } from "react";
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Shield, Building2, Bell, Target, Zap, Save } from 'lucide-react';
import { toast } from 'sonner';
import { acquisitionsWeeklyTargets, dispositionsWeeklyTargets, notificationPreferences, integrations } from "@/mock/settings";
import { useAuthz } from "@/lib/auth/authz-context";

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
  const [saving, setSaving] = useState(false);
  const showAdminSettings = can("settings:admin_sections");

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Settings saved');
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <PageHeader title="Settings" description="Configure business rules, targets, and application settings">
        <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </PageHeader>

      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input defaultValue="Presidential Digs" />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input defaultValue="Wholesale Real Estate" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input defaultValue="Dallas-Fort Worth, TX" />
              </div>
              <div className="space-y-2">
                <Label>Reporting Period</Label>
                <Input defaultValue="Weekly (Mon–Sun)" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Use dark color scheme</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Lock Reporting Periods</p>
                  <p className="text-xs text-muted-foreground">Prevent edits to past KPI weeks</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-calculate Points</p>
                  <p className="text-xs text-muted-foreground">Automatically award points when deals fund</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="targets" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Acquisitions Weekly Targets</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {acquisitionsWeeklyTargets.map((t) => (
                <div key={t.label} className="space-y-2">
                  <Label className="text-xs">{t.label}</Label>
                  <Input defaultValue={t.value} type="number" className="h-9" />
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
              {dispositionsWeeklyTargets.map((t) => (
                <div key={t.label} className="space-y-2">
                  <Label className="text-xs">{t.label}</Label>
                  <Input defaultValue={t.value} type="number" className="h-9" />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="points" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Points Calculation Rules</h3>
            </div>
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
            <h3 className="font-semibold">Draw Eligibility Rules</h3>
            <SettingRow label="Deal status requirement" value="Assigned" description="Deal must be at Assigned status or later" />
            <SettingRow label="EMD requirement" value="Received" description="Buyer EMD must be marked as received" />
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-sm font-medium">Require admin approval</p>
                <p className="text-xs text-muted-foreground">All draw requests require admin sign-off</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-recoup on close</p>
                <p className="text-xs text-muted-foreground">Automatically recoup draws when deal funds</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Notification Preferences</h3>
            </div>
            {notificationPreferences.map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <Switch defaultChecked />
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
                  {i.connected ? 'Connected' : 'Connect'}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

