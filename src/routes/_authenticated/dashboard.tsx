import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeftRight, PackageCheck, Shirt, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { garmentsQueryOptions, personsQueryOptions } from "@/lib/verleih.queries";
import { formatDate, formatDuration } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – Kleiderverleih" },
      {
        name: "description",
        content: "Überblick über Bestand, aktuell verliehene Hosen und Jacken sowie Rückgaben.",
      },
      { property: "og:title", content: "Dashboard – Kleiderverleih" },
      { property: "og:description", content: "Bestand und laufende Ausleihen auf einen Blick." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(garmentsQueryOptions()),
      context.queryClient.ensureQueryData(personsQueryOptions()),
    ]),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Nicht gefunden.</div>,
  component: DashboardPage,
});

function DashboardPage() {
  const { data: garments } = useSuspenseQuery(garmentsQueryOptions());
  const { data: persons } = useSuspenseQuery(personsQueryOptions());

  const active = garments.filter((g) => g.is_active);
  const lent = active.filter((g) => g.current);
  const available = active.filter((g) => !g.current);
  const recent = [...lent]
    .sort((a, b) => (a.current!.issued_at < b.current!.issued_at ? 1 : -1))
    .slice(0, 5);

  const stats = [
    { label: "Bestand", value: active.length, icon: Shirt },
    { label: "Verliehen", value: lent.length, icon: ArrowLeftRight },
    { label: "Verfügbar", value: available.length, icon: PackageCheck },
    { label: "Personen", value: persons.filter((p) => p.is_active).length, icon: Users },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Aktueller Stand des Kleiderverleihs"
      actions={
        <Button asChild size="sm">
          <Link to="/verleih">Ausgabe / Rücknahme</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <stat.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold leading-none">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Zuletzt ausgegeben</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aktuell ist nichts verliehen.</p>
          ) : (
            recent.map((g) => (
              <div
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {g.code} · {g.type === "hose" ? "Hose" : "Jacke"}
                    {g.size ? ` · Gr. ${g.size}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.current!.person_name} · seit {formatDate(g.current!.issued_at)}
                  </p>
                </div>
                <Badge variant="secondary">{formatDuration(g.current!.issued_at)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
