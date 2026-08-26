import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatDuration } from "@/lib/format";
import { personDetailQueryOptions } from "@/lib/verleih.queries";
import { deleteFeePayment, saveFeePayment, type FeePaymentDTO, type LoanDTO } from "@/lib/verleih.functions";
import { GARMENT_TYPE_LABEL } from "@/lib/verleih.schemas";

export const Route = createFileRoute("/_authenticated/person/$personId")({
  head: () => ({
    meta: [
      { title: "Person – Zahlungen & Ausleihen | Kleiderverleih" },
      {
        name: "description",
        content:
          "Detailseite einer Person: jährliche Leihgebühr, Zahlungszeitstrahl der letzten drei Jahre und Ausleih-Zeitstrahl.",
      },
      { property: "og:title", content: "Person – Zahlungen & Ausleihen" },
      {
        property: "og:description",
        content: "Zahlungsstatus und Kleidungsstücke einer Person im Zeitverlauf.",
      },
    ],
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(personDetailQueryOptions(params.personId)),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Person nicht gefunden.</div>,
  component: PersonDetailPage,
});

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function yearFraction(dateIso: string): number {
  const d = new Date(dateIso);
  const start = new Date(d.getFullYear(), 0, 1).getTime();
  const end = new Date(d.getFullYear() + 1, 0, 1).getTime();
  return Math.min(1, Math.max(0, (d.getTime() - start) / (end - start)));
}

function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function PaymentTimeline({
  years,
  payments,
}: {
  years: number[];
  payments: FeePaymentDTO[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 pl-14 text-[10px] text-muted-foreground">
        {MONTHS.map((m, i) => (
          <span key={i} className="flex-1 text-center">
            {m}
          </span>
        ))}
      </div>
      {years.map((year) => {
        const payment = payments.find((p) => p.year === year);
        return (
          <div key={year} className="flex items-center gap-3">
            <span className="w-11 shrink-0 text-sm font-medium tabular-nums">{year}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md border border-border bg-muted/50">
              {payment ? (
                <>
                  <div className="h-full w-full bg-success/25" />
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-success"
                    style={{ left: `${yearFraction(payment.paid_on) * 100}%` }}
                    title={`Gezahlt am ${formatDate(payment.paid_on)} · ${formatEuro(payment.amount)}`}
                  />
                </>
              ) : null}
            </div>
            <span className="w-36 shrink-0 text-right text-xs text-muted-foreground">
              {payment
                ? `${formatDate(payment.paid_on)} · ${formatEuro(payment.amount)}`
                : "offen"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LoanTimeline({ loans }: { loans: LoanDTO[] }) {
  const { start, span } = useMemo(() => {
    const now = Date.now();
    const times = loans.map((l) => new Date(l.issued_at).getTime());
    const min = times.length ? Math.min(...times) : now - 86400000 * 30;
    const startTime = Math.min(min, now - 86400000 * 30);
    return { start: startTime, span: Math.max(now - startTime, 86400000) };
  }, [loans]);

  if (loans.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch keine Ausleihen erfasst.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between pl-28 text-[10px] text-muted-foreground">
        <span>{formatDate(new Date(start).toISOString())}</span>
        <span>heute</span>
      </div>
      {loans.map((loan) => {
        const from = new Date(loan.issued_at).getTime();
        const to = loan.returned_at ? new Date(loan.returned_at).getTime() : Date.now();
        const left = ((from - start) / span) * 100;
        const width = Math.max(1.5, ((to - from) / span) * 100);
        return (
          <div key={loan.id} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-xs font-medium">
              {loan.garment_code}
              <span className="ml-1 text-muted-foreground">
                {GARMENT_TYPE_LABEL[loan.garment_type]}
              </span>
            </span>
            <div className="relative h-5 flex-1 rounded-md bg-muted/50">
              <div
                className={`absolute top-0 h-full rounded-md ${
                  loan.returned_at ? "bg-primary/40" : "bg-warning"
                }`}
                style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                title={`${formatDate(loan.issued_at)} – ${
                  loan.returned_at ? formatDate(loan.returned_at) : "offen"
                }`}
              />
            </div>
            <span className="hidden w-40 shrink-0 text-right text-xs text-muted-foreground sm:block">
              {formatDate(loan.issued_at)} · {formatDuration(loan.issued_at, loan.returned_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PersonDetailPage() {
  const { personId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(personDetailQueryOptions(personId));
  const { person, payments, loans } = data;

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];
  const missing = years.filter((y) => !payments.some((p) => p.year === y));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: undefined as string | undefined,
    year: currentYear,
    amount: person.annual_fee ? String(person.annual_fee) : "",
    paid_on: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["person-detail", personId] });
    void queryClient.invalidateQueries({ queryKey: ["persons"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      saveFeePayment({
        data: {
          id: form.id,
          person_id: personId,
          year: Number(form.year),
          amount: Number(form.amount.replace(",", ".") || 0),
          paid_on: form.paid_on,
          note: form.note.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Zahlung gespeichert");
      setOpen(false);
      invalidate();
    },
    onError: (error: Error) =>
      toast.error("Speichern fehlgeschlagen", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeePayment({ data: { id } }),
    onSuccess: () => {
      toast.success("Zahlung gelöscht");
      invalidate();
    },
    onError: (error: Error) => toast.error("Löschen fehlgeschlagen", { description: error.message }),
  });

  return (
    <AppShell
      title={person.full_name}
      description="Zahlungen und Ausleihen im Zeitverlauf"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/personen">
              <ArrowLeft className="mr-1 h-4 w-4" /> Personen
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setForm({
                id: undefined,
                year: currentYear,
                amount: person.annual_fee ? String(person.annual_fee) : "",
                paid_on: new Date().toISOString().slice(0, 10),
                note: "",
              });
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Zahlung
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stammdaten</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Jährliche Leihgebühr</dt>
                <dd className="font-medium">
                  {person.annual_fee !== null ? formatEuro(person.annual_fee) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Geburtsdatum</dt>
                <dd className="font-medium">{formatDate(person.birth_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Erziehungsberechtigt</dt>
                <dd className="font-medium">{person.guardian_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Mitgliedschaft</dt>
                <dd className="font-medium">
                  {formatDate(person.membership_start)} – {formatDate(person.membership_end)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base">Leihgebühr – letzte 3 Jahre</CardTitle>
            <Badge variant={missing.length === 0 ? "secondary" : "outline"}>
              {missing.length === 0 ? "vollständig bezahlt" : `offen: ${missing.join(", ")}`}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <PaymentTimeline years={years} payments={payments} />
            {payments.length > 0 ? (
              <ul className="divide-y divide-border rounded-md border border-border text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="tabular-nums">
                      {p.year} · {formatDate(p.paid_on)} · {formatEuro(p.amount)}
                      {p.note ? (
                        <span className="ml-2 text-xs text-muted-foreground">{p.note}</span>
                      ) : null}
                    </span>
                    <span className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm({
                            id: p.id,
                            year: p.year,
                            amount: String(p.amount),
                            paid_on: p.paid_on,
                            note: p.note ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Zahlung löschen"
                        onClick={() => deleteMutation.mutate(p.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kleidungsstücke im Zeitverlauf</CardTitle>
          </CardHeader>
          <CardContent>
            <LoanTimeline loans={loans} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Zahlung bearbeiten" : "Zahlung erfassen"}</DialogTitle>
            <DialogDescription>Jahr, Betrag und Zahldatum der Leihgebühr.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="year">Jahr</Label>
              <Input
                id="year"
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Betrag (EUR)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid">Gezahlt am</Label>
              <Input
                id="paid"
                type="date"
                value={form.paid_on}
                onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pnote">Notiz</Label>
              <Input
                id="pnote"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
