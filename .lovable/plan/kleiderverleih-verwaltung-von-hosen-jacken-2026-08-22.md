# Kleiderverleih – Verwaltung von Hosen & Jacken

Eine responsive Web-App auf Deutsch, mit Login, zur Verwaltung von Kleidungsstücken, Personen und Ausleihvorgängen.

## Seiten

1. **Login** (`/auth`) – Anmeldung und Registrierung per E-Mail und Passwort. Alle weiteren Seiten sind nur angemeldet erreichbar.
2. **Dashboard** (`/dashboard`) – Kennzahlen (Bestand gesamt, aktuell verliehen, verfügbar) und Schnellzugriff auf Ausgabe/Rücknahme.
3. **Ausgabe & Rücknahme** (`/verleih`) – Kernfunktion:
  - Ausgabe: Person aus Liste wählen, ein oder mehrere verfügbare Kleidungsstücke wählen, optional Notiz, „Ausgeben".
  - Rücknahme: aktuell verliehene Stücke werden gelistet, mit einem Klick zurücknehmen (Rückgabedatum wird gesetzt).
4. **Kleidungsstücke** (`/kleidung`) – Liste mit Nummer/Kennung, Typ (Hose/Jacke), Größe, Notiz/Zustand, Status (verfügbar/verliehen). Anlegen, Bearbeiten, Löschen. Filter nach Typ/Größe/Status und Suche.
5. **Personen** (`/personen`) – Liste mit Name, optional E-Mail/Telefon/Notiz. Anlegen, Bearbeiten, Deaktivieren.
6. **Übersicht: Wer hat was** (`/uebersicht`) – Alle aktuell ausgegebenen Stücke, gruppiert nach Person, mit Ausgabedatum und Ausleihdauer.
7. **Historie** (`/historie`) – Chronologische Liste aller Vorgänge: Kleidungsstück, Person, Von–Bis, Dauer, Status (laufend/zurückgegeben). Filter nach Person, Kleidungsstück, Typ und Zeitraum.

Navigation: Sidebar auf dem Desktop, Bottom-/Burger-Navigation auf dem Handy. Datums- und Textformate durchgängig deutsch.

## Design

Modernes, klares Utility-Design: ruhige neutrale Flächen, ein kräftiger Akzentfarbton für Aktionen, farbige Status-Badges (verfügbar / verliehen / überfällig), Karten- und Tabellenansichten, die auf dem Handy zu Listenkarten werden. Alle Farben als Design-Tokens.

## Technik

- Lokaler Docker-Container mit authentik-OpenID-Login (Datenbank + Auth).
- Tabellen:
  - `profiles` – Konto-Stammdaten (Anzeigename), automatisch beim Registrieren angelegt.
  - `persons` – Personen (Name, E-Mail, Telefon, Notiz, aktiv).
  - `garments` – Kleidungsstücke (Kennung eindeutig, Typ `hose`/`jacke`, Größe, Notiz, aktiv).
  - `loans` – Ausleihvorgänge (garment_id, person_id, ausgegeben_am, zurück_am nullable, Notiz, erfasst_von).
- Aktueller Besitz = `loans` mit `zurück_am IS NULL`; Datenbank-Constraint verhindert doppelte offene Ausleihe je Kleidungsstück.
- RLS: Zugriff nur für angemeldete Nutzer; alle angemeldeten Nutzer sehen und pflegen den gemeinsamen Bestand. Passende GRANTS je Tabelle.
- Alle Datenzugriffe über TanStack-Start-Serverfunktionen mit Auth-Middleware; Listen über TanStack Query.
- Routen unterhalb des geschützten `_authenticated`-Layouts; `/` zeigt eine schlanke Startseite mit Anmelde-Button bzw. leitet Angemeldete zum Dashboard.
- Startdaten: einige Beispielpersonen und Kleidungsstücke werden per Migration angelegt, damit die App sofort nutzbar aussieht.