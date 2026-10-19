/* Stockkarte – App-Logik
   Abschnitte: Hilfsfunktionen · Daten · Diagramm · Darstellung · Aktionen */
"use strict";

/* ========== Hilfsfunktionen ========== */
const STORAGE_KEY = "stockkarte-v1";
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const TAG_MS = 24 * 60 * 60 * 1000;
const PAPIERKORB = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>`;
const SCHNELLAUSWAHL = [
  ["Futter", "n-futter"], ["Api Life Var", "n-varroa"], ["VarroMed", "n-varroa"],
  ["Durchsicht", "n-text"], ["Futterkranzprobe", "n-text"],
];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const zahl = (s) => parseFloat(String(s).replace(",", ".")) || 0;
const formatZahl = (n) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
const formatDatum = (iso) => iso.split("-").reverse().join(".");
const kurzDatum = (iso) => formatDatum(iso).slice(0, 6);
const zeitstempel = (iso) => Date.parse(iso + "T12:00:00Z");
const heute = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const nachDatum = (a, b) => a.datum.localeCompare(b.datum);

/* ========== Daten ========== */
let daten = laden();
const ui = { diagramm: "futter", auswahl: null };

function laden() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d && Array.isArray(d.voelker)) return d;
  } catch (e) { /* leerer oder defekter Speicher */ }
  return erzeugeAusgangsdaten();
}

function speichern() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(daten)); } catch (e) { /* Speicher voll/gesperrt */ }
}

const aktivesVolk = () => daten.voelker[daten.aktiv];

/* ========== Diagramm ========== */
function diagrammPunkte(volk, art) {
  const eintraege = [...volk.eintraege].sort(nachDatum);
  if (art === "gewicht") {
    return eintraege.filter((e) => e.gewicht)
      .map((e) => ({ t: zeitstempel(e.datum), y: zahl(e.gewicht), datum: e.datum }));
  }
  let summe = 0;
  return eintraege.filter((e) => zahl(e.futter) > 0).map((e) => {
    summe += zahl(e.futter);
    return { t: zeitstempel(e.datum), y: summe, datum: e.datum, menge: zahl(e.futter) };
  });
}

function schoenerSchritt(grob) {
  const exp = 10 ** Math.floor(Math.log10(grob));
  const f = grob / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

function monatsMarken(t0, t1) {
  const start = new Date(t0);
  let t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1);
  if (t < t0) t = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
  const marken = [];
  while (t <= t1) {
    marken.push(t);
    const d = new Date(t);
    t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  const jedes = Math.ceil(marken.length / 5) || 1;
  return marken.filter((_, i) => i % jedes === 0);
}

function diagrammSvg(punkte, art, einheit) {
  const W = 360, H = 210, L = 44, R = 14, T = 20, B = 28;
  let t0 = punkte[0].t, t1 = punkte[punkte.length - 1].t;
  if (t0 === t1) { t0 -= 15 * TAG_MS; t1 += 15 * TAG_MS; }

  const maxY = Math.max(...punkte.map((p) => p.y)) || 1;
  const schritt = schoenerSchritt(maxY / 4);
  const stufen = Math.ceil(maxY / schritt - 1e-9);
  const oben = stufen * schritt;
  const x = (t) => (L + ((t - t0) / (t1 - t0)) * (W - L - R)).toFixed(1);
  const y = (v) => (T + (1 - v / oben) * (H - T - B)).toFixed(1);

  let gitter = "";
  for (let i = 0; i <= stufen; i++) {
    const v = i * schritt;
    gitter += `<line class="gitter" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`
            + `<text class="achse" x="${L - 6}" y="${Number(y(v)) + 3}" text-anchor="end">${formatZahl(v)}</text>`;
  }

  const monate = monatsMarken(t0, t1).map((t) => {
    const d = new Date(t);
    return `<text class="achse" x="${x(t)}" y="${H - 8}" text-anchor="middle">${MONATE[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}</text>`;
  }).join("");

  const linie = art === "futter"
    ? punkte.map((p, i) => (i === 0 ? `M${x(p.t)},${y(0)}V${y(p.y)}` : `H${x(p.t)}V${y(p.y)}`)).join("")
    : punkte.map((p, i) => `${i ? "L" : "M"}${x(p.t)},${y(p.y)}`).join("");
  const flaeche = art === "futter" ? `<path class="flaeche" d="${linie}V${y(0)}H${x(punkte[0].t)}Z"/>` : "";

  const kreise = punkte.map((p, i) =>
    `<circle class="pkt${i === ui.auswahl ? " gewaehlt" : ""}" cx="${x(p.t)}" cy="${y(p.y)}" r="4.5" data-aktion="punkt" data-i="${i}"/>`).join("");

  return `<svg class="diagramm ${art}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf ${art === "futter" ? "Futter gesamt" : "Gewicht"}">
    <text class="achse" x="4" y="12">${esc(einheit)}</text>${gitter}${monate}${flaeche}<path class="linie" d="${linie}"/>${kreise}</svg>`;
}

/* ========== Darstellung ========== */
function renderTabs() {
  const tabs = daten.voelker.map((v, i) =>
    `<button class="${i === daten.aktiv ? "on" : ""}" data-aktion="tab" data-i="${i}">Volk ${esc(v.name.split("/")[0].trim())}</button>`);
  $("tabs").innerHTML = tabs.join("") + `<button data-aktion="neuesVolk">+ Neues Volk</button>`;
}

function renderKopf() {
  const volk = aktivesVolk();
  if (!volk) {
    $("kopf").innerHTML = `<div class="card">Noch kein Volk angelegt. Lege mit „+ Neues Volk“ das erste an.</div>`;
    return;
  }
  const eintraege = [...volk.eintraege].sort(nachDatum).reverse();
  const futterSumme = eintraege.reduce((s, e) => s + zahl(e.futter), 0);
  const gewicht = eintraege.find((e) => e.gewicht);
  const varroa = eintraege.find((e) => e.varroa);
  $("kopf").innerHTML = `
    <div class="head">
      <div><h2>${esc(volk.name)}</h2><small>${esc(volk.standort.split(",")[0] || "Kein Standort angegeben")}</small></div>
      <button class="icon danger" data-aktion="volkLoeschen" aria-label="Volk löschen">${PAPIERKORB}</button>
    </div>
    <div class="tiles">
      <div class="tile"><b>${formatZahl(futterSumme)} ${esc(volk.einheit)}</b><span>Futter gesamt</span></div>
      <div class="tile"><b>${gewicht ? esc(gewicht.gewicht) + " kg" : "–"}</b><span>${gewicht ? "Gewicht am " + kurzDatum(gewicht.datum) : "Kein Gewicht"}</span></div>
      <div class="tile"><b>${varroa ? kurzDatum(varroa.datum) : "–"}</b><span>Letzte Varroa-Maßnahme</span></div>
    </div>`;
}

function renderFormular() {
  const volk = aktivesVolk();
  const chips = SCHNELLAUSWAHL.map(([text, fokus]) =>
    `<button data-aktion="schnell" data-text="${text}" data-fokus="${fokus}">${text}</button>`).join("");
  $("formular").innerHTML = `
    <h2>Neuer Eintrag</h2>
    <div class="chips">${chips}</div>
    <div class="grid two">
      <label class="full">Datum<input type="date" id="n-datum" value="${heute()}"></label>
      <label class="full">Beobachtung / Arbeit<input id="n-text" autocomplete="off"></label>
      <label>Gefüttert (${esc(volk.einheit)})<input id="n-futter" inputmode="decimal"></label>
      <label>Gewicht (kg)<input id="n-gewicht" inputmode="decimal"></label>
      <label class="full">Maßnahme Varroa<input id="n-varroa" placeholder="z. B. 15ml oder 1 Streifen" autocomplete="off"></label>
    </div>
    <div class="row"><button class="pri" data-aktion="eintragSpeichern">Eintrag speichern</button></div>`;
}

function renderDiagramm() {
  const volk = aktivesVolk();
  if (!volk) return;
  const art = ui.diagramm;
  const einheit = art === "futter" ? volk.einheit : "kg";
  const punkte = diagrammPunkte(volk, art);
  const knopf = (a, text) => `<button class="${a === art ? "on" : ""}" data-aktion="diagrammArt" data-art="${a}">${text}</button>`;

  let inhalt;
  if (!punkte.length) {
    inhalt = `<p class="mut">Noch keine ${art === "futter" ? "Fütterungen" : "Gewichtsangaben"} erfasst.</p>`;
  } else {
    const p = punkte[ui.auswahl];
    const info = !p ? "Tippe auf einen Punkt für Details."
      : art === "futter"
        ? `${formatDatum(p.datum)}: +${formatZahl(p.menge)} ${einheit}, gesamt ${formatZahl(p.y)} ${einheit}`
        : `${formatDatum(p.datum)}: ${formatZahl(p.y)} kg`;
    inhalt = diagrammSvg(punkte, art, einheit) + `<p class="info">${esc(info)}</p>`;
  }
  $("diagramm").innerHTML = `<h2>Verlauf</h2>
    <div class="segment">${knopf("futter", "Futter (gesamt)")}${knopf("gewicht", "Gewicht")}</div>${inhalt}`;
}

function renderListe() {
  const volk = aktivesVolk();
  const eintraege = [...volk.eintraege].sort(nachDatum).reverse();
  const zeile = (e) => {
    const typ = e.varroa ? "v" : e.gewicht ? "g" : e.futter ? "f" : "";
    return `<li class="ent ${typ}">
      <div class="eh"><b>${formatDatum(e.datum)}</b>
        <button class="del" data-aktion="eintragLoeschen" data-id="${e.id}" aria-label="Eintrag vom ${formatDatum(e.datum)} löschen">✕</button></div>
      ${e.text ? `<div>${esc(e.text)}</div>` : ""}
      <div class="tags">
        ${e.futter ? `<span>${esc(e.futter)} ${esc(volk.einheit)}</span>` : ""}
        ${e.varroa ? `<span>${esc(e.varroa)}</span>` : ""}
        ${e.gewicht ? `<span>${esc(e.gewicht)} kg</span>` : ""}
      </div></li>`;
  };
  $("liste").innerHTML = `<h2>Stockkarte</h2>
    <div class="legend"><span><i class="f"></i>Futter</span><span><i class="v"></i>Varroa</span><span><i class="g"></i>Gewicht</span></div>
    ${eintraege.length ? `<ul class="list">${eintraege.map(zeile).join("")}</ul>` : `<small>Noch keine Einträge.</small>`}`;
}

function renderStamm() {
  const v = aktivesVolk();
  const auswahl = (wert, optionen) => optionen.map((o) => `<option${o === wert ? " selected" : ""}>${o}</option>`).join("");
  $("stamm").innerHTML = `<summary>Volk &amp; Königin</summary>
    <div class="grid">
      <label>Volk Nr./Name<input data-feld="name" value="${esc(v.name)}"></label>
      <label>Standort<input data-feld="standort" value="${esc(v.standort)}"></label>
      <label>Beute<input data-feld="beute" value="${esc(v.beute)}"></label>
      <label>Futtereinheit<select data-feld="einheit">${auswahl(v.einheit, ["Liter", "kg"])}</select></label>
      <label>Königin Jahrgang<input data-koenigin="jahrgang" value="${esc(v.koenigin.jahrgang)}"></label>
      <label>Königin gezeichnet<select data-koenigin="gezeichnet">${auswahl(v.koenigin.gezeichnet, ["Nein", "Ja"])}</select></label>
      <label>Königin Herkunft<input data-koenigin="herkunft" value="${esc(v.koenigin.herkunft)}"></label>
    </div>`;
}

function renderAlles() {
  if (daten.aktiv >= daten.voelker.length) daten.aktiv = 0;
  ui.auswahl = null;
  renderTabs();
  renderKopf();
  const vorhanden = Boolean(aktivesVolk());
  ["formular", "diagramm", "liste", "stamm"].forEach((id) => { $(id).hidden = !vorhanden; });
  if (!vorhanden) return;
  renderFormular();
  renderDiagramm();
  renderListe();
  renderStamm();
}

/* ========== Aktionen ========== */
function aendereAnsicht(aendern) {
  aendern();
  speichern();
  renderAlles();
}

const aktionen = {
  tab(el) {
    daten.aktiv = Number(el.dataset.i);
    speichern();
    renderAlles();
  },

  neuesVolk() {
    const name = prompt("Name des neuen Volks (z. B. 3 / Name):");
    if (!name) return;
    aendereAnsicht(() => {
      daten.voelker.push({
        id: "v" + Date.now(), name, standort: "", beute: "1", einheit: "Liter",
        koenigin: { jahrgang: "", gezeichnet: "Nein", herkunft: "" }, eintraege: [],
      });
      daten.aktiv = daten.voelker.length - 1;
    });
  },

  volkLoeschen() {
    const v = aktivesVolk();
    if (!confirm(`Volk „${v.name}“ mit allen ${v.eintraege.length} Einträgen endgültig löschen?`)) return;
    aendereAnsicht(() => { daten.voelker.splice(daten.aktiv, 1); daten.aktiv = 0; });
  },

  eintragLoeschen(el) {
    if (!confirm("Diesen Eintrag löschen?")) return;
    const v = aktivesVolk();
    aendereAnsicht(() => { v.eintraege = v.eintraege.filter((e) => e.id !== el.dataset.id); });
  },

  eintragSpeichern() {
    const datum = $("n-datum").value;
    const text = $("n-text").value.trim();
    const futter = $("n-futter").value.trim();
    const varroa = $("n-varroa").value.trim();
    const gewicht = $("n-gewicht").value.trim();
    if (!datum) return alert("Bitte ein Datum angeben.");
    if (!text && !futter && !varroa && !gewicht) return alert("Bitte mindestens eine Angabe machen.");
    aendereAnsicht(() => {
      aktivesVolk().eintraege.push({
        id: "e" + Date.now(), datum, text: text || (futter ? "Futter" : ""), futter, varroa, gewicht,
      });
    });
  },

  schnell(el) {
    $("n-text").value = el.dataset.text;
    $(el.dataset.fokus).focus();
  },

  diagrammArt(el) {
    ui.diagramm = el.dataset.art;
    ui.auswahl = null;
    renderDiagramm();
  },

  punkt(el) {
    ui.auswahl = Number(el.dataset.i);
    renderDiagramm();
  },

  exportieren() {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(daten, null, 2)], { type: "application/json" }));
    link.download = `stockkarte-${heute()}.json`;
    link.click();
  },

  importieren() { $("datei").click(); },

  zuruecksetzen() {
    if (!confirm("Alle Änderungen verwerfen und die Ausgangsdaten laden?")) return;
    aendereAnsicht(() => { daten = erzeugeAusgangsdaten(); });
  },
};

document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-aktion]");
  const aktion = el && aktionen[el.dataset.aktion];
  if (aktion) aktion(el);
});

document.addEventListener("change", (ev) => {
  const feld = ev.target;
  if (feld.id === "datei") return dateiImportieren(feld);
  const volk = aktivesVolk();
  if (feld.dataset.feld) {
    volk[feld.dataset.feld] = feld.value;
    speichern();
    if (feld.dataset.feld === "einheit") renderAlles();
    else { renderTabs(); renderKopf(); }
  } else if (feld.dataset.koenigin) {
    volk.koenigin[feld.dataset.koenigin] = feld.value;
    speichern();
  }
});

function dateiImportieren(feld) {
  const leser = new FileReader();
  leser.onload = () => {
    try {
      const d = JSON.parse(leser.result);
      if (!Array.isArray(d.voelker)) throw new Error("Format");
      daten = d;
      daten.aktiv = 0;
      speichern();
      renderAlles();
    } catch (e) {
      alert("Die Datei ist keine gültige Stockkarten-Sicherung.");
    }
  };
  leser.readAsText(feld.files[0]);
  feld.value = "";
}

renderAlles();
