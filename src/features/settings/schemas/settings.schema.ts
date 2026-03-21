import { z } from "zod";

/** Org-wide settings merged from DB `AppSettings.payload` with defaults. */
export const appSettingsStateSchema = z.object({
  companyName: z.string().min(1).max(200),
  industry: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  reportingPeriodLabel: z.string().min(1).max(200),
  lockReportingPeriods: z.boolean(),
  autoCalculatePoints: z.boolean(),
  drawRequireAdminApproval: z.boolean(),
  drawAutoRecoupOnClose: z.boolean(),
});

export type AppSettingsState = z.infer<typeof appSettingsStateSchema>;

export const DEFAULT_APP_SETTINGS: AppSettingsState = {
  companyName: "Presidential Digs",
  industry: "Wholesale Real Estate",
  location: "Dallas-Fort Worth, TX",
  reportingPeriodLabel: "Weekly (Mon–Sun)",
  lockReportingPeriods: false,
  autoCalculatePoints: true,
  drawRequireAdminApproval: true,
  drawAutoRecoupOnClose: true,
};

/** PATCH body: any subset of org fields. */
export const appSettingsPatchSchema = appSettingsStateSchema.partial().strict();

export type AppSettingsPatch = z.infer<typeof appSettingsPatchSchema>;

export function mergeAppSettingsPayload(raw: unknown): AppSettingsState {
  const parsed = appSettingsStateSchema.partial().safeParse(raw && typeof raw === "object" ? raw : {});
  const patch = parsed.success ? parsed.data : {};
  return { ...DEFAULT_APP_SETTINGS, ...patch };
}

const themeSchema = z.enum(["light", "dark", "system"]);

export const userPreferencesStateSchema = z.object({
  theme: themeSchema,
  notifications: z.record(z.string(), z.boolean()),
});

export type UserPreferencesState = z.infer<typeof userPreferencesStateSchema>;

export const DEFAULT_NOTIFICATION_KEYS = [
  "deal_status_changes",
  "draw_requests",
  "kpi_deadline_reminders",
  "points_awarded",
  "deal_funded",
] as const;

export function defaultNotificationMap(): Record<string, boolean> {
  return Object.fromEntries(DEFAULT_NOTIFICATION_KEYS.map((k) => [k, true])) as Record<string, boolean>;
}

export const defaultUserPreferencesState = (): UserPreferencesState => ({
  theme: "system",
  notifications: defaultNotificationMap(),
});

export const userPreferencesPatchSchema = z
  .object({
    theme: themeSchema.optional(),
    notifications: z.record(z.string(), z.boolean()).optional(),
  })
  .strict()
  .refine((v) => v.theme !== undefined || v.notifications !== undefined, {
    message: "Provide at least one field",
    path: [],
  });

export type UserPreferencesPatch = z.infer<typeof userPreferencesPatchSchema>;

export function mergeUserPreferences(raw: unknown): UserPreferencesState {
  const base = defaultUserPreferencesState();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const themeParsed = themeSchema.safeParse(o.theme);
  const theme = themeParsed.success ? themeParsed.data : base.theme;
  let notifications = { ...base.notifications };
  if (o.notifications && typeof o.notifications === "object" && !Array.isArray(o.notifications)) {
    const n = o.notifications as Record<string, unknown>;
    for (const [k, v] of Object.entries(n)) {
      if (typeof v === "boolean") notifications[k] = v;
    }
  }
  for (const k of DEFAULT_NOTIFICATION_KEYS) {
    if (notifications[k] === undefined) notifications[k] = true;
  }
  return { theme, notifications };
}
