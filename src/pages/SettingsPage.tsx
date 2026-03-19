import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Shield, Building2, Bell } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <PageHeader title="Settings" description="Configure business rules and application settings" />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="points">Points Rules</TabsTrigger>
          <TabsTrigger value="draws">Draw Rules</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Company Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground block mb-1">Company Name</span><p className="font-medium">Presidential Digs</p></div>
              <div><span className="text-muted-foreground block mb-1">Industry</span><p className="font-medium">Wholesale Real Estate</p></div>
              <div><span className="text-muted-foreground block mb-1">Location</span><p className="font-medium">Dallas-Fort Worth, TX</p></div>
              <div><span className="text-muted-foreground block mb-1">Reporting Period</span><p className="font-medium">Weekly (Mon–Sun)</p></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="points" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Points Calculation Rules</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Base points per funded deal</span><span className="font-medium">2 points</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Under $8,000 fee penalty</span><span className="font-medium">−1 point</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">$10,000+ fee bonus</span><span className="font-medium">+1 point</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">$15,000+ fee bonus</span><span className="font-medium">+2 points</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">$20,000+ fee bonus</span><span className="font-medium">+3 points</span></div>
              <div className="flex justify-between py-2"><span className="text-muted-foreground">TC points per funded deal</span><span className="font-medium">0.5 points</span></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="draws" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Draw Eligibility Rules</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Deal must be</span><span className="font-medium">Assigned</span></div>
              <div className="flex justify-between py-2"><span className="text-muted-foreground">Buyer EMD must be</span><span className="font-medium">Received</span></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">Notification settings coming soon</p>
            <p className="text-sm mt-1">Configure alerts for deals, draws, and KPI deadlines</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
