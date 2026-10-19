/* Ausgangsdaten aus der Stockkarte.
   Zeilenformat: Datum|Beobachtung/Arbeit|Futter|Varroa|Gewicht */

const VOLK_1_ZEILEN = `10.05.2025|Aus Itterbeck
28.07.2025|Futter|2
30.07.2025|Futter|2
31.07.2025|Api Life Var||1 Streifen
04.08.2025|Futter|2
07.08.2025|Futter|2
08.08.2025|Api Life Var||1 Streifen
11.08.2025|Futter|2
14.08.2025|Futter|2
19.08.2025|Futter|2
01.09.2025|VarroMed||15ml
09.09.2025|VarroMed||15ml
15.09.2025|VarroMed||15ml
08.12.2025|VarroMed||15ml
08.06.2026|Brutwabe hinzugeben
29.07.2026|Futter|1
30.07.2026|Api Life Var||1 Streifen
31.07.2026|Futter|1
02.08.2026|Futter|2
05.08.2026|Api Life Var||1 Streifen
05.08.2026|Futter|2
09.08.2026|Futter|2
13.08.2026|Api Life Var||1 Streifen
13.08.2026|Futter|2
20.08.2026|Api Life Var||1 Streifen
20.08.2026|Futter|0,75
27.08.2026|Futter|2
04.09.2026|VarroMed||15ml
04.09.2026|Futter|2
10.09.2026|VarroMed||20ml
10.09.2026|Futter|2
17.09.2026|VarroMed||20ml
17.09.2026|Futter|2
19.09.2026|Futterkranzprobe + 2 Stock aufgesetzt
20.09.2026|Futter|2
24.09.2026|Futter|2
24.09.2026|VarroMed||20ml
01.10.2026|Futter|2
01.10.2026|VarroMed||20ml
08.10.2026|Futter|2
08.10.2026|VarroMed||15ml
14.10.2026|Futter|2||32`;

const VOLK_2_ZEILEN = `08.06.2026|Aus Neuenhaus
29.07.2026|Futter|1
30.07.2026|Api Life Var||1 Streifen
31.07.2026|Futter|1
02.08.2026|Futter|2
05.08.2026|Api Life Var||1 Streifen
05.08.2026|Futter|2
09.08.2026|Futter|2
13.08.2026|Api Life Var||1 Streifen
13.08.2026|Futter|2
20.08.2026|Api Life Var||1 Streifen
20.08.2026|Futter|1,5
27.08.2026|Futter|2
04.09.2026|VarroMed||20ml
04.09.2026|Futter|2
10.09.2026|VarroMed||15ml
10.09.2026|Futter|2
17.09.2026|VarroMed||15ml
17.09.2026|Futter|2
19.09.2026|Futterkranzprobe + 2 Stock aufgesetzt
20.09.2026|Futter|2
24.09.2026|Futter|2
24.09.2026|VarroMed||15ml
01.10.2026|Futter|2
01.10.2026|VarroMed||20ml
08.10.2026|Futter|2
08.10.2026|VarroMed||15ml
14.10.2026|Futter|2||32`;

function zeilenZuEintraegen(text, praefix) {
  return text.trim().split("\n").map((zeile, i) => {
    const [datum, beschreibung, futter, varroa, gewicht] = zeile.split("|");
    const [tag, monat, jahr] = datum.split(".");
    return {
      id: `${praefix}-${i}`,
      datum: `${jahr}-${monat}-${tag}`,
      text: beschreibung || "",
      futter: futter || "",
      varroa: varroa || "",
      gewicht: gewicht || "",
    };
  });
}

function erzeugeAusgangsdaten() {
  const standort = "Kläranlage Uelsen WAZ, Zur Kläranlage 1, 49843 Uelsen";
  return {
    aktiv: 0,
    voelker: [
      {
        id: "v1", name: "1 / Mareen Arends & Dennis Leisdon", standort, beute: "1", einheit: "Liter",
        koenigin: { jahrgang: "unklar", gezeichnet: "Nein", herkunft: "Bienenschwarm 2025" },
        eintraege: zeilenZuEintraegen(VOLK_1_ZEILEN, "a"),
      },
      {
        id: "v2", name: "2 / Mareen Arends & Dennis Leisdon", standort, beute: "1", einheit: "kg",
        koenigin: { jahrgang: "unklar", gezeichnet: "Nein", herkunft: "Bienenschwarm 2026" },
        eintraege: zeilenZuEintraegen(VOLK_2_ZEILEN, "b"),
      },
    ],
  };
}
