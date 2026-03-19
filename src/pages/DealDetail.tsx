import { useParams, Link } from 'react-router-dom';
import { useDeal } from '@/hooks/use-deals';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MetricCard } from '@/components/shared/MetricCard';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { DEAL_STATUS_CONFIG, DealStatus } from '@/types';
import { checkDrawEligibility } from '@/services/draws.service';
import { draws, pointEvents, getUserById } from '@/data/mock-data';
import { activityFeed } from '@/data/activity-feed';
import {
  ArrowLeft, DollarSign, Calendar, User, Building2, FileText,
  ShieldCheck, ShieldX, Paperclip, Clock, TrendingUp, Percent,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const DEAL_STATUSES: DealStatus[] = ['lead', 'under_contract', 'marketed', 'buyer_committed', 'emd_received', 'assigned', 'closed_funded'];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function DealDetail() {
  const { id } = useParams();
  const { data: deal, isLoading } = useDeal(id || '');
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <LoadingState variant="detail" className="max-w-[1200px] mx-auto" />;
  if (!deal) return <EmptyState title="Deal not found" description="The deal you're looking for doesn't exist or has been removed." />;

  const dealDraws = draws.filter(d => d.dealId === deal.id);
  const dealPoints = pointEvents.filter(pe => pe.dealId === deal.id);
  const statusIdx = DEAL_STATUSES.indexOf(deal.status);
  const eligibility = checkDrawEligibility(deal.id);
  const margin = deal.assignmentFee && deal.contractPrice ? ((deal.assignmentFee / deal.contractPrice) * 100).toFixed(1) : null;
  const dealActivity = activityFeed.filter(a => a.link?.includes(deal.id));

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <Link to="/deals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Deals
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{deal.propertyAddress}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seller: {deal.sellerName}
            {deal.buyerName && <> · Buyer: {deal.buyerName}</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {eligibility.eligible ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 rounded-full px-2.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Draw eligible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
              <ShieldX className="h-3.5 w-3.5" /> {eligibility.reason}
            </span>
          )}
          <StatusBadge status={deal.status} className="text-sm px-3 py-1" />

          {/* Quick edit drawer */}
          <Sheet open={editOpen} onOpenChange={setEditOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">Edit Deal</Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Edit Deal</SheetTitle>
                <SheetDescription>Update deal information. Changes will be saved automatically.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select defaultValue={deal.status}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEAL_STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Buyer Name</Label>
                  <Input defaultValue={deal.buyerName || ''} placeholder="Enter buyer name" />
                </div>
                <div className="space-y-2">
                  <Label>Assignment Price</Label>
                  <Input type="number" defaultValue={deal.assignmentPrice || ''} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Assignment Fee</Label>
                  <Input type="number" defaultValue={deal.assignmentFee || ''} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Buyer EMD Amount</Label>
                  <Input type="number" defaultValue={deal.buyerEmdAmount || ''} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea defaultValue={deal.notes} rows={4} />
                </div>
                <Button className="w-full mt-4" onClick={() => setEditOpen(false)}>Save Changes</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Status timeline */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Deal Progress</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {DEAL_STATUSES.map((s, i) => {
            const reached = i <= statusIdx && deal.status !== 'canceled';
            return (
              <div key={s} className="flex items-center gap-1 min-w-0">
                <div className={`flex items-center justify-center h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  reached ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {DEAL_STATUS_CONFIG[s].label}
                </div>
                {i < DEAL_STATUSES.length - 1 && (
                  <div className={`w-6 h-0.5 rounded-full ${reached && i < statusIdx ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Contract Price" value={`$${deal.contractPrice.toLocaleString()}`} icon={DollarSign} />
        <MetricCard title="Assignment Price" value={deal.assignmentPrice ? `$${deal.assignmentPrice.toLocaleString()}` : '—'} icon={DollarSign} />
        <MetricCard title="Assignment Fee" value={deal.assignmentFee ? `$${deal.assignmentFee.toLocaleString()}` : '—'} icon={TrendingUp} variant={deal.assignmentFee ? 'success' : 'default'} />
        <MetricCard title="Margin" value={margin ? `${margin}%` : '—'} icon={Percent} />
        <MetricCard title="Buyer EMD" value={deal.buyerEmdReceived ? `$${(deal.buyerEmdAmount || 0).toLocaleString()}` : 'Not received'} variant={deal.buyerEmdReceived ? 'info' : 'warning'} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="draws">Draws ({dealDraws.length})</TabsTrigger>
          <TabsTrigger value="points">Points ({dealPoints.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><User className="h-4 w-4" /> Team Assignment</h3>
              <InfoRow label="Acquisitions Rep" value={deal.acquisitionsRepName} />
              <InfoRow label="Dispo Rep" value={deal.dispoRepName || 'Unassigned'} />
              <InfoRow label="Transaction Coordinator" value={deal.tcName || 'Unassigned'} />
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Building2 className="h-4 w-4" /> Deal Details</h3>
              <InfoRow label="Title Company" value={deal.titleCompany} />
              <InfoRow label="Buyer" value={deal.buyerName || 'TBD'} />
              <InfoRow label="Contract Date" value={deal.contractDate} />
              <InfoRow label="Inspection End" value={deal.inspectionEndDate || '—'} />
              <InfoRow label="Assigned Date" value={deal.assignedDate || '—'} />
              <InfoRow label="Closed Date" value={deal.closedFundedDate || '—'} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><DollarSign className="h-4 w-4" /> Financial Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <InfoRow label="Contract Price" value={`$${deal.contractPrice.toLocaleString()}`} />
                <InfoRow label="Assignment Price" value={deal.assignmentPrice ? `$${deal.assignmentPrice.toLocaleString()}` : '—'} />
                <InfoRow label="Assignment Fee (Spread)" value={deal.assignmentFee ? `$${deal.assignmentFee.toLocaleString()}` : '—'} />
                <InfoRow label="Margin" value={margin ? `${margin}%` : '—'} />
              </div>
              <div>
                <InfoRow label="Buyer EMD Amount" value={deal.buyerEmdAmount ? `$${deal.buyerEmdAmount.toLocaleString()}` : '—'} />
                <InfoRow label="EMD Received" value={deal.buyerEmdReceived ? 'Yes' : 'No'} />
                <InfoRow label="Total Draws" value={`$${dealDraws.reduce((s, d) => s + d.amount, 0).toLocaleString()}`} />
                <InfoRow label="Net After Draws" value={
                  deal.assignmentFee
                    ? `$${(deal.assignmentFee - dealDraws.reduce((s, d) => s + d.amount, 0)).toLocaleString()}`
                    : '—'
                } />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="draws">
          {dealDraws.length === 0 ? (
            <EmptyState icon={Banknote} title="No draws" description="No draws have been issued for this deal yet." />
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Rep</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Balance</th>
                </tr></thead>
                <tbody>{dealDraws.map(d => (
                  <tr key={d.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{getUserById(d.repId)?.name}</td>
                    <td className="py-3 px-4 text-right font-mono">${d.amount.toLocaleString()}</td>
                    <td className="py-3 px-4"><StatusBadge status={d.status} type="draw" /></td>
                    <td className="py-3 px-4 text-muted-foreground">{d.dateIssued}</td>
                    <td className="py-3 px-4 text-right font-mono">${d.remainingBalance.toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="points">
          {dealPoints.length === 0 ? (
            <EmptyState icon={Trophy} title="No points awarded" description="Points are awarded when a deal reaches Closed / Funded status." />
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Rep</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Points</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Reason</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                </tr></thead>
                <tbody>{dealPoints.map(pe => (
                  <tr key={pe.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{getUserById(pe.userId)?.name}</td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-success">+{pe.points}</td>
                    <td className="py-3 px-4 text-muted-foreground">{pe.reason}</td>
                    <td className="py-3 px-4 text-muted-foreground">{pe.createdAt}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity">
          {dealActivity.length > 0 ? (
            <div className="rounded-lg border bg-card p-5">
              <ActivityFeed items={dealActivity} />
            </div>
          ) : (
            <EmptyState icon={Clock} title="No activity yet" description="Activity will appear here as the deal progresses." />
          )}
        </TabsContent>

        <TabsContent value="notes">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Notes</h3>
            <p className="text-sm text-muted-foreground">{deal.notes || 'No notes added.'}</p>
            <Textarea placeholder="Add a note…" rows={3} />
            <Button size="sm">Add Note</Button>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <EmptyState
            icon={Paperclip}
            title="No documents"
            description="Upload contracts, assignments, and closing documents here."
            actionLabel="Upload Document"
            onAction={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
