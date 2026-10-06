import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Personalemappen: medarbejderens egen side. Samme login som Worklist.
//
// Alt, hun ser, kommer gennem databasefunktioner, der kun giver hende det, der er hendes OG gjort synligt af HR:
//   mine_dokumenter, kvitter_dokument, mine_datoer, hent_mine_kontaktoplysninger, opdater_mine_kontaktoplysninger.
// Appen læser aldrig employee_hr eller employee_dokumenter direkte — de er kun for HR-administratorer.
//
// Skriften følger Worklist: venstrestillet, linjeafstand mindst 1,5, ingen ord med store bogstaver (ordblinde medarbejdere),
// og 16 px i felter, ellers zoomer iPhone ind på dem.

const DOK_BUCKET = "medarbejder-dokumenter";
// Medarbejderens opgave-app (eget Netlify-site). Linket står under «Mere».
const WORKLIST_URL = import.meta.env.VITE_WORKLIST_URL || "https://jammerbugtrengoering-service.netlify.app/";
const FARVE = "#D6247A";
const FARVE_LYS = "#FCE7F1";
const FARVE_MOERK = "#A81A5F";
const PAPIR = "#FFF7FA";
const RAMME = "#EADCE3";
const TEKST = "#1F2433";
const DAEMPET = "#667085";

