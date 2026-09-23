export function LockIcon({ locked }: { locked: boolean }) {
  return locked ? (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <rect x={5} y={11} width={14} height={9} rx={1.5} stroke="currentColor" strokeWidth={1.5} fill="none" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth={1.5} fill="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={14} height={14}>
      <rect x={5} y={11} width={14} height={9} rx={1.5} stroke="currentColor" strokeWidth={1.5} fill="none" />
      <path d="M8 11V7a4 4 0 0 1 7.5-2" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}
