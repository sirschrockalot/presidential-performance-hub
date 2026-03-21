import { z } from "zod";

export type ChangeOwnPasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "At least 8 characters").max(128),
    confirmNewPassword: z.string().min(1, "Confirm your new password"),
  })
  .strict()
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  }) as z.ZodType<ChangeOwnPasswordInput>;

export type AdminSetUserPasswordInput = {
  newPassword: string;
  confirmNewPassword: string;
};

export const adminSetUserPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "At least 8 characters").max(128),
    confirmNewPassword: z.string().min(1, "Confirm the new password"),
  })
  .strict()
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  }) as z.ZodType<AdminSetUserPasswordInput>;
