import { useMemo } from "react";
import {
  getCommissionWindows,
  getRepWindowSummaries,
} from "../services/placeholder/commissions.service";

/** SWAP POINT: Replace with React Query + API call */
export function useCommissionWindows() {
  return useMemo(() => getCommissionWindows(), []);
}

export function useRepWindowSummaries(windowId: string) {
  return useMemo(() => getRepWindowSummaries(windowId), [windowId]);
}
