export const acquisitionsWeeklyTargets = [
  { label: "Dials", value: "250" },
  { label: "Talk Time (min)", value: "480" },
  { label: "Leads Worked", value: "40" },
  { label: "Offers Made", value: "12" },
  { label: "Contracts Signed", value: "2" },
  { label: "Max Fallouts", value: "1" },
];

export const dispositionsWeeklyTargets = [
  { label: "Dials", value: "180" },
  { label: "Talk Time (min)", value: "360" },
  { label: "Buyer Conversations", value: "30" },
  { label: "Properties Marketed", value: "5" },
  { label: "EMDs Received", value: "2" },
  { label: "Assignments Secured", value: "1" },
];

export const notificationPreferences = [
  {
    key: "deal_status_changes",
    label: "Deal status changes",
    desc: "Notify when a deal moves to a new stage",
  },
  { key: "draw_requests", label: "Draw requests", desc: "Notify admin of new draw requests" },
  { key: "kpi_deadline_reminders", label: "KPI deadline reminders", desc: "Remind reps to submit weekly KPIs" },
  { key: "points_awarded", label: "Points awarded", desc: "Notify reps when points are earned" },
  { key: "deal_funded", label: "Deal funded", desc: "Notify team when a deal closes" },
] as const;

export const integrations = [
  { name: "Aircall", desc: "Auto-sync dials and talk time from Aircall", connected: false },
  { name: "CRM Import", desc: "Import leads and deals from your CRM", connected: false },
  { name: "Title Company API", desc: "Receive closing data from title companies", connected: false },
  { name: "Google Sheets", desc: "Export reports to Google Sheets", connected: false },
];

