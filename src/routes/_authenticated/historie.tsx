import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { garmentsQueryOptions, loansQueryOptions, personsQueryOptions } from "@/lib/verleih.queries";
import { formatDate, formatDuration } from "@/lib/format";
import { GARMENT_TYPE_LABEL, type GarmentType } from "@/lib/verleih.schemas";

export const Route = createFileRoute("/_authenticated/historie")({
  head: () => ({
    meta: [
      { title: "Historie – Kleiderverleih" },
      {
        name: "description",
        content: "Vollständige Historie: wann welches Kleidungsstück von wem ausgeliehen war.",
      },
      { property: "og:title", content: "Historie – Kleiderverleih" },
      { property: "og:description", content: "Alle Ausleihen und Rückgaben chronologisch." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(loansQueryOptions()),
      context.queryClient.ensureQueryData(personsQueryOptions()),
      context.queryClient.ensureQueryData(garmentsQueryOptions()),
    ]),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Nicht gefunden.</div>,
  component: HistoriePage,
});

const ALL = "alle";

function HistoriePage() {
  const { data: persons } = useSuspenseQuery(personsQueryOptions());
  const { data: garments } = useSuspenseQuery(garmentsQueryOptions());

  const [personId, setPersonId] = useState(ALL);
  const [garmentId, setGarmentId] = useState(ALL);
  const [type, setType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filter = {
    ...(personId !== ALL ? { person_id: personId } : {}),
    ...(garmentId !== ALL ? { garment_id: garmentId } : {}),
    ...(type !== ALL ? { type: type as GarmentType } : {}),
    ...(status !== ALL ? { status: status as "laufend" | "zurueck" } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
  };

  const { data: loans = [], isFetching } = useQuery(loansQueryOptions(filter));

  const reset = () => {
    setPersonId(ALL);
    setGarmentId(ALL);
    setType(ALL);
    setStatus(ALL);
    setFrom("");
    setTo("");
  };

  return (
    <AppShell title="Historie" description="Alle Ausleihen und Rückgaben">
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1">
            <Label className="text-xs">Person</Label>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Alle Personen</SelectItem>
                {persons.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Kleidungsstück</Label>
            <Select value={garmentId} onValueChange={setGarmentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Alle Stücke</SelectItem>
                {garments.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Alle</SelectItem>
                <SelectItem value="hose">Hose</SelectItem>
                <SelectItem value="jacke">Jacke</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Alle</SelectItem>
                <SelectItem value="laufend">Laufend</SelectItem>
                <SelectItem value="zurueck">Zurückgegeben</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="from">
              Von
            </Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="to">
              Bis
            </Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isFetching ? "Lädt…" : `${loans.length} Einträge`}
        </p>
        <Button variant="ghost" size="sm" onClick={reset}>
          Filter zurücksetzen
        </Button>
      </div>

      <Card className="mt-3 hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kleidungsstück</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Ausgegeben</TableHead>
              <TableHead>Zurück</TableHead>
              <TableHead>Dauer</TableHead>
              <TableHead>Notiz</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">
                  {loan.garment_code}
                  <span className="text-muted-foreground">
                    {" "}
                    · {GARMENT_TYPE_LABEL[loan.garment_type]}
                    {loan.garment_size ? ` · ${loan.garment_size}` : ""}
                  </span>
                </TableCell>
                <TableCell>{loan.person_name}</TableCell>
                <TableCell>{formatDate(loan.issued_at)}</TableCell>
                <TableCell>
                  {loan.returned_at ? (
                    formatDate(loan.returned_at)
                  ) : (
                    <Badge variant="secondary">laufend</Badge>
                  )}
                </TableCell>
                <TableCell>{formatDuration(loan.issued_at, loan.returned_at)}</TableCell>
                <TableCell className="text-muted-foreground">{loan.note ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loans.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Keine Einträge gefunden.</p>
        ) : null}
      </Card>

      <div className="mt-3 space-y-3 md:hidden">
        {loans.map((loan) => (
          <Card key={loan.id}>
            <CardContent className="space-y-1 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {loan.garment_code} · {GARMENT_TYPE_LABEL[loan.garment_type]}
                </p>
                <Badge variant={loan.returned_at ? "outline" : "secondary"}>
                  {loan.returned_at ? "zurück" : "laufend"}
                </Badge>
              </div>
              <p className="text-muted-foreground">{loan.person_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(loan.issued_at)} – {loan.returned_at ? formatDate(loan.returned_at) : "offen"} (
                {formatDuration(loan.issued_at, loan.returned_at)})
              </p>
              {loan.note ? <p className="text-xs text-muted-foreground">{loan.note}</p> : null}
            </CardContent>
          </Card>
        ))}
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Einträge gefunden.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
