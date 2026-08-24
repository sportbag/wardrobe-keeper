import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, History, Shirt, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kleiderverleih – Hosen & Jacken verwalten" },
      {
        name: "description",
        content:
          "Kleidungsstücke ausgeben, zurücknehmen und nachvollziehen, wer aktuell welche Hose oder Jacke besitzt.",
      },
      { property: "og:title", content: "Kleiderverleih – Hosen & Jacken verwalten" },
      {
        property: "og:description",
        content:
          "Ausgabe, Rücknahme und vollständige Historie für den Kleiderverleih – übersichtlich und mobil nutzbar.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) navigate({ to: "/dashboard", replace: true });
      else setChecked(true);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col justify-center px-5 py-20">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Shirt className="h-6 w-6" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Kleiderverleih für Hosen &amp; Jacken
        </h1>
        <p className="mt-3 text-muted-foreground">
          Ausgabe und Rücknahme in Sekunden erfassen, jederzeit sehen wer welches Kleidungsstück
          besitzt und die komplette Ausleih-Historie nachvollziehen.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Shirt, title: "Bestand", text: "Hosen und Jacken mit Kennung, Größe, Zustand." },
            { icon: Users, title: "Personen", text: "Ausleiher pflegen und schnell auswählen." },
            { icon: History, title: "Historie", text: "Von–Bis, Dauer und Status je Vorgang." },
          ].map((f) => (
            <li key={f.title} className="rounded-lg border border-border bg-card p-4">
              <f.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 text-sm font-medium">{f.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Button asChild size="lg" disabled={!checked}>
            <Link to="/auth">
              Anmelden
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
