import { useParams, Link } from 'react-router-dom';
import { getDealById, getUserById, draws, pointEvents } from '@/data/mock-data';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MetricCard } from '@/components/shared/MetricCard';
import { DEAL_STATUS_CONFIG, DealStatus, calculatePoints, calculateTcPoints } from '@/types';
import { ArrowLeft, DollarSign, Calendar, User, Building2, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DEAL_STATUSES: DealStatus[] = ['lead', 'under_contract', 'marketed', 'buyer_committed', 'emd_received', 'assigned', 'closed_funded'];

export default function DealDetail() {
  const { id } = useParams();
  const deal = getDealById(id || '');
  if (!deal) return <div className="p-12 text-center text-muted-foreground">Deal not found</div>;

  const acqRep = getUserById(deal.acquisitionsRepId);
  const dispoRep = deal.dispoRepId ? getUserById(deal.dispoRepId) : null;
  const tc = deal.transactionCoordinatorId ? getUserById(deal.transactionCoordinatorId) : null;
  const dealDraws = draws.filter(d => d.dealId === deal.id);
  const dealPoints = pointEvents.filter(pe => pe.dealId === deal.id);
  const statusIdx = DEAL_STATUSES.indexOf(deal.status);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <Link to="/deals" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Deals
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{deal.propertyAddress}</h1>
          <p className="text-sm text-muted-foreground mt-1">Seller: {deal.sellerName}</p>
        </div>
        <StatusBadge status={deal.status} className="text-sm px-3 py-1" />
      </div>

      {/* Status timeline */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Deal Progress</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {DEAL_STATUSES.map((s, i) => {
            const reached = i <= statusIdx && deal.status !== 'canceled';
            return (
              <div key={s} className="flex items-center gap-1 min-w-0">
                <div className={`flex items-center justify-center h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap ${reached ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {DEAL_STATUS_CONFIG[s].label}
                </div>
                {i < DEAL_STATUSES.length - 1 && <div className={`w-4 h-0.5 ${reached && i < statusIdx ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Contract Price" value={`$${deal.contractPrice.toLocaleString()}`} icon={DollarSign} />
        <MetricCard title="Assignment Fee" value={deal.assignmentFee ? `$${deal.assignmentFee.toLocaleString()}` : '—'} icon={DollarSign} variant={deal.assignmentFee ? 'success' : 'default'} />
        <MetricCard title="Buyer EMD" value={deal.buyerEmdReceived ? `$${(deal.buyerEmdAmount || 0).toLocaleString()}` : 'Not received'} variant={deal.buyerEmdReceived ? 'info' : 'warning'} />
        <MetricCard title="Contract Date" value={deal.contractDate} icon={Calendar} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="draws">Draws ({dealDraws.length})</TabsTrigger>
          <TabsTrigger value="points">Points ({dealPoints.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Team</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Acquisitions Rep</span><span className="font-medium">{acqRep?.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dispo Rep</span><span className="font-medium">{dispoRep?.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Transaction Coordinator</span><span className="font-medium">{tc?.name || '—'}</span></div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Title Company</span><span className="font-medium">{deal.titleCompany}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span className="font-medium">{deal.buyerName || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Assigned Date</span><span className="font-medium">{deal.assignedDate || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Closed Date</span><span className="font-medium">{deal.closedFundedDate || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Inspection End</span><span className="font-medium">{deal.inspectionEndDate || '—'}</span></div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="draws">
          {dealDraws.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">No draws for this deal</div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rep</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                </tr></thead>
                <tbody>{dealDraws.map(d => (
                  <tr key={d.id} className="border-b last:border-b-0">
                    <td className="py-3 px-4">{getUserById(d.repId)?.name}</td>
                    <td className="py-3 px-4 text-right font-medium">${d.amount.toLocaleString()}</td>
                    <td className="py-3 px-4"><StatusBadge status={d.status} type="draw" /></td>
                    <td className="py-3 px-4 text-muted-foreground">{d.dateIssued}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="points">
          {dealPoints.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">No points awarded yet</div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rep</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Points</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reason</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                </tr></thead>
                <tbody>{dealPoints.map(pe => (
                  <tr key={pe.id} className="border-b last:border-b-0">
                    <td className="py-3 px-4">{getUserById(pe.userId)?.name}</td>
                    <td className="py-3 px-4 text-right font-bold">{pe.points}</td>
                    <td className="py-3 px-4 text-muted-foreground">{pe.reason}</td>
                    <td className="py-3 px-4 text-muted-foreground">{pe.createdAt}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><FileText className="h-4 w-4" /> Notes</h3>
            <p className="text-sm text-muted-foreground">{deal.notes || 'No notes added.'}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
