// Verified Propstack dispatch categories. No direct public PDF downloads.
export const GUIDE_CATALOG = Object.freeze([
  {
    "id": "VERKAUF",
    "title": "Privater Immobilienverkauf",
    "file": "SLS-Ratgeber-Privater-Immobilienverkauf.pdf",
    "categoryId": 741093,
    "note": "SLS_RATGEBER_VERKAUF_ANGEFORDERT",
    "review": "SLS_RATGEBER_VERKAUF_PRUEFUNG"
  },
  {
    "id": "BEWERTUNG",
    "title": "Der richtige Immobilienpreis",
    "file": "SLS-Ratgeber-Der-richtige-Immobilienpreis.pdf",
    "categoryId": 741094,
    "note": "SLS_RATGEBER_BEWERTUNG_ANGEFORDERT",
    "review": "SLS_RATGEBER_BEWERTUNG_PRUEFUNG"
  },
  {
    "id": "ERBSCHAFT",
    "title": "Immobilie geerbt",
    "file": "SLS-Ratgeber-Immobilie-geerbt.pdf",
    "categoryId": 741095,
    "note": "SLS_RATGEBER_ERBSCHAFT_ANGEFORDERT",
    "review": "SLS_RATGEBER_ERBSCHAFT_PRUEFUNG"
  },
  {
    "id": "WOHNEN_IM_ALTER",
    "title": "Wohnen im Alter",
    "file": "SLS-Ratgeber-Wohnen-im-Alter.pdf",
    "categoryId": 741096,
    "note": "SLS_RATGEBER_WOHNEN_IM_ALTER_ANGEFORDERT",
    "review": "SLS_RATGEBER_WOHNEN_IM_ALTER_PRUEFUNG"
  },
  {
    "id": "TRENNUNG",
    "title": "Immobilie in der Trennung",
    "file": "SLS-Ratgeber-Immobilie-in-der-Trennung.pdf",
    "categoryId": 741097,
    "note": "SLS_RATGEBER_TRENNUNG_ANGEFORDERT",
    "review": "SLS_RATGEBER_TRENNUNG_PRUEFUNG"
  },
  {
    "id": "UNTERLAGEN",
    "title": "Gut vorbereitet verkaufen: die Unterlagen-Checkliste.",
    "file": "SLS-Unterlagen-Checkliste.pdf",
    "categoryId": 741098,
    "note": "SLS_RATGEBER_UNTERLAGEN_ANGEFORDERT",
    "review": "SLS_RATGEBER_UNTERLAGEN_PRUEFUNG"
  }
].map(guide => Object.freeze(guide)));
export const findGuide = id => GUIDE_CATALOG.find(guide => guide.id === id);
