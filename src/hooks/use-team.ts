import { useQuery } from '@tanstack/react-query';
import { fetchTeamMembers } from '@/services/team.service';

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: () => fetchTeamMembers(),
  });
}
