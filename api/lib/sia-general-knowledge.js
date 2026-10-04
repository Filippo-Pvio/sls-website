// General definitions checked against the cited primary sources on 2026-10-04.
// Only complete definition requests match; individual cases and SLS claims stay upstream.
const facts = [
  {
    id: 'erbbaurecht', terms: 'erbpacht|erbbaurecht',
    title: 'Erbbaurecht und Erbbauzins – §§ 1 und 9 ErbbauRG',
    text: 'Mit „Erbpacht“ ist bei Immobilien meist das Erbbaurecht gemeint. Es erlaubt, auf einem Grundstück, das einem anderen Eigentümer gehört, ein Gebäude zu haben. Dieses Recht kann verkauft und vererbt werden. Sie erwerben damit das Erbbaurecht, nicht das Eigentum am Grundstück.\n\nWird dafür eine wiederkehrende Zahlung vereinbart, heißt sie Erbbauzins. Welche Laufzeit und Konditionen gelten, ergibt sich aus der konkreten Vereinbarung. Für einen Kauf sollten diese Unterlagen individuell geprüft werden.',
    references: ['https://www.gesetze-im-internet.de/erbbauv/__1.html', 'https://www.gesetze-im-internet.de/erbbauv/__9.html']
  },
  {
    id: 'grundschuld', terms: 'grundschuld',
    title: 'Grundschuld – § 1191 BGB',
    text: 'Eine Grundschuld ist ein Recht, das ein Grundstück mit einer bestimmten Geldsumme belastet. Der Berechtigte kann die Zahlung dieser Summe aus dem Grundstück verlangen. Auch Zinsen und Nebenleistungen können dazugehören.\n\nWelche Bedeutung eine konkrete Grundschuld für Kauf oder Finanzierung hat, hängt von den vereinbarten Unterlagen und der Abwicklung ab. Diese allgemeine Erklärung ersetzt keine Prüfung Ihrer Vereinbarung.',
    references: ['https://www.gesetze-im-internet.de/bgb/__1191.html']
  },
  {
    id: 'niessbrauch', terms: 'niessbrauch',
    title: 'Nießbrauch – § 1030 BGB',
    text: 'Nießbrauch ist ein Recht, die Nutzungen einer Sache zu erhalten, ohne selbst ihr Eigentümer zu sein. Bei einer Immobilie kann dazu beispielsweise die Nutzung des Hauses oder der Bezug von Mieteinnahmen gehören. Einzelne Nutzungen können ausgeschlossen sein.\n\nDer genaue Umfang ergibt sich aus der jeweiligen Vereinbarung. Welche Folgen ein bestehender Nießbrauch für einen konkreten Verkauf hat, muss anhand der Unterlagen geprüft werden.',
    references: ['https://www.gesetze-im-internet.de/bgb/__1030.html']
  }
];
export function generalDefinition(question, now = new Date()) {
  if (now >= new Date('2027-01-04T00:00:00Z')) return null;
  const q = question.toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const fact = facts.find(f => new RegExp(`^(?:(?:was (?:ist|bedeutet))\\s+(?:(?:ein|eine|der|die|das)\\s+)?|(?:erklare|erlautere)(?:\\s+mir)?\\s+(?:(?:ein|eine|der|die|das)\\s+)?|definition(?:\\s+von)?\\s+)(?:${f.terms})(?:\\s+(?:einfach|kurz|bitte|einfach erklart))*[?.!]*$`).test(q));
  if (!fact) return null;
  return {
    provider: 'Wissensbasis von SLS Immobilienpartner', reason: 'general_definition',
    answer: `${fact.text} [1]`, version: 'website-general-1',
    sources: [{id: fact.id, number: 1, title: fact.title, text: `${fact.text}\n\nRechtsgrundlagen:\n${fact.references.join('\n')}`, snapshotDate: '2026-10-04', category: 'expert', references: fact.references}]
  };
}
