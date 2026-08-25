import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileDown, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeBoolean, normalizeDate, parseCsv } from "@/lib/csv";
import { importPersons } from "@/lib/verleih.functions";
import { personInputSchema } from "@/lib/verleih.schemas";

type ParsedRow = Omit<ReturnType<typeof personInputSchema.parse>, "id">;

const TEMPLATE_HEADER =
  "name;email;telefon;geburtsdatum;erziehungsberechtigter;mitgliedschaft_von;mitgliedschaft_bis;notiz;aktiv";
const TEMPLATE =
  `${TEMPLATE_HEADER}\n` +
  "Erika Musterfrau;erika@example.com;0151 1234567;12.03.2011;Peter Musterfrau;01.01.2024;31.12.2026;Jugendgruppe;ja\n";

const FIELD_ALIASES: Record<string, string[]> = {
  full_name: ["name", "full_name", "vollständiger name", "person"],
  email: ["email", "e-mail", "mail"],
  phone: ["telefon", "phone", "tel", "handy"],
  birth_date: ["geburtsdatum", "birth_date", "geburtstag"],
  guardian_name: ["erziehungsberechtigter", "guardian_name", "erziehungsberechtigte"],
  membership_start: ["mitgliedschaft_von", "mitgliedschaft von", "membership_start", "eintritt"],
  membership_end: ["mitgliedschaft_bis", "mitgliedschaft bis", "membership_end", "austritt"],
  note: ["notiz", "note", "bemerkung"],
  is_active: ["aktiv", "is_active", "active"],
};

function pick(row: Record<string, string>, field: keyof typeof FIELD_ALIASES): string {
  for (const alias of FIELD_ALIASES[field]!) {
    const value = row[alias];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

export function PersonCsvImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setProblems([]);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    const accepted: ParsedRow[] = [];
    const issues: string[] = [];

    parsed.forEach((raw, index) => {
      const line = index + 2;
      const candidate = {
        full_name: pick(raw, "full_name"),
        email: pick(raw, "email"),
        phone: pick(raw, "phone"),
        note: pick(raw, "note"),
        birth_date: normalizeDate(pick(raw, "birth_date")),
        guardian_name: pick(raw, "guardian_name"),
        membership_start: normalizeDate(pick(raw, "membership_start")),
        membership_end: normalizeDate(pick(raw, "membership_end")),
        is_active: normalizeBoolean(pick(raw, "is_active")),
      };
      const result = personInputSchema.omit({ id: true }).safeParse(candidate);
      if (result.success) {
        accepted.push(result.data);
      } else {
        issues.push(`Zeile ${line}: ${result.error.issues[0]?.message ?? "Ungültige Daten"}`);
      }
    });

    setFileName(file.name);
    setRows(accepted);
    setProblems(issues);
    if (accepted.length === 0) {
      toast.error("Keine gültigen Zeilen gefunden", {
        description: "Bitte Spaltennamen und Pflichtfeld „name“ prüfen.",
      });
    }
  };

  const importMutation = useMutation({
    mutationFn: () => importPersons({ data: { rows } }),
    onSuccess: (result) => {
      toast.success(`${result.inserted} Personen importiert`, {
        description:
          result.skipped.length > 0
            ? `Übersprungen (Name existiert bereits): ${result.skipped.join(", ")}`
            : undefined,
      });
      setOpen(false);
      reset();
      onImported();
    },
    onError: (error: Error) => toast.error("Import fehlgeschlagen", { description: error.message }),
  });

  const downloadTemplate = () => {
    const blob = new Blob([`\uFEFF${TEMPLATE}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "personen-vorlage.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="mr-1 h-4 w-4" /> CSV-Import
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personen per CSV importieren</DialogTitle>
          <DialogDescription>
            Eine CSV-Datei mit Kopfzeile auswählen. Bestehende Personen mit gleichem Namen werden
            übersprungen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="font-medium">So muss die CSV aufgebaut sein</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Erste Zeile = Kopfzeile mit den Spaltennamen (Reihenfolge beliebig).</li>
              <li>
                Trennzeichen: Semikolon <code>;</code> oder Komma <code>,</code>. Werte mit
                Trennzeichen in doppelte Anführungszeichen setzen.
              </li>
              <li>Kodierung: UTF-8. Eine Zeile pro Person.</li>
              <li>
                Pflichtspalte: <code>name</code>. Alle anderen Spalten sind optional und dürfen leer
                bleiben oder ganz fehlen.
              </li>
              <li>
                Optionale Spalten: <code>email</code>, <code>telefon</code>,{" "}
                <code>geburtsdatum</code>, <code>erziehungsberechtigter</code>,{" "}
                <code>mitgliedschaft_von</code>, <code>mitgliedschaft_bis</code>, <code>notiz</code>
                , <code>aktiv</code>.
              </li>
              <li>
                Datumsformat: <code>TT.MM.JJJJ</code> oder <code>JJJJ-MM-TT</code>.
              </li>
              <li>
                <code>aktiv</code>: <code>ja</code>/<code>nein</code> (leer = aktiv).
              </li>
              <li>Maximal 500 Zeilen pro Import.</li>
            </ul>
            <pre className="mt-3 overflow-x-auto rounded bg-background p-2 text-[11px] leading-relaxed">
              {TEMPLATE}
            </pre>
            <Button size="sm" variant="ghost" className="mt-2" onClick={downloadTemplate}>
              <FileDown className="mr-1 h-4 w-4" /> Vorlage herunterladen
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV-Datei auswählen"
            className="block w-full cursor-pointer rounded-lg border border-border p-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {fileName ? (
            <p className="text-xs text-muted-foreground">
              {fileName}: {rows.length} gültige Zeile(n)
              {problems.length > 0 ? `, ${problems.length} fehlerhaft` : ""}
            </p>
          ) : null}

          {problems.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-destructive/40 p-3 text-xs text-destructive">
              {problems.slice(0, 8).map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
              {problems.length > 8 ? <li>… weitere {problems.length - 8} Fehler</li> : null}
            </ul>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button
            disabled={rows.length === 0 || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {rows.length > 0 ? `${rows.length} Personen importieren` : "Importieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
