import { getArchetype } from "../../lib/curation/archetypes";
import type { ArchetypeId } from "../../lib/curation/types";
import { cn } from "../../lib/utils";

export function ArchetypeBadge({
  id,
  className,
  showIndex = true,
}: {
  id: ArchetypeId;
  className?: string;
  showIndex?: boolean;
}) {
  const arch = getArchetype(id);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground",
        className,
      )}
    >
      {showIndex && <span className="font-mono text-[10px] text-primary">{arch.index}</span>}
      {arch.name}
    </span>
  );
}
