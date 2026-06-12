import { FORM_SECTIONS } from "../../../lib/curation/form";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

export function FormStep({
  form,
  setField,
}: {
  form: Record<string, string>;
  setField: (id: string, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      {FORM_SECTIONS.map((section) => (
        <section
          key={section.id}
          className="rounded-2xl border border-border bg-card p-6 shadow-clean sm:p-7"
        >
          <div className="flex items-start gap-4 border-b border-border pb-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground font-mono text-sm font-bold text-background">
              {section.letter}
            </span>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">{section.title}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{section.subtitle}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {section.fields.map((field) => {
              const isWide = field.type === "textarea";
              return (
                <div key={field.id} className={isWide ? "md:col-span-2" : ""}>
                  <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
                    {field.label}
                  </Label>
                  <div className="mt-1.5">
                    {field.type === "textarea" && (
                      <Textarea
                        id={field.id}
                        value={form[field.id] ?? ""}
                        onChange={(e) => setField(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                      />
                    )}
                    {field.type === "text" && (
                      <Input
                        id={field.id}
                        value={form[field.id] ?? ""}
                        onChange={(e) => setField(field.id, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.type === "select" && (
                      <Select
                        value={form[field.id] ?? ""}
                        onValueChange={(v) => setField(field.id, v)}
                      >
                        <SelectTrigger id={field.id}>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{field.helper}</p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
