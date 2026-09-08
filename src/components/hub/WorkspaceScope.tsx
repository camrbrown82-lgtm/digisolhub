export function WorkspaceScope({
  companyName,
  noun,
}: {
  companyName?: string | null;
  noun: string;
}) {
  if (companyName) {
    return (
      <p className="mt-1 text-sm text-zinc-400">
        Scoped to <span className="text-zinc-200">{companyName}</span>. New {noun}{" "}
        attach to this company.
      </p>
    );
  }

  return (
    <p className="mt-1 text-sm text-zinc-400">
      All companies. Choose one under Working on to keep {noun} separate.
    </p>
  );
}
