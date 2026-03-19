import type { Team, UserRole } from "@/types";

/**
 * Team list row — matches `listTeamMembers` API payload.
 * Role/team use UI literals (`admin`, `acquisitions`, …) for existing components.
 */
export type TeamMemberDto = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: Team;
  active: boolean;
  joinedAt: string;
  points: number;
  drawBalance: number;
};

/** Alias for table columns / legacy naming */
export type TeamMember = TeamMemberDto;
