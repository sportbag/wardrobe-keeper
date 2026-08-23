import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { garmentsQueryOptions } from "@/lib/verleih.queries";
import { deleteGarment, saveGarment, type GarmentDTO } from "@/lib/verleih.functions";
import { GARMENT_TYPE_LABEL, type GarmentType } from "@/lib/verleih.schemas";

export const Route = createFileRoute("/_authenticated/kleidung")({
  head: () => ({
    meta: [
      { title: "Kleidung verwalten – Kleiderverleih" },
      {
        name: "description",
        content: "Hosen und Jacken mit Kennung, Größe und Zustand anlegen und pflegen.",
      },
      { property: "og:title", content: "Kleidung verwalten – Kleiderverleih" },
      { property: "og:description", content: "Bestand an Hosen und Jacken pflegen." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(garmentsQueryOptions()),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Nicht gefunden.</div>,
  component: KleidungPage,
});

type FormState = {
  id?: string;
  code: string;
  type: GarmentType;
  size: string;
  note: string;
  is_active: boolean;
};

const EMPTY: FormState = { code: "", type: "hose", size: "", note: "", is_active: true };

function KleidungPage() {
  const queryClient = useQueryClient();
  const { data: garments } = useSuspenseQuery(garmentsQueryOptions());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"alle" | GarmentType>("alle");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return garments.filter(
      (g) =>
        (filter === "alle" || g.type === filter) &&
        (term === "" ||
          `${g.code} ${g.size ?? ""} ${g.note ?? ""}`.toLowerCase().includes(term)),
    );
  }, [garments, search, filter]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["garments"] });
    void queryClient.invalidateQueries({ queryKey: ["loans"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      saveGarment({
        data: {
          id: form.id,
          code: form.code.trim(),
          type: form.type,
          size: form.size.trim(),
          note: form.note.trim(),
          is_active: form.is_active,
        },
      }),
    onSuccess: () => {
      toast.success("Kleidungsstück gespeichert");
      setOpen(false);
      setForm(EMPTY);
      invalidate();
    },
    onError: (error: Error) =>
      toast.error("Speichern fehlgeschlagen", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGarment({ data: { id } }),
    onSuccess: () => {
      toast.success("Kleidungsstück gelöscht");
      invalidate();
    },
    onError: () =>
      toast.error("Löschen nicht möglich", {
        description: "Das Kleidungsstück hat Einträge in der Historie. Bitte deaktivieren.",
      }),
  });

  const startEdit = (g: GarmentDTO) => {
    setForm({
      id: g.id,
      code: g.code,
      type: g.type,
      size: g.size ?? "",
      note: g.note ?? "",
      is_active: g.is_active,
    });
    setOpen(true);
  };

  return (
    <AppShell
      title="Kleidung"
      description="Bestand an Hosen und Jacken"
      actions={
        <Button
          size="sm"
          onClick={() => {
            setForm(EMPTY);
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Neu
        </Button>
      }
    >
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen"
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Typen</SelectItem>
            <SelectItem value="hose">Hosen</SelectItem>
            <SelectItem value="jacke">Jacken</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((g) => (
          <Card key={g.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{g.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {GARMENT_TYPE_LABEL[g.type]}
                    {g.size ? ` · Gr. ${g.size}` : ""}
                  </p>
                </div>
                <Badge variant={g.current ? "secondary" : "outline"}>
                  {!g.is_active ? "inaktiv" : g.current ? "verliehen" : "verfügbar"}
                </Badge>
              </div>
              {g.note ? <p className="text-xs text-muted-foreground">{g.note}</p> : null}
              {g.current ? (
                <p className="text-xs text-muted-foreground">bei {g.current.person_name}</p>
              ) : null}
              <div className="flex justify-end gap-1 pt-1">
                <Button variant="ghost" size="icon" aria-label="Bearbeiten" onClick={() => startEdit(g)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Löschen"
                  onClick={() => deleteMutation.mutate(g.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Kleidungsstücke gefunden.</p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Kleidungsstück bearbeiten" : "Neues Kleidungsstück"}</DialogTitle>
            <DialogDescription>Kennung, Typ, Größe und Zustand erfassen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kennung *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="z. B. H-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as GarmentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hose">Hose</SelectItem>
                    <SelectItem value="jacke">Jacke</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Größe</Label>
                <Input
                  id="size"
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  placeholder="z. B. 52"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gnote">Notiz / Zustand</Label>
              <Textarea
                id="gnote"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="active">Aktiv im Bestand</Label>
              <Switch
                id="active"
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
              disabled={form.code.trim() === "" || saveMutation.isPending}
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
