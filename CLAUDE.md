# Personalemappen — læs det her, før du retter noget

Medarbejderens egen side: hendes dokumenter fra kontoret, kvittering, og telefon/nødkontakt. Samme Supabase-projekt og samme login som Worklist.
HR-siden (upload, synlighed, påmindelser) ligger i planlægningsappen under menuen **Personalemappen** (kun HR-administratorer).
Den lange baggrund ligger i `Planning-App/overdragelse/STATUS-2026-10-03.md` (6.10.2026) — et andet repository.

## Regler, der koster tid at lære

- **Appen læser aldrig `employee_hr` eller `employee_dokumenter` direkte.** De er kun for HR-administratorer (`er_hr_admin()`). Alt går gennem
  `mine_dokumenter`, `kvitter_dokument`, `mine_datoer`, `hent_mine_kontaktoplysninger`, `opdater_mine_kontaktoplysninger`. Skal der vises noget nyt,
  laves en ny funktion, der kun giver medarbejderen det, der er hendes OG gjort synligt — ikke en ny læsepolitik.
- **Dokumenter er skjult som standard** (`synlig_for_medarbejder`). En kontrakt indeholder ofte et CPR-nummer.
- **Filer hentes med `createSignedUrl`.** Storage-politikken `medarbejder_dokumenter_laes_eget` tillader kun egne, synlige filer. Fanen åbnes FØR opslaget (`aabnDokument`),
  ellers blokerer iPhone den som pop-up.
- **Byg aldrig uden `.env`** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Mangler de, bygger Vite alligevel og siger grønt. Bundlen er cirka 410 kB. Filen er committet med de offentlige værdier, som i Worklist, så Netlify ikke skal have variabler; en variabel i Netlify vinder over filen.
- Skrift: venstrestillet, linjeafstand mindst 1,5, ingen ord med store bogstaver (ordblinde medarbejdere), 16 px i felter. Som Worklist.
- Skal virke på både Android og iOS (se Worklists CLAUDE.md): sikker zone nederst (`env(safe-area-inset-bottom)`), ingen emoji i knapper.
- Hjælp og privatlivstekst skal opdateres, når funktionalitet ændres. Teksten under «Mig» siger, hvem der kan se hvad.
- Commit-beskeder uden æøå. `git pull --no-rebase origin main` før push, aldrig `--force`.

## Før du melder noget færdigt

    npm run build

## Åbne punkter (6.10.2026)

Ingen service worker og ingen push endnu. Ingen sprogvalg (kun dansk). Nulstilling af adgangskode sker i Worklist. Påmindelser til kontoret
(ikke kvitteret efter N dage, certifikater der udløber) og opbevaringsfrister er ikke bygget.
