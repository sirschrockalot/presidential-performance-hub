import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { useTeamMembers } from '@/hooks/use-team';
import { getRoleLabel, TeamMember } from '@/services/team.service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MoreHorizontal } from 'lucide-react';

export default function TeamPage() {
  const { data: members, isLoading } = useTeamMembers();

  const columns = useMemo<ColumnDef<TeamMember, any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {row.original.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ getValue }) => <span className="text-muted-foreground">{getRoleLabel(getValue() as any)}</span>,
      },
      {
        accessorKey: 'team',
        header: 'Team',
        cell: ({ getValue }) => <span className="capitalize text-muted-foreground">{getValue() as string}</span>,
      },
      {
        accessorKey: 'active',
        header: 'Status',
        meta: { align: 'center' },
        cell: ({ getValue }) => (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getValue() ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
            {getValue() ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        accessorKey: 'points',
        header: 'Points',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="font-medium">{getValue() as number}</span>,
      },
      {
        accessorKey: 'drawBalance',
        header: 'Draw Balance',
        meta: { align: 'right' },
        cell: ({ getValue }) => `$${(getValue() as number).toLocaleString()}`,
      },
      {
        id: 'actions',
        header: '',
        cell: () => (
          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
        ),
        enableSorting: false,
      },
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Team" description="Manage team members and roles">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Member</Button>
      </PageHeader>

      {isLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : (
        <DataTable columns={columns} data={members ?? []} emptyMessage="No team members" />
      )}
    </div>
  );
}
