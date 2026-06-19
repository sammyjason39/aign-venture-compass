import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { CATEGORIES } from "../../lib/curation/rubric";
import type { CategoryScores } from "../../lib/curation/types";

export function CategoryRadar({
  ai,
  judges,
}: {
  ai?: Partial<CategoryScores> | null;
  judges?: Partial<CategoryScores> | null;
}) {
  const data = CATEGORIES.map((c) => ({
    category: c.short,
    AI: ai?.[c.id] ?? null,
    Judges: judges?.[c.id] ?? null,
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
          {ai && (
            <Radar
              name="AI"
              dataKey="AI"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.12}
            />
          )}
          {judges && (
            <Radar
              name="Judges"
              dataKey="Judges"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.25}
            />
          )}
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
