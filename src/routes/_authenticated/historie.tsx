import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  garmentsQueryOptions,
  loansQueryOptions,
  myRoleQueryOptions,
  personsQueryOptions,
} from "@/lib/verleih.queries";
import { deleteLoan, updateLoan, type LoanDTO } from "@/lib/verleih.functions";
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

type EditState = {
  id: string;
  person_id: string;
  garment_id: string;
  issued_at: string;
  returned_at: string;
  note: string;
};

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toEditState = (loan: LoanDTO): EditState => ({
  id: loan.id,
  person_id: loan.person_id,
  garment_id: loan.garment_id,
  issued_at: toLocalInput(loan.issued_at),
  returned_at: toLocalInput(loan.returned_at),
  note: loan.note ?? "",
});

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
  const { data: role } = useQuery(myRoleQueryOptions());
  const isAdmin = role?.isAdmin === true;

  const queryClient = useQueryClient();
  const [edit, setEdit] = useState<EditState | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["loans"] });
    void queryClient.invalidateQueries({ queryKey: ["garments"] });
    void queryClient.invalidateQueries({ queryKey: ["persons"] });
    void queryClient.invalidateQueries({ queryKey: ["person-detail"] });
  };

  const saveMutation = useMutation({
    mutationFn: (state: EditState) =>
      updateLoan({
        data: {
          id: state.id,
          person_id: state.person_id,
          garment_id: state.garment_id,
          issued_at: state.issued_at,
          returned_at: state.returned_at,
          note: state.note,
        },
      }),
    onSuccess: () => {
      toast.success("Buchung aktualisiert");
      setEdit(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast.error("Änderung fehlgeschlagen", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLoan({ data: { id } }),
    onSuccess: () => {
      toast.success("Buchung gelöscht");
      setEdit(null);
      invalidate();
    },
    onError: (error: Error) => toast.error("Löschen fehlgeschlagen", { description: error.message }),
  });

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
              {isAdmin ? <TableHead className="text-right">Aktion</TableHead> : null}
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
                {isAdmin ? (
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEdit(toEditState(loan))}>
                      Bearbeiten
                    </Button>
                  </TableCell>
                ) : null}
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
              {isAdmin ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setEdit(toEditState(loan))}
                >
                  Bearbeiten
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Einträge gefunden.</p>
        ) : null}
      </div>

      <Dialog open={edit !== null} onOpenChange={(open) => (open ? null : setEdit(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buchung bearbeiten</DialogTitle>
            <DialogDescription>Nur Admins können Einträge der Historie anpassen.</DialogDescription>
          </DialogHeader>
          {edit ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Person</Label>
                <Select
                  value={edit.person_id}
                  onValueChange={(v) => setEdit({ ...edit, person_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <Select
                  value={edit.garment_id}
                  onValueChange={(v) => setEdit({ ...edit, garment_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {garments.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.code} · {GARMENT_TYPE_LABEL[g.type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="edit-issued">
                    Ausgegeben am
                  </Label>
                  <Input
                    id="edit-issued"
                    type="datetime-local"
                    value={edit.issued_at}
                    onChange={(e) => setEdit({ ...edit, issued_at: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="edit-returned">
                    Zurück am (leer = laufend)
                  </Label>
                  <Input
                    id="edit-returned"
                    type="datetime-local"
                    value={edit.returned_at}
                    onChange={(e) => setEdit({ ...edit, returned_at: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="edit-note">
                  Notiz
                </Label>
                <Input
                  id="edit-note"
                  value={edit.note}
                  onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              className="text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => edit && deleteMutation.mutate(edit.id)}
            >
              Löschen
            </Button>
            <Button
              disabled={!edit || !edit.issued_at || saveMutation.isPending}
              onClick={() => edit && saveMutation.mutate(edit)}
            >
              {saveMutation.isPending ? "Wird gespeichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
