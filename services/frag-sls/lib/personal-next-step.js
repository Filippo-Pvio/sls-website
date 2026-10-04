// Fixed editorial invitations: no generated promises or unverified services.
function personalNextStep(question){
 const q=question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const experts=[];
 if(/notar|beurkund|anderkonto|kaufvertrag|kaufpreis.*zahl/.test(q))experts.push('das beurkundende Notariat');
 if(/steuer|spekulation/.test(q))experts.push('Ihre Steuerberatung');
 if(/scheidung|anfecht|rechtswirksam|rechtlich|rechtsberatung/.test(q))experts.push('eine Rechtsberatung');
 if(/finanzier|darlehen|kredit|bankzusage|restschuld|vorfalligkeit/.test(q))experts.push('Ihren Darlehensgeber');
 if(experts.length)return 'Besprechen Sie Ihre Fragen und die nächsten Schritte gerne mit Ihrem SLS Immobilienpartner. Die verbindliche Klärung der jeweiligen Fachfrage erfolgt durch '+experts.join(' beziehungsweise ')+'.';
 if(/wohnungssuche|mietwohnung|wohnung.*miet|miet.*wohnung|umzieh|umzug|neue wohnung/.test(q))return 'Besprechen Sie mit Ihrem SLS Immobilienpartner gerne, wie Sie Wohnungssuche und Verkauf zeitlich aufeinander abstimmen möchten.';
 if(/fotograf|foto|drohn|video|prasentation/.test(q))return 'Welche Vorbereitung und Präsentation für Ihre Immobilie sinnvoll ist, können Sie gerne mit Ihrem SLS Immobilienpartner besprechen.';
 if(/besichtig|bonitat|interessent/.test(q))return 'Besprechen Sie den Ablauf der Besichtigungen und Ihre Fragen zu Kaufinteressenten gerne persönlich mit Ihrem SLS Immobilienpartner.';
 if(/bewert|immobilienwert|haus.*wert/.test(q))return 'Für eine persönliche Einordnung Ihrer Immobilie sprechen Sie gerne mit Ihrem SLS Immobilienpartner.';
 if(/kost|provision|courtage|kundig/.test(q))return 'Die Konditionen für Ihren konkreten Auftrag können Sie gerne persönlich mit Ihrem SLS Immobilienpartner besprechen.';
 return 'Besprechen Sie Ihr Anliegen und die passenden nächsten Schritte gerne persönlich mit Ihrem SLS Immobilienpartner.';
}
module.exports={personalNextStep};
