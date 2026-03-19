import { PageHeader } from '@/components/shared/PageHeader';
import { users } from '@/data/mock-data';
import { getUserPoints, getRepDrawBalance } from '@/data/mock-data';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin / Owner',
  acquisitions_manager: 'Acquisitions Manager',
  dispositions_manager: 'Dispositions Manager',
  transaction_coordinator: 'Transaction Coordinator',
  rep: 'Rep / Contractor',
};

export default function TeamPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Team" description="Manage team members and roles">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Member</Button>
      </PageHeader>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Team</th>
                <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Points</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Draw Balance</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{ROLE_LABELS[user.role]}</td>
                  <td className="py-3 px-4 capitalize text-muted-foreground hidden md:table-cell">{user.team}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user.active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium hidden lg:table-cell">{getUserPoints(user.id)}</td>
                  <td className="py-3 px-4 text-right hidden lg:table-cell">${getRepDrawBalance(user.id).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
