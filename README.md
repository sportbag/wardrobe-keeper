# Wardrobe Keeper

Baue mir bitte eine moderne Webanwendung, die ein responsives Design aufweist, mit welcher Kleidungsstücke für den Verleih verwaltet werden können - insbesondere Hosen und Jacken. Es soll einfach möglich sein die Bereitstellung bzw. Rücknahme der Kleidungsstücke an Personen (über eine Liste vorauszuwählen) zu erfassen und so in einer Historie zu erfassen. Über die Historie bzw. die erfassten Daten soll es möglich sein in einer Übersicht festzustellen, wer welches Kleidungsstück aktuell besitzt. Zudem soll in einer weiteren Übersicht feststellbar sein, wann welches Kleidungsstück von wem ausgeliehen war/ist.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/28c83133-db38-485c-90e0-25ddf1b54c31).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Benutzerverwaltung & Administrator einrichten

Zugänge werden unter **Benutzer** verwaltet. Nur Administratoren sehen diese Seite und können
neue Benutzer per E-Mail einladen (`user_roles` mit den Rollen `admin` und `user`).

Den **ersten Administrator** einmalig direkt in der Datenbank setzen:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'admin@example.com'
on conflict (user_id, role) do nothing;
```

Danach lädt dieser Admin alle weiteren Benutzer in der App ein und vergibt bzw. entzieht
Adminrechte über den Rollen-Schalter. Die eigenen Adminrechte können nicht selbst entfernt werden.
