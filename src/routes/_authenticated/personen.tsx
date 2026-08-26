import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { personsQueryOptions } from "@/lib/verleih.queries";
import { deletePerson, savePerson, type PersonDTO } from "@/lib/verleih.functions";
import { PersonCsvImportDialog } from "@/components/PersonCsvImportDialog";

export const Route = createFileRoute("/_authenticated/personen")({
  head: () => ({
    meta: [
      { title: "Personen verwalten – Kleiderverleih" },
      {
        name: "description",
        content: "Personen anlegen und pflegen, die Hosen und Jacken ausleihen dürfen.",
      },
      { property: "og:title", content: "Personen verwalten – Kleiderverleih" },
      { property: "og:description", content: "Stammdaten der ausleihenden Personen." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(personsQueryOptions()),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Nicht gefunden.</div>,
  component: PersonenPage,
});

type FormState = {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  note: string;
  birth_date: string;
  guardian_name: string;
  membership_start: string;
  membership_end: string;
  annual_fee: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  full_name: "",
  email: "",
  phone: "",
  note: "",
  birth_date: "",
  guardian_name: "",
  membership_start: "",
  membership_end: "",
  annual_fee: "",
  is_active: true,
};

function PersonenPage() {
  const queryClient = useQueryClient();
  const { data: persons } = useSuspenseQuery(personsQueryOptions());
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return persons.filter(
      (p) =>
        term === "" ||
        `${p.full_name} ${p.email ?? ""} ${p.phone ?? ""}`.toLowerCase().includes(term),
    );
  }, [persons, search]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["persons"] });
    void queryClient.invalidateQueries({ queryKey: ["garments"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      savePerson({
        data: {
          id: form.id,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          note: form.note.trim(),
          birth_date: form.birth_date,
          guardian_name: form.guardian_name.trim(),
          membership_start: form.membership_start,
          membership_end: form.membership_end,
          annual_fee: form.annual_fee.trim(),
          is_active: form.is_active,
        },
      }),
    onSuccess: () => {
      toast.success("Person gespeichert");
      setOpen(false);
      setForm(EMPTY);
      invalidate();
    },
    onError: (error: Error) =>
      toast.error("Speichern fehlgeschlagen", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePerson({ data: { id } }),
    onSuccess: () => {
      toast.success("Person gelöscht");
      invalidate();
    },
    onError: () =>
      toast.error("Löschen nicht möglich", {
        description: "Die Person hat Einträge in der Historie. Bitte deaktivieren.",
      }),
  });

  const startEdit = (p: PersonDTO) => {
    setForm({
      id: p.id,
      full_name: p.full_name,
      email: p.email ?? "",
      phone: p.phone ?? "",
      note: p.note ?? "",
      birth_date: p.birth_date ?? "",
      guardian_name: p.guardian_name ?? "",
      membership_start: p.membership_start ?? "",
      membership_end: p.membership_end ?? "",
      annual_fee: p.annual_fee !== null ? String(p.annual_fee) : "",
      is_active: p.is_active,
    });
    setOpen(true);
  };

  return (
    <AppShell
      title="Personen"
      description="Wer darf Kleidung ausleihen"
      actions={
        <div className="flex flex-wrap gap-2">
          <PersonCsvImportDialog onImported={invalidate} />
          <Button
            size="sm"
            onClick={() => {
              setForm(EMPTY);
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Neu
          </Button>
        </div>
      }
    >
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Person suchen"
        className="max-w-xs"
      />

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.email || p.phone || "Keine Kontaktdaten"}
                  </p>
                </div>
                <Badge variant={p.open_loans > 0 ? "secondary" : "outline"}>
                  {p.is_active ? `${p.open_loans} offen` : "inaktiv"}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {p.birth_date ? (
                  <>
                    <dt>Geburtsdatum</dt>
                    <dd className="text-foreground">{formatDate(p.birth_date)}</dd>
                  </>
                ) : null}
                {p.guardian_name ? (
                  <>
                    <dt>Erziehungsberechtigt</dt>
                    <dd className="text-foreground">{p.guardian_name}</dd>
                  </>
                ) : null}
                {p.annual_fee !== null ? (
                  <>
                    <dt>Leihgebühr / Jahr</dt>
                    <dd className="text-foreground">
                      {p.annual_fee.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                    </dd>
                  </>
                ) : null}
                {p.membership_start || p.membership_end ? (
                  <>
                    <dt>Mitgliedschaft</dt>
                    <dd className="text-foreground">
                      {formatDate(p.membership_start)} – {formatDate(p.membership_end)}
                    </dd>
                  </>
                ) : null}
              </dl>
              {p.note ? <p className="text-xs text-muted-foreground">{p.note}</p> : null}
              <div className="flex items-center justify-between gap-1 pt-1">
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link to="/person/$personId" params={{ personId: p.id }}>
                    Details <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Bearbeiten" onClick={() => startEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Löschen"
                  onClick={() => deleteMutation.mutate(p.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Personen gefunden.</p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Person bearbeiten" : "Neue Person"}</DialogTitle>
            <DialogDescription>Name und optionale Kontaktdaten erfassen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birth">Geburtsdatum</Label>
                <Input
                  id="birth"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian">Erziehungsberechtigter</Label>
                <Input
                  id="guardian"
                  value={form.guardian_name}
                  onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mstart">Mitgliedschaft von</Label>
                <Input
                  id="mstart"
                  type="date"
                  value={form.membership_start}
                  onChange={(e) => setForm({ ...form, membership_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mend">Mitgliedschaft bis</Label>
                <Input
                  id="mend"
                  type="date"
                  value={form.membership_end}
                  onChange={(e) => setForm({ ...form, membership_end: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee">Jährliche Leihgebühr (EUR)</Label>
              <Input
                id="fee"
                inputMode="decimal"
                placeholder="z. B. 25,00"
                value={form.annual_fee}
                onChange={(e) => setForm({ ...form, annual_fee: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pnote">Notiz</Label>
              <Textarea
                id="pnote"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="pactive">Aktiv</Label>
              <Switch
                id="pactive"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button
              disabled={form.full_name.trim() === "" || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
