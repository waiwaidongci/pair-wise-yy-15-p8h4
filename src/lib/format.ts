const pad = (n: number) => String(n).padStart(2, "0");

export function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtDateTime(ms: number | null): string {
  if (ms == null) return "—";
  const d = new Date(ms);
  return `${fmtDate(ms)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtSpeed(speed: number | null): string {
  return speed == null ? "—" : `${Math.round(speed).toLocaleString()} m/min`;
}

export function fmtKm(km: number | null): string {
  return km == null ? "—" : `${km} km`;
}

export function todayStr(): string {
  return fmtDate(Date.now());
}
