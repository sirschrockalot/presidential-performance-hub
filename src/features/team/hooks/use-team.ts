import { useQuery } from "@tanstack/react-query";
import { fetchTeamMembers } from "@/features/team/services/placeholder/team.service";
import { useAuthz } from "@/lib/auth/authz-context";

export function useTeamMembers() {
  const { dataScope, status } = useAuthz();
  return useQuery({
    queryKey: ["team-members", dataScope],
    queryFn: () => fetchTeamMembers(dataScope),
    enabled: status === "authenticated",
  });
}
