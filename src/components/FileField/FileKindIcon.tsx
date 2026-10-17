import { fileKindIcons, type FileKind } from './fileKind';

/** The typed icon for a kind of file, hidden from screen readers. */
export function FileKindIcon({ kind, className }: { kind: FileKind; className?: string }) {
  const Icon = fileKindIcons[kind];
  return <Icon aria-hidden="true" className={className} />;
}
