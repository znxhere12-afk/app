export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

export function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function fmtNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// FastAPI errors carry {detail: string} or a 422 {detail: [{msg, ...}]} — pull a readable line out.
export function apiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "body" in err) {
    const detail = (err as { body?: { detail?: unknown } }).body?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      return first.msg ? `Validation error: ${first.msg}` : "Validation error";
    }
  }
  return "Something went wrong — please try again";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
