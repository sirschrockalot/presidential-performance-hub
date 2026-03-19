import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTeamMembers,
  fetchTeamMember,
  createTeamMemberApi,
  patchTeamUserApi,
} from "@/features/team/services/team.service";
import type { CreateTeamMemberInput, AdminPatchTeamUserInput } from "@/features/team/schemas/team.schema";
import { useAuthz } from "@/lib/auth/authz-context";

export function useTeamMembers() {
  const { dataScope, status } = useAuthz();
  return useQuery({
    queryKey: ["team-members", dataScope],
    queryFn: () => fetchTeamMembers(dataScope),
    enabled: status === "authenticated",
  });
}

export function useTeamMember(id: string | null, options?: { enabled?: boolean }) {
  const { status } = useAuthz();
  const enabled = !!id && (options?.enabled ?? true) && status === "authenticated";
  return useQuery({
    queryKey: ["team-member", id],
    queryFn: () => fetchTeamMember(id!),
    enabled,
  });
}

export function useCreateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamMemberInput) => createTeamMemberApi(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["team-members"], exact: false });
    },
  });
}

export function usePatchTeamUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminPatchTeamUserInput }) => patchTeamUserApi(id, input),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ["team-members"], exact: false });
      void qc.invalidateQueries({ queryKey: ["team-member", id] });
    },
  });
}
