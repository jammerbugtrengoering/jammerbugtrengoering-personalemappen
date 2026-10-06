# Personalemappen — læs det her, før du retter noget

Medarbejderens egen side: hendes dokumenter fra kontoret, kvittering, og telefon/nødkontakt. Samme Supabase-projekt og samme login som Worklist.
HR-siden (upload, synlighed, påmindelser) ligger i planlægningsappen under menuen **Personalemappen** (kun HR-administratorer).
Den lange baggrund ligger i `Planning-App/overdragelse/STATUS-2026-10-03.md` (6.10.2026) — et andet repository.

## Regler, der koster tid at lære

- **Appen læser aldrig `employee_hr`, `employee_dokumenter` eller `mus_samtaler` direkte.** De er kun for HR-administratorer (`er_hr_admin()`); `mus_samtaler` har slet ingen direkte adgang, fordi forberedelsen er hendes egen, til hun deler den. Alt går gennem
  `mine_dokumenter`, `kvitter_dokument`, `mine_datoer`, `hent_mine_kontaktoplysninger`, `opdater_mine_kontaktoplysninger`, `anmod_fravaer`, `traek_fravaer`, `mine_fravaer`, `min_mus_samtaler`, `svar_mus_referat`, `gem_mus_forberedelse`, `mine_kompetencer`, `mine_udviklingsoensker`, `tilfoej_udviklingsoenske`, `traek_udviklingsoenske`. Håndbogen læses direkte (`haandbog_dokumenter`, `haandbog_afsnit`; alle medarbejdere må læse).
- **MUS-referatet skrives af lederen i Worklist (`MusSkaerm`, `gem_mus_referat`) og sendes hertil.** Medarbejderen godkender (`svar_mus_referat`) eller skriver en bemærkning, og lederen retter og sender igen. Et godkendt referat er låst i databasen. Referatet vises kun, når status er sendt, bemærkning eller godkendt — en kladde ser hun aldrig (`min_mus_samtaler` skjuler den).
- **MUS-spørgsmålene (`MUS_SPOERGSMAAL`) står også i planlægningsappen.** Svarene gemmes under q1-q5; ændres spørgsmålene, skal begge steder ændres. Skal der vises noget nyt,
  laves en ny funktion, der kun giver medarbejderen det, der er hendes OG gjort synligt — ikke en ny læsepolitik.
- **Dokumenter er skjult som standard** (`synlig_for_medarbejder`). En kontrakt indeholder ofte et CPR-nummer.
- **Filer hentes med `createSignedUrl`.** Storage-politikken `medarbejder_dokumenter_laes_eget` tillader kun egne, synlige filer. Fanen åbnes FØR opslaget (`aabnDokument`),
  ellers blokerer iPhone den som pop-up.
- **Byg aldrig uden `.env`** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Mangler de, bygger Vite alligevel og siger grønt. Bundlen er cirka 410 kB. Filen er committet med de offentlige værdier, som i Worklist, så Netlify ikke skal have variabler; en variabel i Netlify vinder over filen.
- Skrift: venstrestillet, linjeafstand mindst 1,5, ingen ord med store bogstaver (ordblinde medarbejdere), 16 px i felter. Som Worklist.
- **Bred skærm (≥ 900 px, computer):** menu til venstre og indhold i to kolonner (forside, udvikling) eller én (resten), som mockuppen af HR-siden. På telefonen er det bundmenuen. Begge layouts bruger de samme sider; `useBred()` i `src/App.jsx` vælger.
- Skal virke på både Android og iOS (se Worklists CLAUDE.md): sikker zone nederst (`env(safe-area-inset-bottom)`), ingen emoji i knapper.
- Hjælp og privatlivstekst skal opdateres, når funktionalitet ændres. Teksten under «Mig» siger, hvem der kan se hvad.
- Commit-beskeder uden æøå. `git pull --no-rebase origin main` før push, aldrig `--force`.

## Før du melder noget færdigt

    npm run build

## Åbne punkter (6.10.2026)

Ingen service worker og ingen push endnu. Ingen sprogvalg (kun dansk). Nulstilling af adgangskode sker i Worklist. Påmindelser til kontoret
og opbevaringsfrister er ikke bygget. Push-besked til medarbejderen, når en ferieanmodning er afgjort, er ikke bygget (svaret står i appen).
