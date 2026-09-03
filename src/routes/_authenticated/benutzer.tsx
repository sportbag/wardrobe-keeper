import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { myRoleQueryOptions } from "@/lib/verleih.queries";
import { appUsersQueryOptions } from "@/lib/users.queries";
import { deleteAppUser, inviteUser, setUserAdmin } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/benutzer")({
  head: () => ({
    meta: [
      { title: "Benutzer & Rollen – Kleiderverleih" },
      {
        name: "description",
        content:
          "Benutzerverwaltung mit Rollen: Admins laden neue Benutzer per E-Mail ein und vergeben Adminrechte.",
      },
      { property: "og:title", content: "Benutzer & Rollen – Kleiderverleih" },
      { property: "og:description", content: "Benutzer einladen und Rollen verwalten." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6">Nicht gefunden.</div>,
  component: BenutzerPage,
});

function BenutzerPage() {
  const { data: role } = useSuspenseQuery(myRoleQueryOptions());

  if (!role.isAdmin) {
    return (
      <AppShell title="Benutzer" description="Nur für Administratoren">
        <Card>
          <CardContent className="space-y-2 p-6 text-sm">
            <p className="font-medium">Kein Zugriff</p>
            <p className="text-muted-foreground">
              Die Benutzerverwaltung steht nur Administratoren zur Verfügung. Bitte wende dich an
              eine Person mit Adminrechten.
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }
  return <AdminUserManagement />;
}

function AdminUserManagement() {
  const queryClient = useQueryClient();
  const users = useQuery(appUsersQueryOptions());
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["app-users"] });

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteUser({
        data: {
          email: email.trim(),
          display_name: displayName.trim(),
          is_admin: asAdmin,
          redirect_to: typeof window !== "undefined" ? `${window.location.origin}/auth` : "",
        },
      }),
    onSuccess: () => {
      toast.success("Einladung versendet");
      setOpen(false);
      setEmail("");
      setDisplayName("");
      setAsAdmin(false);
      void invalidate();
    },
    onError: (error: Error) =>
      toast.error("Einladung fehlgeschlagen", { description: error.message }),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { user_id: string; is_admin: boolean }) => setUserAdmin({ data: vars }),
    onSuccess: () => {
      toast.success("Rolle aktualisiert");
      void invalidate();
    },
    onError: (error: Error) => toast.error("Änderung fehlgeschlagen", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (user_id: string) => deleteAppUser({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Benutzer gelöscht");
      void invalidate();
    },
    onError: (error: Error) => toast.error("Löschen fehlgeschlagen", { description: error.message }),
  });

  return (
    <AppShell
      title="Benutzer"
      description="Zugänge und Rollen verwalten"
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <UserPlus className="mr-1 h-4 w-4" /> Einladen
        </Button>
      }
    >
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Konten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.isLoading ? <p className="text-sm text-muted-foreground">Lädt …</p> : null}
            {users.error ? (
              <p className="text-sm text-destructive">{(users.error as Error).message}</p>
            ) : null}
            {(users.data ?? []).map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.display_name || u.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.confirmed
                      ? `Zuletzt aktiv: ${u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "—"}`
                      : "Einladung offen"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.is_admin ? "secondary" : "outline"}>
                    {u.is_admin ? "Admin" : "Benutzer"}
                  </Badge>
                  <Switch
                    aria-label="Adminrechte"
                    checked={u.is_admin}
                    onCheckedChange={(v) => roleMutation.mutate({ user_id: u.id, is_admin: v })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Benutzer löschen"
                    onClick={() => deleteMutation.mutate(u.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {users.data && users.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Benutzer gefunden.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Administrator einrichten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Rollen liegen in der Tabelle <code>user_roles</code> (Rollen: <code>admin</code>,{" "}
              <code>user</code>). Neue Benutzer werden ausschließlich per Einladung durch einen
              Admin angelegt – eine Selbstregistrierung erzeugt keine Rechte.
            </p>
            <p>
              Der <strong>erste Administrator</strong> wird einmalig direkt in der Datenbank
              gesetzt: Konto anlegen bzw. anmelden und anschließend im SQL-Editor des Backends
              ausführen:
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
{`insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'admin@example.com'
on conflict (user_id, role) do nothing;`}
            </pre>
            <p>
              Danach kann dieser Admin alle weiteren Benutzer hier einladen und ihnen über den
              Schalter Adminrechte geben oder entziehen. Die eigenen Adminrechte lassen sich aus
              Sicherheitsgründen nicht selbst entfernen.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer einladen</DialogTitle>
            <DialogDescription>
              Es wird eine Einladung per E-Mail mit Link zur Passwortvergabe versendet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-Mail *</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Anzeigename</Label>
              <Input
                id="invite-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="invite-admin">Als Administrator einladen</Label>
              <Switch id="invite-admin" checked={asAdmin} onCheckedChange={setAsAdmin} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button
              disabled={email.trim() === "" || inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
            >
              <Mail className="mr-1 h-4 w-4" /> Einladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
