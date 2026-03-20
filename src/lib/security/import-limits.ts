/**
 * Hard caps for bulk imports — fail validation before heavy DB work.
 * Adjust only with ops/product agreement (see `docs/SECURITY.md`).
 */
export const MAX_DEAL_IMPORT_ROWS = 2_500;

/** Max KPI import weeks per request (each week may include acq + dispo rep rows). */
export const MAX_KPI_IMPORT_WEEKS = 156;

/** Max rep rows per team (acquisitions or dispositions) inside a single week object. */
export const MAX_KPI_REPS_PER_TEAM_PER_WEEK = 250;
