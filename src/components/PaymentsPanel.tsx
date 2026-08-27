import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { feePaymentsQueryOptions, personsQueryOptions } from "@/lib/verleih.queries";
import { deleteFeePayment, saveFeePayment } from "@/lib/verleih.functions";
import { formatDate } from "@/lib/format";

const currency = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const today = () => new Date().toISOString().slice(0, 10);

export function PaymentsPanel() {
  const queryClient = useQueryClient();
  const { data: persons } = useSuspenseQuery(personsQueryOptions());
  const { data: payments = [] } = useQuery(feePaymentsQueryOptions());

  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [personId, setPersonId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  const reset = () => {
    setEditingId(undefined);
    setPersonId("");
    setYear(String(new Date().getFullYear()));
    setAmount("");
    setPaidOn(today());
    setNote("");
  };

  const choosePerson = (id: string) => {
    setPersonId(id);
    const person = persons.find((p) => p.id === id);
    if (!editingId && person?.annual_fee != null && amount.trim() === "") {
      setAmount(String(person.annual_fee).replace(".", ","));
    }
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["fee-payments"] });
    void queryClient.invalidateQueries({ queryKey: ["person-detail"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      saveFeePayment({
        data: {
          ...(editingId ? { id: editingId } : {}),
          person_id: personId,
          year: Number(year),
          amount: Number(amount.replace(",", ".")),
          paid_on: paidOn,
          note,
        },
      }),
    onSuccess: () => {
      toast.success(editingId ? "Zahlung aktualisiert" : "Zahlung erfasst");
      reset();
      invalidate();
    },
    onError: (error: Error) => toast.error("Speichern fehlgeschlagen", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeePayment({ data: { id } }),
    onSuccess: () => {
      toast.success("Zahlung gelöscht");
      invalidate();
    },
    onError: (error: Error) => toast.error("Löschen fehlgeschlagen", { description: error.message }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q === ""
      ? payments
      : payments.filter((p) => `${p.person_name} ${p.year}`.toLowerCase().includes(q));
  }, [payments, search]);

  const valid =
    personId !== "" &&
    /^\d{4}$/.test(year) &&
    /^\d+([.,]\d{1,2})?$/.test(amount.trim()) &&
    /^\d{4}-\d{2}-\d{2}$/.test(paidOn);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? "Zahlung bearbeiten" : "Zahlung erfassen"}
          </CardTitle>
          <CardDescription>Jährliche Leihgebühr zentral buchen</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1 sm:col-span-2 xl:col-span-1">
            <Label className="text-xs">Person</Label>
            <Select value={personId} onValueChange={choosePerson}>
              <SelectTrigger>
                <SelectValue placeholder="Person wählen" />
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
            <Label className="text-xs" htmlFor="fee-year">
              Jahr
            </Label>
            <Input id="fee-year" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="fee-amount">
              Betrag (EUR)
            </Label>
            <Input
              id="fee-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="z. B. 25,00"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="fee-date">
              Zahldatum
            </Label>
            <Input id="fee-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="fee-note">
              Notiz (optional)
            </Label>
            <Input id="fee-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-5">
            <Button disabled={!valid || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Wird gespeichert…" : editingId ? "Speichern" : "Zahlung buchen"}
            </Button>
            {editingId ? (
              <Button variant="ghost" onClick={reset}>
                Abbrechen
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Zahlungen durchsuchen (Person oder Jahr)"
      />

      <div className="space-y-2">
        {filtered.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">
                  {p.person_name} <Badge variant="secondary">{p.year}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {currency.format(p.amount)} · gezahlt am {formatDate(p.paid_on)}
                  {p.note ? ` · ${p.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(p.id);
                    setPersonId(p.person_id);
                    setYear(String(p.year));
                    setAmount(String(p.amount).replace(".", ","));
                    setPaidOn(p.paid_on);
                    setNote(p.note ?? "");
                  }}
                >
                  Bearbeiten
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(p.id)}
                >
                  Löschen
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Zahlungen erfasst.</p>
        ) : null}
      </div>
    </div>
  );
}