const KATEGORIER = {
  kontrakt: "Ansættelse", samtale: "Samtaler", certifikat: "Beviser og certifikater", andet: "Andet",
};
// Spørgsmålene til MUS-forberedelsen. Svarene gemmes under q1-q5, og HR læser dem under de samme nøgler i planlægningsappen (MUS_SPOERGSMAAL dér):
// ændres spørgsmålene, skal begge steder ændres, og nøglerne må ikke flyttes.
const MUS_SPOERGSMAAL = [
  ["q1", "Hvordan har du det med dit arbejde lige nu?"],
  ["q2", "Hvad er gået godt det seneste år?"],
  ["q3", "Hvad kunne gøre dit arbejde bedre eller nemmere?"],
  ["q4", "Hvad vil du gerne blive bedre til eller lære?"],
  ["q5", "Er der noget andet, du gerne vil tale om?"],
];
const OENSKE_STATUS = { oensket: ["Sendt", DAEMPET], aftalt: ["Aftalt", "#1B7A46"], gennemfoert: ["Gennemført", "#1B7A46"], afvist: ["Ikke muligt", "#B91C1C"] };
const FRAVAER_STATUS = { afventer: ["Venter på svar", "#B45309"], godkendt: ["Godkendt", "#1B7A46"], afvist: ["Afvist", "#B91C1C"], trukket: ["Trukket tilbage", DAEMPET] };
const langDato = (d) => (d ? new Date(d).toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" }) : "");
const KATEGORI_REKKEFOELGE = ["kontrakt", "samtale", "certifikat", "andet"];

const dato = (d) => (d ? new Date(d).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" }) : "");
const kortDato = (d) => (d ? new Date(d).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" }) : "");
const idagIso = () => new Date().toISOString().slice(0, 10);

const s = {
  side: { minHeight: "100dvh", background: PAPIR, color: TEKST, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          fontSize: 17, lineHeight: 1.55, textAlign: "left", display: "flex", flexDirection: "column", maxWidth: 560, margin: "0 auto" },
  indhold: { flex: 1, padding: "20px 20px 100px", display: "flex", flexDirection: "column", gap: 14 },
  kort: { background: "#fff", border: `1px solid ${RAMME}`, borderRadius: 16, padding: 16 },
  h1: { fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.25 },
  h2: { fontSize: 16, fontWeight: 700, margin: 0 },
  dempet: { fontSize: 14.5, color: DAEMPET, lineHeight: 1.5 },
  knap: { minHeight: 48, padding: "0 18px", border: "none", borderRadius: 12, background: FARVE, color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "inherit", cursor: "pointer" },
  knapLys: { minHeight: 48, padding: "0 18px", border: `1px solid ${RAMME}`, borderRadius: 12, background: "#fff", color: TEKST, fontWeight: 700, fontSize: 16, fontFamily: "inherit", cursor: "pointer" },
  felt: { width: "100%", boxSizing: "border-box", minHeight: 48, border: "1px solid #D0C3CA", borderRadius: 10, padding: "0 12px", fontSize: 16, fontFamily: "inherit", color: TEKST, background: "#fff" },
  label: { display: "block", fontSize: 14.5, color: DAEMPET, margin: "10px 0 4px" },
  fejl: { color: "#B91C1C", fontSize: 14.5, margin: "8px 0" },
};

function Ikon({ navn, farve = DAEMPET, stoerrelse = 24 }) {
  const stier = {
    hjem: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    mappe: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    person: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    fil: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
    bog: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5M8 7h7M8 11h7" /></>,
    kalender: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    flueben: <path d="M5 12l5 5 9-10" />,
    sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    traeplante: <path d="M12 21V9M12 9c0-3 2-5 5-5 0 3-2 5-5 5zM12 13c0-2.5-1.8-4.5-5-4.5 0 2.5 1.8 4.5 5 4.5z" />,
    mere: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
  };
  return (
    <svg width={stoerrelse} height={stoerrelse} viewBox="0 0 24 24" fill="none" stroke={farve} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {stier[navn]}
    </svg>
  );
}

// ── Login ───────────────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState("");
  const [kode, setKode] = useState("");
  const [fejl, setFejl] = useState("");
  const [arbejder, setArbejder] = useState(false);

  async function log(ev) {
    ev.preventDefault();
    setArbejder(true); setFejl("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: kode });
    setArbejder(false);
    if (error) setFejl("Mailen eller adgangskoden passer ikke.");
  }

  return (
    <div style={s.side}>
      <form onSubmit={log} style={{ ...s.indhold, justifyContent: "center", paddingBottom: 40 }}>
        <h1 style={s.h1}>Personalemappen</h1>
        <div style={s.dempet}>Dine dokumenter og oplysninger hos Jammerbugt Rengøring. Du logger ind med det samme som i Worklist.</div>
        <div style={s.kort}>
          <label htmlFor="mail" style={{ ...s.label, marginTop: 0 }}>E-mail</label>
          <input id="mail" type="email" autoComplete="username" style={s.felt} value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="kode" style={s.label}>Adgangskode</label>
          <input id="kode" type="password" autoComplete="current-password" style={s.felt} value={kode} onChange={(e) => setKode(e.target.value)} />
          {fejl && <div style={s.fejl}>{fejl}</div>}
          <button type="submit" disabled={arbejder || !email || !kode} style={{ ...s.knap, width: "100%", marginTop: 14, opacity: arbejder || !email || !kode ? 0.6 : 1 }}>
            {arbejder ? "Logger ind…" : "Log ind"}
          </button>
        </div>
        <div style={s.dempet}>Har du glemt adgangskoden, så nulstil den i Worklist. Den gælder begge steder.</div>
      </form>
    </div>
  );
}

// ── Dokumenter ──────────────────────────────────────────────────────────────
function useDokumenter() {
  const [dokumenter, setDokumenter] = useState(null);
  const [fejl, setFejl] = useState("");
  const hent = useCallback(async () => {
    const { data, error } = await supabase.rpc("mine_dokumenter");
    if (error) { setFejl("Dokumenterne kunne ikke hentes: " + error.message); setDokumenter([]); return; }
    setFejl("");
    setDokumenter(data || []);
  }, []);
  useEffect(() => { hent(); }, [hent]);
  return { dokumenter, fejl, hent, setDokumenter };
}

// Filen åbnes i en ny fane. Fanen åbnes FØR det asynkrone opslag, ellers blokerer iPhone den som en pop-up.
async function aabnDokument(d, sætFejl) {
  const fane = window.open("", "_blank");
  const { data, error } = await supabase.storage.from(DOK_BUCKET).createSignedUrl(d.sti, 300);
  if (error || !data?.signedUrl) {
    if (fane) fane.close();
    sætFejl("Filen kunne ikke åbnes. Prøv igen om lidt.");
    return;
  }
  if (fane) fane.location.href = data.signedUrl; else window.location.href = data.signedUrl;
}

function DokumentRække({ d, onKvitter, onFejl }) {
  const [arbejder, setArbejder] = useState(false);
  const venter = d.kvittering_kraeves && !d.kvitteret_tid;
  const udloeber = d.gyldig_til && d.gyldig_til >= idagIso() && d.gyldig_til <= new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  const udloebet = d.gyldig_til && d.gyldig_til < idagIso();

  async function kvitter() {
    setArbejder(true);
    const { data, error } = await supabase.rpc("kvitter_dokument", { p_id: d.id });
    setArbejder(false);
    if (error) { onFejl("Kvitteringen kunne ikke gemmes: " + error.message); return; }
    onKvitter(d.id, data);
  }

  return (
    <div style={{ ...s.kort, borderColor: venter ? "#F3C2DA" : RAMME }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: venter ? FARVE_LYS : "#F4EEF1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ikon navn="fil" farve={venter ? FARVE_MOERK : DAEMPET} stoerrelse={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, wordBreak: "break-word" }}>{d.titel}</div>
          <div style={s.dempet}>Lagt ind {kortDato(d.uploadet_at)}</div>
          {d.gyldig_til && (
            <div style={{ ...s.dempet, color: udloebet ? "#B91C1C" : udloeber ? "#B45309" : DAEMPET, fontWeight: udloebet || udloeber ? 700 : 400 }}>
              {udloebet ? "Udløbet " : udloeber ? "Udløber " : "Gyldigt til "}{dato(d.gyldig_til)}
            </div>
          )}
          {d.kvittering_kraeves && d.kvitteret_tid && (
            <div style={{ ...s.dempet, color: "#1B7A46", fontWeight: 700 }}>Kvitteret {kortDato(d.kvitteret_tid)}</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" style={{ ...s.knapLys, flex: 1 }} onClick={() => aabnDokument(d, onFejl)}>Åbn</button>
        {venter && (
          <button type="button" style={{ ...s.knap, flex: 1, opacity: arbejder ? 0.6 : 1 }} disabled={arbejder} onClick={kvitter}>
            {arbejder ? "Gemmer…" : "Jeg har læst det"}
          </button>
        )}
      </div>
    </div>
  );
}

function DokumenterSide({ dok }) {
  const [fejl, setFejl] = useState("");
  const { dokumenter, setDokumenter } = dok;
  const kvitteret = (id, tid) => setDokumenter((prev) => prev.map((d) => (d.id === id ? { ...d, kvitteret_tid: tid } : d)));
  const venter = (dokumenter || []).filter((d) => d.kvittering_kraeves && !d.kvitteret_tid);
  const resten = (dokumenter || []).filter((d) => !venter.includes(d));

  return (
    <>
      <div><h1 style={s.h1}>Dokumenter</h1>
        <div style={s.dempet}>Kun du og kontoret kan se dem. Tryk «Åbn» for at læse eller hente et dokument.</div></div>
      {(fejl || dok.fejl) && <div style={s.fejl}>{fejl || dok.fejl}</div>}
      {dokumenter === null && <div style={s.dempet}>Henter…</div>}
      {dokumenter && dokumenter.length === 0 && !dok.fejl && (
        <div style={s.kort}><div style={s.dempet}>Der ligger ingen dokumenter til dig endnu. Når kontoret lægger noget ind, står det her.</div></div>
      )}
      {venter.length > 0 && (<>
        <div style={{ ...s.h2, color: FARVE_MOERK }}>Skal kvitteres</div>
        {venter.map((d) => <DokumentRække key={d.id} d={d} onKvitter={kvitteret} onFejl={setFejl} />)}
      </>)}
      {KATEGORI_REKKEFOELGE.map((k) => {
        const liste = resten.filter((d) => (KATEGORIER[d.kategori] ? d.kategori : "andet") === k);
        if (liste.length === 0) return null;
        return (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...s.h2, color: DAEMPET }}>{KATEGORIER[k]}</div>
            {liste.map((d) => <DokumentRække key={d.id} d={d} onKvitter={kvitteret} onFejl={setFejl} />)}
          </div>
        );
      })}
    </>
  );
}

// ── Forside ─────────────────────────────────────────────────────────────────
function Forside({ navn, dok, datoer, gaaTil }) {
  const fornavn = (navn || "").split(" ")[0];
  const venter = (dok.dokumenter || []).filter((d) => d.kvittering_kraeves && !d.kvitteret_tid);
  const snart = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
  const naeste = [];
  if (datoer?.mus_naeste && datoer.mus_naeste >= idagIso()) naeste.push({ tekst: "Medarbejdersamtale (MUS)", dato: datoer.mus_naeste, advarsel: false });
  (dok.dokumenter || []).filter((d) => d.gyldig_til && d.gyldig_til <= snart)
    .forEach((d) => naeste.push({ tekst: `${d.titel} ${d.gyldig_til < idagIso() ? "er udløbet" : "udløber"}`, dato: d.gyldig_til, advarsel: true }));
  naeste.sort((a, b) => a.dato.localeCompare(b.dato));

  return (
    <>
      <div><h1 style={s.h1}>Hej {fornavn}</h1>
        <div style={s.dempet}>Her ligger dine dokumenter og oplysninger hos Jammerbugt Rengøring.</div></div>

      <div style={s.kort}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={s.h2}>Venter på dig</div>
          {venter.length > 0 && <div style={{ background: FARVE_LYS, color: FARVE_MOERK, fontWeight: 700, fontSize: 13.5, borderRadius: 999, padding: "2px 10px" }}>{venter.length} {venter.length === 1 ? "ny" : "nye"}</div>}
        </div>
        {venter.length === 0
          ? <div style={{ ...s.dempet, marginTop: 8 }}>Der er ikke noget, du skal kvittere for.</div>
          : venter.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${RAMME}`, marginTop: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, wordBreak: "break-word" }}>{d.titel}</div><div style={s.dempet}>Lagt ind {kortDato(d.uploadet_at)}</div></div>
              <button type="button" style={s.knap} onClick={() => gaaTil("dokumenter")}>Åbn</button>
            </div>
          ))}
      </div>

      {naeste.length > 0 && (
        <div style={s.kort}>
          <div style={{ ...s.h2, marginBottom: 6 }}>Dine næste datoer</div>
          {naeste.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: `1px solid ${RAMME}` }}>
              <Ikon navn="kalender" farve={n.advarsel ? "#B45309" : DAEMPET} stoerrelse={22} />
              <div><div style={{ fontWeight: 600 }}>{n.tekst}</div><div style={{ ...s.dempet, color: n.advarsel ? "#B45309" : DAEMPET }}>{dato(n.dato)}</div></div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...s.kort, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: 1 }}><div style={s.h2}>Ferie og fri</div><div style={s.dempet}>Send en anmodning, og se svaret fra kontoret.</div></div>
        <button type="button" style={s.knapLys} onClick={() => gaaTil("ferie")}>Åbn</button>
      </div>

      <div style={{ ...s.kort, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: 1 }}><div style={s.h2}>Ret telefon og nødkontakt</div><div style={s.dempet}>Er dine oplysninger ikke rigtige, kan du selv rette dem.</div></div>
        <button type="button" style={s.knapLys} onClick={() => gaaTil("mig")}>Ret</button>
      </div>
    </>
  );
}

// ── Mig ─────────────────────────────────────────────────────────────────────
function Mig({ navn, datoer, onLogUd }) {
  const [henter, setHenter] = useState(true);
  const [gemmer, setGemmer] = useState(false);
  const [gemt, setGemt] = useState(false);
  const [fejl, setFejl] = useState("");
  const [f, setF] = useState({ telefon: "", nodNavn: "", nodRelation: "", nodTelefon: "" });
  const saet = (k) => (e) => { setGemt(false); setF((x) => ({ ...x, [k]: e.target.value })); };

  useEffect(() => {
    let afbrudt = false;
    (async () => {
      const { data, error } = await supabase.rpc("hent_mine_kontaktoplysninger");
      if (afbrudt) return;
      if (error) setFejl(error.message);
      const r = Array.isArray(data) ? data[0] : data;
      if (r) setF({ telefon: r.telefon || "", nodNavn: r.nodkontakt_navn || "", nodRelation: r.nodkontakt_relation || "", nodTelefon: r.nodkontakt_telefon || "" });
      setHenter(false);
    })();
    return () => { afbrudt = true; };
  }, []);

  async function gem() {
    setGemmer(true); setFejl(""); setGemt(false);
    const { error } = await supabase.rpc("opdater_mine_kontaktoplysninger", {
      p_telefon: f.telefon, p_nod_navn: f.nodNavn, p_nod_relation: f.nodRelation, p_nod_telefon: f.nodTelefon,
    });
    setGemmer(false);
    if (error) { setFejl(error.message); return; }
    setGemt(true);
  }

  return (
    <>
      <div><h1 style={s.h1}>Mig</h1><div style={s.dempet}>{navn}</div></div>
      {henter ? <div style={s.dempet}>Henter…</div> : (<>
        <div style={s.kort}>
          <div style={s.h2}>Dine kontaktoplysninger</div>
          <label htmlFor="tlf" style={s.label}>Telefon</label>
          <input id="tlf" type="tel" inputMode="tel" style={s.felt} value={f.telefon} onChange={saet("telefon")} />
        </div>
        <div style={s.kort}>
          <div style={s.h2}>Nødkontakt</div>
          <div style={s.dempet}>Den, vi ringer til, hvis der sker dig noget på arbejde.</div>
          <label htmlFor="nn" style={s.label}>Navn</label>
          <input id="nn" style={s.felt} value={f.nodNavn} onChange={saet("nodNavn")} />
          <label htmlFor="nr" style={s.label}>Relation</label>
          <input id="nr" style={s.felt} value={f.nodRelation} onChange={saet("nodRelation")} placeholder="Fx ægtefælle" />
          <label htmlFor="nt" style={s.label}>Telefon</label>
          <input id="nt" type="tel" inputMode="tel" style={s.felt} value={f.nodTelefon} onChange={saet("nodTelefon")} />
        </div>
        {fejl && <div style={s.fejl}>{fejl}</div>}
        {gemt && <div style={{ color: "#1B7A46", fontWeight: 700 }}>Gemt</div>}
        <button type="button" style={{ ...s.knap, minHeight: 52, opacity: gemmer ? 0.6 : 1 }} disabled={gemmer} onClick={gem}>{gemmer ? "Gemmer…" : "Gem ændringer"}</button>
      </>)}

      <div style={s.kort}>
        <div style={{ ...s.h2, marginBottom: 6 }}>Det, kontoret retter</div>
        <div style={s.dempet}>Ansættelsesdato, stilling og løn kan kun kontoret ændre. Er noget forkert, så ring eller skriv til os.</div>
        {datoer?.ansat_fra && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${RAMME}` }}>
            <span style={{ color: DAEMPET }}>Ansat siden</span><span style={{ fontWeight: 600 }}>{dato(datoer.ansat_fra)}</span>
          </div>
        )}
      </div>

      <div style={s.kort}>
        <div style={{ ...s.h2, marginBottom: 6 }}>Sådan behandler vi dine oplysninger</div>
        <div style={s.dempet}>
          Dokumenterne i din personalemappe kan kun ses af dig og af de få personer på kontoret, der har adgang til personalemapperne. Du kan se, hvornår du
          har kvitteret for et dokument. Dine ændringer af telefon og nødkontakt gemmes hos os, og kontoret kan se dem. Nødkontakten bruges kun, hvis der sker dig noget.
          Dine anmodninger om ferie og fri kan kontoret se. Det, du skriver til din MUS, kan kun du se, til du trykker «Del med kontoret». Dine ønsker om kurser
          og udvikling kan kontoret se.
        </div>
      </div>

      <button type="button" style={s.knapLys} onClick={onLogUd}>Log ud</button>
    </>
  );
}

// ── Håndbog ─────────────────────────────────────────────────────────────────
// Personalehåndbogen og politikkerne står i databasen (haandbog_dokumenter / haandbog_afsnit), og HR retter dem i planlægningsappen. Alle medarbejdere kan læse.
// Teksten vises, som den er skrevet: linjeskift bevares (white-space: pre-line), og intet tolkes som HTML.
function HaandbogSide() {
  const [dokumenter, setDokumenter] = useState(null);
  const [aaben, setAaben] = useState(null);
  const [fejl, setFejl] = useState("");

  useEffect(() => {
    let afbrudt = false;
    (async () => {
      const [{ data: d, error: e1 }, { data: a, error: e2 }] = await Promise.all([
        supabase.from("haandbog_dokumenter").select("*").order("raekkefoelge"),
        supabase.from("haandbog_afsnit").select("*").order("raekkefoelge"),
      ]);
      if (afbrudt) return;
      if (e1 || e2) { setFejl("Håndbogen kunne ikke hentes: " + (e1 || e2).message); setDokumenter([]); return; }
      const liste = (d || []).map((x) => ({ ...x, afsnit: (a || []).filter((y) => y.dokument_id === x.id) }));
      setDokumenter(liste);
      if (liste.length === 1) setAaben(liste[0].id);
    })();
    return () => { afbrudt = true; };
  }, []);

  return (
    <>
      <div><h1 style={s.h1}>Håndbog</h1>
        <div style={s.dempet}>Det, vi har aftalt hos Jammerbugt Rengøring. Tryk på et dokument for at læse det.</div></div>
      {fejl && <div style={s.fejl}>{fejl}</div>}
      {dokumenter === null && <div style={s.dempet}>Henter…</div>}
      {(dokumenter || []).map((dok) => {
        const er = aaben === dok.id;
        return (
          <div key={dok.id} style={s.kort}>
            <button type="button" onClick={() => setAaben(er ? null : dok.id)} aria-expanded={er}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 48, border: "none", background: "transparent", padding: 0, textAlign: "left", fontFamily: "inherit", color: TEKST, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: FARVE_LYS, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ikon navn="bog" farve={FARVE_MOERK} stoerrelse={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{dok.titel}</div>
                <div style={s.dempet}>Sidst rettet {kortDato(dok.opdateret)}</div>
              </div>
              <span style={{ color: DAEMPET, fontSize: 22, fontWeight: 700 }} aria-hidden="true">{er ? "−" : "+"}</span>
            </button>
            {er && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
                {dok.afsnit.map((a) => (
                  <div key={a.id}>
                    {a.overskrift && <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.overskrift}</div>}
                    <div style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{a.tekst}</div>
                  </div>
                ))}
                {dok.underskrift && <div style={{ ...s.dempet, borderTop: `1px solid ${RAMME}`, paddingTop: 10 }}>{dok.underskrift}</div>}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── Ferie og fri ────────────────────────────────────────────────────────────
// Medarbejderen anmoder, kontoret godkender i planlægningsappen, og svaret står her. Håndbogen siger: ferie mindst 4 uger før, fri mindst 10 dage før.
// Kort varsel afvises ikke af appen eller databasen; anmodningen flagges for kontoret, som afgør det. Sygdom er ikke en anmodning og meldes på telefonen.
function FerieSide() {
  const [liste, setListe] = useState(null);
  const [art, setArt] = useState("ferie");
  const [fra, setFra] = useState("");
  const [til, setTil] = useState("");
  const [note, setNote] = useState("");
  const [fejl, setFejl] = useState("");
  const [sender, setSender] = useState(false);
  const [sendt, setSendt] = useState(false);

  const hent = useCallback(async () => {
    const { data, error } = await supabase.rpc("mine_fravaer");
    if (error) { setFejl("Dine anmodninger kunne ikke hentes: " + error.message); setListe([]); return; }
    setListe(data || []);
  }, []);
  useEffect(() => { hent(); }, [hent]);

  const tilEff = art === "fridag" && !til ? fra : til;
  const grænse = art === "ferie" ? 28 : 10;
  const kortVarsel = fra && fra < new Date(Date.now() + grænse * 864e5).toISOString().slice(0, 10);
  const gyldig = fra && tilEff && tilEff >= fra && fra >= idagIso();

  async function send() {
    setSender(true); setFejl(""); setSendt(false);
    const { error } = await supabase.rpc("anmod_fravaer", { p_art: art, p_fra: fra, p_til: tilEff, p_note: note || null });
    setSender(false);
    if (error) { setFejl(error.message); return; }
    setFra(""); setTil(""); setNote(""); setSendt(true);
    hent();
  }
  async function traek(id) {
    if (!window.confirm("Træk anmodningen tilbage?")) return;
    const { error } = await supabase.rpc("traek_fravaer", { p_id: id });
    if (error) { setFejl(error.message); return; }
    hent();
  }
  const periode = (r) => (r.fra_dato === r.til_dato ? langDato(r.fra_dato) : `${langDato(r.fra_dato)} til ${langDato(r.til_dato)}`);

  return (
    <>
      <div><h1 style={s.h1}>Ferie og fri</h1>
        <div style={s.dempet}>Send en anmodning til kontoret, og se svaret her. Sygdom meldes som hidtil på telefonen.</div></div>

      <div style={s.kort}>
        <div style={s.h2}>Ny anmodning</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[["ferie", "Ferie"], ["fridag", "Fri"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setArt(k); setSendt(false); }} aria-pressed={art === k}
              style={{ ...s.knapLys, flex: 1, borderColor: art === k ? FARVE : RAMME, color: art === k ? FARVE_MOERK : TEKST, background: art === k ? FARVE_LYS : "#fff" }}>{l}</button>
          ))}
        </div>
        <label htmlFor="fra" style={s.label}>{art === "ferie" ? "Første feriedag" : "Dagen"}</label>
        <input id="fra" type="date" min={idagIso()} style={s.felt} value={fra} onChange={(e) => { setFra(e.target.value); setSendt(false); }} />
        <label htmlFor="til" style={s.label}>{art === "ferie" ? "Sidste feriedag" : "Til og med (hvis flere dage)"}</label>
        <input id="til" type="date" min={fra || idagIso()} style={s.felt} value={til} onChange={(e) => setTil(e.target.value)} />
        <label htmlFor="note" style={s.label}>Bemærkning (valgfri)</label>
        <textarea id="note" rows={2} style={{ ...s.felt, minHeight: 64, padding: 10, lineHeight: 1.5 }} value={note} onChange={(e) => setNote(e.target.value)} />
        <div style={s.dempet}>Skriv ikke noget om helbred.</div>
        {kortVarsel && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "#FEF3C7", color: "#92400E", fontSize: 14.5, lineHeight: 1.5 }}>
            Det er kort varsel. Aftalen er mindst {art === "ferie" ? "4 uger" : "10 dage"} før. Du kan stadig sende, og kontoret afgør, om det kan lade sig gøre.
          </div>
        )}
        {fejl && <div style={s.fejl}>{fejl}</div>}
        {sendt && <div style={{ color: "#1B7A46", fontWeight: 700, marginTop: 10 }}>Anmodningen er sendt til kontoret.</div>}
        <button type="button" disabled={!gyldig || sender} onClick={send}
          style={{ ...s.knap, width: "100%", marginTop: 12, opacity: !gyldig || sender ? 0.5 : 1 }}>{sender ? "Sender…" : "Send anmodning"}</button>
      </div>

      <div style={{ ...s.h2, color: DAEMPET }}>Dine anmodninger</div>
      {liste === null && <div style={s.dempet}>Henter…</div>}
      {liste && liste.length === 0 && <div style={s.dempet}>Du har ikke sendt nogen anmodninger endnu.</div>}
      {(liste || []).map((r) => {
        const [tekst, farve] = FRAVAER_STATUS[r.status] || [r.status, DAEMPET];
        return (
          <div key={r.id} style={s.kort}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 600 }}>{r.art === "ferie" ? "Ferie" : "Fri"}</div>
              <div style={{ fontWeight: 700, color: farve }}>{tekst}</div>
            </div>
            <div>{periode(r)}</div>
            {r.afgoerelse_note && <div style={{ ...s.dempet, marginTop: 4 }}>Kontoret: {r.afgoerelse_note}</div>}
            {r.status === "afventer" && (
              <button type="button" style={{ ...s.knapLys, marginTop: 10 }} onClick={() => traek(r.id)}>Træk tilbage</button>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── Udvikling: MUS, kompetencer og ønsker ───────────────────────────────────
// Forberedelsen til MUS er hendes egen. Kontoret kan først læse den, når hun trykker «Del med kontoret» (databasen skjuler den, til forberedelse_delt er sat).
function MusKort({ m, onGemt }) {
  const [svar, setSvar] = useState(m.forberedelse || {});
  const [arbejder, setArbejder] = useState("");
  const [fejl, setFejl] = useState("");
  const [besked, setBesked] = useState("");
  const planlagt = m.status === "planlagt";
  const saet = (k) => (e) => { setBesked(""); setSvar((x) => ({ ...x, [k]: e.target.value })); };

  async function gem(del) {
    setArbejder(del ? "del" : "gem"); setFejl(""); setBesked("");
    const { error } = await supabase.rpc("gem_mus_forberedelse", { p_id: m.id, p_svar: svar, p_del: del });
    setArbejder("");
    if (error) { setFejl(error.message); return; }
    setBesked(del ? "Delt med kontoret." : "Gemt. Kun du kan se det.");
    onGemt();
  }

  return (
    <div style={s.kort}>
      <div style={s.h2}>{planlagt ? "Din næste MUS" : "MUS"}</div>
      <div style={{ fontWeight: 600, marginTop: 4 }}>{langDato(m.dato || m.afholdt_dato)}{m.tid ? ` kl. ${String(m.tid).slice(0, 5)}` : ""}</div>
      <div style={s.dempet}>{planlagt ? "Planlagt" : "Afholdt"}{m.leder_navn ? ` · med ${m.leder_navn}` : ""}</div>
      {planlagt && (<>
        <div style={{ ...s.h2, marginTop: 14 }}>Forbered dig</div>
        <div style={s.dempet}>Det er frivilligt. Det, du skriver, kan kun du se, til du trykker «Del med kontoret». Skriv ikke noget om helbred.</div>
        {MUS_SPOERGSMAAL.map(([k, q]) => (
          <div key={k}>
            <label htmlFor={`mus-${k}`} style={s.label}>{q}</label>
            <textarea id={`mus-${k}`} rows={3} style={{ ...s.felt, minHeight: 84, padding: 10, lineHeight: 1.5 }} value={svar[k] || ""} onChange={saet(k)} />
          </div>
        ))}
        {fejl && <div style={s.fejl}>{fejl}</div>}
        {besked && <div style={{ color: "#1B7A46", fontWeight: 700, margin: "10px 0 0" }}>{besked}</div>}
        {m.forberedelse_delt && <div style={{ ...s.dempet, marginTop: 8 }}>Delt med kontoret {kortDato(m.forberedelse_delt)}. Ændrer du noget, så del igen.</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="button" style={{ ...s.knapLys, flex: 1 }} disabled={!!arbejder} onClick={() => gem(false)}>{arbejder === "gem" ? "Gemmer…" : "Gem"}</button>
          <button type="button" style={{ ...s.knap, flex: 1 }} disabled={!!arbejder} onClick={() => gem(true)}>{arbejder === "del" ? "Deler…" : "Del med kontoret"}</button>
        </div>
      </>)}
    </div>
  );
}

function UdviklingSide({ dok }) {
  const [mus, setMus] = useState(null);
  const [komp, setKomp] = useState(null);
  const [oensker, setOensker] = useState(null);
  const [tekst, setTekst] = useState("");
  const [fejl, setFejl] = useState("");
  const [arbejder, setArbejder] = useState(false);

  const hent = useCallback(async () => {
    const [a, b, c] = await Promise.all([supabase.rpc("min_mus"), supabase.rpc("mine_kompetencer"), supabase.rpc("mine_udviklingsoensker")]);
    if (a.error || b.error || c.error) setFejl("Noget kunne ikke hentes: " + (a.error || b.error || c.error).message);
    setMus(a.data || []); setKomp(b.data || []); setOensker(c.data || []);
  }, []);
  useEffect(() => { hent(); }, [hent]);

  async function send() {
    setArbejder(true); setFejl("");
    const { error } = await supabase.rpc("tilfoej_udviklingsoenske", { p_tekst: tekst });
    setArbejder(false);
    if (error) { setFejl(error.message.includes("check") ? "Skriv et ønske på højst 600 tegn." : error.message); return; }
    setTekst(""); hent();
  }
  async function traek(id) {
    if (!window.confirm("Træk ønsket tilbage?")) return;
    const { error } = await supabase.rpc("traek_udviklingsoenske", { p_id: id });
    if (error) { setFejl(error.message); return; }
    hent();
  }
  const beviser = (dok.dokumenter || []).filter((d) => d.kategori === "certifikat");
  const planlagte = (mus || []).filter((m) => m.status === "planlagt");
  const afholdte = (mus || []).filter((m) => m.status === "afholdt");

  return (
    <>
      <div><h1 style={s.h1}>Udvikling</h1>
        <div style={s.dempet}>Din MUS, det du kan, og det du gerne vil lære.</div></div>
      {fejl && <div style={s.fejl}>{fejl}</div>}

      {mus === null && <div style={s.dempet}>Henter…</div>}
      {planlagte.map((m) => <MusKort key={m.id} m={m} onGemt={hent} />)}
      {mus && planlagte.length === 0 && (
        <div style={s.kort}><div style={s.h2}>Din næste MUS</div><div style={{ ...s.dempet, marginTop: 4 }}>Der er ikke booket en samtale endnu. Når kontoret gør det, står den her, og du kan forberede dig.</div></div>
      )}
      {afholdte.length > 0 && (
        <div style={s.kort}>
          <div style={s.h2}>Tidligere samtaler</div>
          {afholdte.map((m) => <div key={m.id} style={{ marginTop: 6 }}>{kortDato(m.afholdt_dato || m.dato)}{m.leder_navn ? <span style={s.dempet}> · med {m.leder_navn}</span> : null}</div>)}
          <div style={{ ...s.dempet, marginTop: 6 }}>Referatet ligger under Dokumenter, hvis kontoret har lagt det ind til dig.</div>
        </div>
      )}

      <div style={s.kort}>
        <div style={s.h2}>Det, du kan</div>
        {komp === null ? <div style={s.dempet}>Henter…</div>
          : komp.length === 0 ? <div style={{ ...s.dempet, marginTop: 4 }}>Der er ikke registreret kompetencer endnu.</div>
          : komp.map((k) => (
            <div key={k.navn} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${RAMME}`, marginTop: 6 }}>
              <span>{k.navn}</span><span style={s.dempet}>Niveau {k.niveau}</span>
            </div>
          ))}
        {beviser.length > 0 && (<>
          <div style={{ ...s.h2, marginTop: 14 }}>Beviser og kurser</div>
          {beviser.map((d) => (
            <div key={d.id} style={{ padding: "8px 0", borderTop: `1px solid ${RAMME}`, marginTop: 6 }}>
              <div style={{ fontWeight: 600 }}>{d.titel}</div>
              {d.gyldig_til && <div style={{ ...s.dempet, color: d.gyldig_til < idagIso() ? "#B91C1C" : DAEMPET }}>{d.gyldig_til < idagIso() ? "Udløbet " : "Gyldigt til "}{dato(d.gyldig_til)}</div>}
            </div>
          ))}
        </>)}
      </div>

      <div style={s.kort}>
        <div style={s.h2}>Det vil du gerne lære</div>
        <div style={s.dempet}>Skriv et ønske til et kursus eller noget, du vil blive bedre til. Kontoret svarer her.</div>
        <label htmlFor="oenske" style={s.label}>Dit ønske</label>
        <textarea id="oenske" rows={3} maxLength={600} style={{ ...s.felt, minHeight: 84, padding: 10, lineHeight: 1.5 }} value={tekst} onChange={(e) => setTekst(e.target.value)} />
        <button type="button" disabled={!tekst.trim() || arbejder} onClick={send} style={{ ...s.knap, width: "100%", marginTop: 10, opacity: !tekst.trim() || arbejder ? 0.5 : 1 }}>{arbejder ? "Sender…" : "Send ønsket"}</button>
        {(oensker || []).map((o) => {
          const [t, f] = OENSKE_STATUS[o.status] || [o.status, DAEMPET];
          return (
            <div key={o.id} style={{ padding: "10px 0", borderTop: `1px solid ${RAMME}`, marginTop: 12 }}>
              <div style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{o.tekst}</div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 700, color: f }}>{t}</span><span style={s.dempet}>{kortDato(o.oprettet)}</span>
              </div>
              {o.hr_note && <div style={{ ...s.dempet, marginTop: 4 }}>Kontoret: {o.hr_note}</div>}
              {o.status === "oensket" && <button type="button" style={{ ...s.knapLys, marginTop: 8 }} onClick={() => traek(o.id)}>Træk tilbage</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Mere: håndbog og mig ────────────────────────────────────────────────────
function Mere({ gaaTil }) {
  const raekke = (side, titel, tekst, ikon) => (
    <button type="button" onClick={() => gaaTil(side)}
      style={{ ...s.kort, display: "flex", gap: 12, alignItems: "center", textAlign: "left", fontFamily: "inherit", color: TEKST, cursor: "pointer", width: "100%", minHeight: 64 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: FARVE_LYS, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ikon navn={ikon} farve={FARVE_MOERK} stoerrelse={20} />
      </div>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{titel}</div><div style={s.dempet}>{tekst}</div></div>
    </button>
  );
  return (
    <>
      <div><h1 style={s.h1}>Mere</h1></div>
      {raekke("haandbog", "Håndbog", "Personalehåndbog og rygepolitik", "bog")}
      {raekke("mig", "Mig", "Telefon, nødkontakt og log ud", "person")}
      <a href={WORKLIST_URL} target="_blank" rel="noreferrer"
        style={{ ...s.kort, display: "flex", gap: 12, alignItems: "center", textDecoration: "none", color: TEKST, minHeight: 64 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F4EEF1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ikon navn="flueben" farve={DAEMPET} stoerrelse={20} />
        </div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>Åbn Worklist</div><div style={s.dempet}>Dine opgaver og din tid</div></div>
      </a>
    </>
  );
}

// ── Skal ────────────────────────────────────────────────────────────────────
function Skal({ session }) {
  const [side, setSide] = useState("forside");
  const [navn, setNavn] = useState("");
  const [datoer, setDatoer] = useState(null);
  const [adgangFejl, setAdgangFejl] = useState("");
  const dok = useDokumenter();

  useEffect(() => {
    let afbrudt = false;
    (async () => {
      const { data: emp, error } = await supabase.from("employees").select("id,name").eq("auth_user_id", session.user.id).maybeSingle();
      if (afbrudt) return;
      if (error || !emp) { setAdgangFejl("Din e-mail er ikke knyttet til en medarbejder. Ring til kontoret."); return; }
      setNavn(emp.name);
      const { data: d } = await supabase.rpc("mine_datoer");
      if (!afbrudt) setDatoer((Array.isArray(d) ? d[0] : d) || {});
    })();
    return () => { afbrudt = true; };
  }, [session.user.id]);

  // «Mere» er også valgt, når man står på en af siderne under den (håndbog, mig).
  const fane = (k, tekst, ikon, under = []) => {
    const valgt = side === k || under.includes(side);
    return (
    <button type="button" onClick={() => { setSide(k); window.scrollTo(0, 0); }} aria-current={valgt ? "page" : undefined}
      style={{ flex: 1, minHeight: 56, border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
               fontFamily: "inherit", fontSize: 13.5, fontWeight: valgt ? 700 : 400, color: valgt ? FARVE : DAEMPET, cursor: "pointer" }}>
      <Ikon navn={ikon} farve={valgt ? FARVE : DAEMPET} />{tekst}
    </button>
    );
  };

  return (
    <div style={s.side}>
      <div style={s.indhold}>
        {adgangFejl ? <div style={s.kort}>{adgangFejl}</div>
          : side === "forside" ? <Forside navn={navn} dok={dok} datoer={datoer} gaaTil={setSide} />
          : side === "dokumenter" ? <DokumenterSide dok={dok} />
          : side === "ferie" ? <FerieSide />
          : side === "udvikling" ? <UdviklingSide dok={dok} />
          : side === "mere" ? <Mere gaaTil={setSide} />
          : side === "haandbog" ? <HaandbogSide />
          : <Mig navn={navn} datoer={datoer} onLogUd={() => supabase.auth.signOut()} />}
      </div>
      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", display: "flex", background: "#fff", borderTop: `1px solid ${RAMME}`,
                    paddingBottom: "env(safe-area-inset-bottom)" }}>
        {fane("forside", "Forside", "hjem")}
        {fane("ferie", "Ferie", "sol")}
        {fane("udvikling", "Udvikling", "traeplante")}
        {fane("dokumenter", "Dokumenter", "mappe")}
        {fane("mere", "Mere", "mere", ["haandbog", "mig"])}
      </nav>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_hvad, ny) => setSession(ny || null));
    return () => subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div style={s.side}><div style={s.indhold}><div style={s.dempet}>Henter…</div></div></div>;
  return session ? <Skal session={session} /> : <Login />;
}
