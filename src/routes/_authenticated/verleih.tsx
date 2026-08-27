import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PaymentsPanel } from "@/components/PaymentsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  feePaymentsQueryOptions,
  garmentsQueryOptions,
  personsQueryOptions,
} from "@/lib/verleih.queries";
import { issueLoans, returnLoan } from "@/lib/verleih.functions";
import { formatDate, formatDuration } from "@/lib/format";
import { GARMENT_TYPE_LABEL } from "@/lib/verleih.schemas";

export const Route = createFileRoute("/_authenticated/verleih")({
  head: () => ({
    meta: [
      { title: "Erfassung – Kleiderverleih" },
      {
        name: "description",
        content:
          "Ausgaben, Rücknahmen und jährliche Leihgebühren zentral erfassen.",
      },
      { property: "og:title", content: "Erfassung – Kleiderverleih" },
      {
        property: "og:description",
        content: "Ausleihen, Rückgaben und Zahlungen dokumentieren.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(garmentsQueryOptions()),
      context.queryClient.ensureQueryData(personsQueryOptions()),
      context.queryClient.ensureQueryData(feePaymentsQueryOptions()),
    ]),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Nicht gefunden.</div>,
  component: VerleihPage,
});

function VerleihPage() {
  const queryClient = useQueryClient();
  const { data: garments } = useSuspenseQuery(garmentsQueryOptions());
  const { data: persons } = useSuspenseQuery(personsQueryOptions());

  const [personId, setPersonId] = useState<string>("");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const available = useMemo(
    () =>
      garments.filter(
        (g) =>
          g.is_active &&
          !g.current &&
          (search.trim() === "" ||
            `${g.code} ${g.size ?? ""} ${GARMENT_TYPE_LABEL[g.type]}`
              .toLowerCase()
              .includes(search.trim().toLowerCase())),
      ),
    [garments, search],
  );

  const lent = useMemo(
    () =>
      garments
        .filter((g) => g.current)
        .sort((a, b) => (a.current!.issued_at < b.current!.issued_at ? -1 : 1)),
    [garments],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["garments"] });
    void queryClient.invalidateQueries({ queryKey: ["persons"] });
    void queryClient.invalidateQueries({ queryKey: ["loans"] });
  };

  const issueMutation = useMutation({
    mutationFn: () =>
      issueLoans({ data: { person_id: personId, garment_ids: selected, note } }),
    onSuccess: (result) => {
      toast.success(`${result.count} Kleidungsstück(e) ausgegeben`);
      setSelected([]);
      setNote("");
      invalidate();
    },
    onError: (error: Error) => toast.error("Ausgabe fehlgeschlagen", { description: error.message }),
  });

  const returnMutation = useMutation({
    mutationFn: (loanId: string) => returnLoan({ data: { id: loanId } }),
    onSuccess: () => {
      toast.success("Rücknahme erfasst");
      invalidate();
    },
    onError: (error: Error) =>
      toast.error("Rücknahme fehlgeschlagen", { description: error.message }),
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <AppShell
      title="Erfassung"
      description="Ausgabe, Rücknahme und Zahlungen an einer Stelle"
    >
      <Tabs defaultValue="ausgabe">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="ausgabe">Ausgabe</TabsTrigger>
          <TabsTrigger value="ruecknahme">Rücknahme ({lent.length})</TabsTrigger>
          <TabsTrigger value="zahlungen">Zahlungen</TabsTrigger>
        </TabsList>

        <TabsContent value="ausgabe" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Person wählen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Person auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {persons
                    .filter((p) => p.is_active)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                        {p.open_loans > 0 ? ` (${p.open_loans} offen)` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Label htmlFor="note">Notiz (optional)</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="z. B. Einsatz Winterdienst"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Kleidungsstücke wählen</CardTitle>
              <CardDescription>{available.length} verfügbar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suche nach Kennung, Typ oder Größe"
              />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {available.map((g) => (
                  <label
                    key={g.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/40"
                  >
                    <Checkbox
                      checked={selected.includes(g.id)}
                      onCheckedChange={() => toggle(g.id)}
                    />
                    <span className="text-sm">
                      <span className="font-medium">{g.code}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {GARMENT_TYPE_LABEL[g.type]}
                        {g.size ? ` · Gr. ${g.size}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
                {available.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine verfügbaren Kleidungsstücke.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm lg:bottom-4">
            <p className="text-sm text-muted-foreground">{selected.length} ausgewählt</p>
            <Button
              disabled={!personId || selected.length === 0 || issueMutation.isPending}
              onClick={() => issueMutation.mutate()}
            >
              {issueMutation.isPending ? "Wird gespeichert…" : "Ausgeben"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="ruecknahme" className="mt-4 space-y-3">
          {lent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aktuell ist nichts verliehen.</p>
          ) : (
            lent.map((g) => (
              <Card key={g.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      {g.code} · {GARMENT_TYPE_LABEL[g.type]}
                      {g.size ? ` · Gr. ${g.size}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {g.current!.person_name} · seit {formatDate(g.current!.issued_at)} (
                      {formatDuration(g.current!.issued_at)})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">verliehen</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={returnMutation.isPending}
                      onClick={() => returnMutation.mutate(g.current!.loan_id)}
                    >
                      Zurücknehmen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="zahlungen" className="mt-4">
          <PaymentsPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
