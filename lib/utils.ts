import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PROJECT_STAGES = [
  { key: "RFQ",                label: "RFQ" },
  { key: "PROJECT_WON",        label: "Project Won" },
  { key: "EQUIPMENT_ORDERED",  label: "Equipment Ordered" },
  { key: "CUSTOMER_EQUIPMENT", label: "Customer Equipment" },
  { key: "VENDOR_QUOTE",       label: "Vendor Quote" },
  { key: "VENDOR_APPROVED",    label: "Quote Approved" },
  { key: "ITEMS_PREPPED",      label: "Items Prepped" },
  { key: "SAMPLE_DEBUG",       label: "Sample Board" },
  { key: "DEBUG",              label: "Debug" },
  { key: "CUSTOMER_MEETING",   label: "Customer Meeting" },
  { key: "WIRING_COMPLETE",    label: "Wiring Diagram" },
  { key: "FIXTURE_DELIVERED",  label: "Fixture Delivered" },
  { key: "DEBUG_FIXTURE",      label: "Debug Fixture" },
  { key: "CODING",             label: "Coding" },
  { key: "CYCLE_RUN",          label: "Type One" },
  { key: "TESTER_DELIVERED",   label: "BYOFF" },
] as const;

export type ProjectStageKey = typeof PROJECT_STAGES[number]["key"];

export function stageIndex(stage: string) {
  return PROJECT_STAGES.findIndex((s) => s.key === stage);
}

export function priorityColor(p: string) {
  switch (p) {
    case "CRITICAL": return "badge-red";
    case "HIGH":     return "badge-red";
    case "MEDIUM":   return "badge-yellow";
    case "LOW":      return "badge-gray";
    default:         return "badge-gray";
  }
}

export function statusColor(s: string) {
  switch (s) {
    case "DONE":
    case "RESOLVED":    return "badge-green";
    case "IN_PROGRESS": return "badge-blue";
    case "OPEN":        return "badge-yellow";
    default:            return "badge-gray";
  }
}

export function itemStatusColor(s: string) {
  switch (s) {
    case "RECEIVED":      return "badge-green";
    case "ORDERED":       return "badge-blue";
    case "SENT_TO_VENDOR":return "badge-yellow";
    case "IN_USE":        return "badge-red";
    case "PENDING":       return "badge-gray";
    default:              return "badge-gray";
  }
}
