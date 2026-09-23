export function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth={1.5} fill="none" />
      <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth={1.5} fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M6.5 6.7C4 8.3 2 12 2 12s4 7 10 7c1.7 0 3.2-.4 4.5-1.1M9.9 5.2A10 10 0 0 1 12 5c6 0 10 7 10 7a15 15 0 0 1-2.3 3.1" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}
