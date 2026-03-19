import { z } from "zod";
import { TeamCode, UserRoleCode } from "@prisma/client";

/** Route param :id for `/api/team/users/[id]` */
export const teamMemberIdParamSchema = z.string().min(1, "Invalid user id");

/**
 * Prisma enums (DB + API):
 * - ADMIN, ACQUISITIONS_MANAGER, DISPOSITIONS_MANAGER, TRANSACTION_COORDINATOR, REP
 * - ACQUISITIONS, DISPOSITIONS, OPERATIONS
 *
 * `ACQUISITIONS_MANAGER` / `DISPOSITIONS_MANAGER` are contractor / IC roles (legacy enum names).
 * UI literals: acquisitions_manager / dispositions_manager in `src/types`.
 */

export const createTeamMemberSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Valid email required"),
    password: z.string().min(8, "At least 8 characters").max(128),
    roleCode: z.nativeEnum(UserRoleCode),
    teamCode: z.nativeEnum(TeamCode),
  })
  .strict();

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

/** Admin (or authorized) PATCH — at least one field */
export const adminPatchTeamUserSchema = z
  .object({
    active: z.boolean().optional(),
    roleCode: z.nativeEnum(UserRoleCode).optional(),
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    teamCode: z.nativeEnum(TeamCode).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.active !== undefined ||
      v.roleCode !== undefined ||
      v.name !== undefined ||
      v.email !== undefined ||
      v.teamCode !== undefined,
    { message: "Provide at least one field to update", path: [] }
  );

export type AdminPatchTeamUserInput = z.infer<typeof adminPatchTeamUserSchema>;

/** Edit-member form (subset sent as PATCH) */
export const editTeamMemberFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Valid email required"),
    roleCode: z.nativeEnum(UserRoleCode),
    teamCode: z.nativeEnum(TeamCode),
  })
  .strict();

export type EditTeamMemberFormValues = z.infer<typeof editTeamMemberFormSchema>;
