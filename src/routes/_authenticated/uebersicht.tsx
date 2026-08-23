import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { garmentsQueryOptions } from "@/lib/verleih.queries";
import { formatDate, formatDuration } from "@/lib/format";
import { GARMENT_TYPE_LABEL } from "@/lib/verleih.schemas";

export const Route = createFileRoute("/_authenticated/uebersicht")({
  head: () => ({
    meta: [
      { title: "Wer hat was – Kleiderverleih" },
      {
        name: "description",
        content: "Übersicht, welche Person aktuell welche Hose oder Jacke besitzt.",
      },
      { property: "og:title", content: "Wer hat was – Kleiderverleih" },
      { property: "og:description", content: "Aktueller Besitzstand aller Kleidungsstücke." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(garmentsQueryOptions()),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Nicht gefunden.</div>,
  component: UebersichtPage,
});

function UebersichtPage() {
  const { data: garments } = useSuspenseQuery(garmentsQueryOptions());
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: typeof garments }>();
    for (const g of garments) {
      if (!g.current) continue;
      const entry = map.get(g.current.person_id) ?? { name: g.current.person_name, items: [] };
      entry.items = [...entry.items, g];
      map.set(g.current.person_id, entry);
    }
    const term = search.trim().toLowerCase();
    return [...map.values()]
      .filter(
        (group) =>
          term === "" ||
          group.name.toLowerCase().includes(term) ||
          group.items.some((g) => g.code.toLowerCase().includes(term)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [garments, search]);

  const free = garments.filter((g) => g.is_active && !g.current);

  return (
    <AppShell title="Wer hat was" description="Aktueller Besitzstand je Person">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Person oder Kennung suchen"
        className="max-w-sm"
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.name}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{group.name}</CardTitle>
              <Badge variant="secondary">{group.items.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <span>
                    <span className="font-medium">{g.code}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {GARMENT_TYPE_LABEL[g.type]}
                      {g.size ? ` · Gr. ${g.size}` : ""}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    seit {formatDate(g.current!.issued_at)} ({formatDuration(g.current!.issued_at)})
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine laufenden Ausleihen gefunden.</p>
        ) : null}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Verfügbar im Lager ({free.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {free.map((g) => (
            <Badge key={g.id} variant="outline">
              {g.code} · {GARMENT_TYPE_LABEL[g.type]}
              {g.size ? ` · ${g.size}` : ""}
            </Badge>
          ))}
          {free.length === 0 ? (
            <p className="text-sm text-muted-foreground">Alles ausgegeben.</p>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
