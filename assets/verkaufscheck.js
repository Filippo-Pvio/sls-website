(() => {
  const root = document.querySelector('[data-sales-wizard]');
  if (!root) return;

  const stepLabel = root.querySelector('[data-wizard-step]');
  const progress = root.querySelector('[data-wizard-progress]');
  const kicker = root.querySelector('[data-wizard-kicker]');
  const title = root.querySelector('[data-wizard-title]');
  const text = root.querySelector('[data-wizard-text]');
  const options = root.querySelector('[data-wizard-options]');
  const explainer = root.querySelector('[data-wizard-explainer]');
  const back = root.querySelector('[data-wizard-back]');
  const next = root.querySelector('[data-wizard-next]');

  const statusOptions = (yesLabel='Vorhanden', noLabel='Fehlt') => [
    ['yes',yesLabel,'Die Unterlage bzw. Information liegt vor.'],
    ['no',noLabel,'Das muss noch beschafft oder geklärt werden.'],
    ['unknown','Unsicher','Ich weiß nicht genau, ob das Vorhandene ausreicht.']
  ];

  const typeFromAnswers = answers =>
    answers.typePrep || answers.typeInterest || answers.typeBuyer || 'house';

  const afterDocs = answers => 'ownership';

  const afterSpecials = answers =>
    answers.start === 'buyer' ? 'finance' :
    answers.start === 'interest' ? 'qualification' : 'market';

  const nextAfterGrundbuch = answers => {
    const type = typeFromAnswers(answers);
    return type === 'land' || type === 'house' || type === 'investment' ? 'docFlur' : 'docPlans';
  };
  const nextAfterFlur = answers => {
    const type = typeFromAnswers(answers);
    return type === 'land' ? 'docLand' : 'docPlans';
  };
  const nextAfterPlans = answers => {
    const type = typeFromAnswers(answers);
    return type === 'apartment' ? 'docApartment' : type === 'investment' ? 'docInvestment' : 'docEnergy';
  };
  const nextAfterSpecific = answers => {
    const type = typeFromAnswers(answers);
    return type === 'land' ? afterDocs(answers) : 'docEnergy';
  };

  const missingInfo = (title, bullets) => ({
    no:[title,bullets],
    unknown:[title,bullets]
  });

  const siaQuestions = {
    docGrundbuch:'Warum ist ein aktueller Grundbuchauszug beim Immobilienverkauf wichtig?',
    groundbook:'Was bedeuten Abteilung II und Abteilung III im Grundbuch beim Immobilienverkauf?',
    docFlur:'Warum kann eine aktuelle Flurkarte für Käufer und Finanzierung wichtig sein?',
    docEnergy:'Warum braucht man beim Immobilienverkauf einen gültigen Energieausweis?',
    authority:'Welche Rolle spielen Vollmacht oder Erbnachweis beim Immobilienverkauf?',
    sellerLoan:'Was passiert beim Immobilienverkauf mit einer bestehenden Grundschuld oder Restschuld?',
    rental:'Welche Unterlagen sind bei einer vermieteten Immobilie für den Verkauf wichtig?',
    alterations:'Warum können nicht dokumentierte Umbauten den Immobilienverkauf erschweren?',
    landRisks:'Was sind Baulasten und warum sind sie beim Immobilienverkauf wichtig?',
    pv:'Was muss beim Verkauf einer Immobilie mit Photovoltaikanlage beachtet werden?',
    finance:'Warum sollte die Finanzierung des Käufers vor dem Notartermin belastbar geprüft sein?',
    financeType:'Warum reicht eine vorläufige Finanzierungszusage beim Immobilienkauf nicht aus?',
    notaryRisk:'Welche Kostenrisiken bestehen, wenn ein Immobilienkauf nach dem Notartermin scheitert?',
    earlyAccess:'Warum sollte man Schlüssel oder Nutzung nicht vor Kaufpreiszahlung übergeben?'
  };

  const siaButton = id => {
    const question = siaQuestions[id];
    return question ? '<button type="button" class="sales-sia-link" data-sia-question="'+question.replace(/"/g,'&quot;')+'"><span>SIA</span> fragen</button>' : '';
  };

  const questions = {
    start: {
      kicker:'Ausgangssituation', title:'Wo stehen Sie gerade mit Ihrem Verkauf?',
      text:'Wählen Sie die Antwort, die Ihrer aktuellen Situation am nächsten kommt.',
      options:[
        ['noBuyer','Ich habe noch keinen Käufer','Ich möchte wissen, was ich vor und während der Vermarktung vorbereiten muss.'],
        ['interest','Es gibt bereits einen Interessenten','Es gibt Kontakt oder Besichtigungen, aber noch keine sichere Kaufentscheidung.'],
        ['buyer','Ich habe bereits einen konkreten Käufer','Ich möchte wissen, was jetzt bis Notar, Kaufpreiszahlung und Übergabe passiert.'],
        ['unsure','Ich bin unsicher','Ich möchte erst einordnen, wie weit mein Verkauf überhaupt ist.']
      ],
      next:(_,value)=> value==='buyer'?'typeBuyer':value==='interest'?'typeInterest':'typePrep'
    },

    typePrep: typeQuestion(),
    typeInterest: typeQuestion(),
    typeBuyer: typeQuestion(),

    docsIntro:{
      kicker:'Unterlagen',title:'Lassen Sie uns die Unterlagen einzeln prüfen.',
      text:'Statt nur zu fragen, ob „alles vollständig“ ist, gehen wir jetzt die für Ihre Immobilie relevanten Unterlagen Schritt für Schritt durch.',
      options:[
        ['start','Unterlagen prüfen','Ich möchte sehen, was konkret benötigt wird.']
      ],
      explain:{
        start:['Warum das wichtig ist',['Fehlende Unterlagen fallen häufig erst bei Käufer, Bank oder Notar auf.','Je früher Lücken bekannt sind, desto besser lässt sich der weitere Ablauf planen.','Welche Unterlagen relevant sind, hängt vom Immobilientyp ab.']]
      },
      next:()=> 'docGrundbuch'
    },

    docGrundbuch:{
      kicker:'Unterlagen · Grundbuch',title:'Liegt ein aktueller Grundbuchauszug vor?',
      text:'Der Grundbuchauszug ist die Grundlage, um Eigentum sowie Rechte und Belastungen einordnen zu können.',
      options:statusOptions(),
      explain:missingInfo('Ein fehlender oder unklarer Grundbuchstand sollte früh geklärt werden.',[
        'Woher? In der Regel über das zuständige Grundbuchamt beim Amtsgericht; die Einsicht setzt ein berechtigtes Interesse voraus.',
        'Abteilung II kann z. B. Wohnrechte, Nießbrauch oder Wegerechte enthalten.',
        'Abteilung III enthält typischerweise Grundpfandrechte wie Grundschulden.',
        'SLS prüft mit Ihnen, welcher Stand vorliegt und wo weiterer Klärungsbedarf besteht.'
      ]),
      next:nextAfterGrundbuch
    },

    docFlur:{
      kicker:'Unterlagen · Grundstück',title:'Liegt eine aktuelle Flurkarte mit belastbaren Grundstücksangaben vor?',
      text:'Flurstück, Grundstücksgröße und Zuschnitt sollten aktuell und eindeutig zum Objekt passen.',
      options:statusOptions(),
      explain:missingInfo('Diese Angaben gehören zu den zentralen Objektgrundlagen.',[
        'Woher? Je nach Unterlage über Kataster- bzw. Vermessungsstellen oder vorhandene Eigentümerunterlagen.',
        'Warum aktuell? Gerade für die Objektprüfung durch Käufer und finanzierende Banken sollten die Grundstücksdaten den heutigen Stand abbilden.',
        'SLS gleicht vorhandene Angaben ab und zeigt, welche Nachweise noch fehlen.'
      ]),
      next:nextAfterFlur
    },

    docPlans:{
      kicker:'Unterlagen · Flächen & Pläne',title:'Sind Grundrisse und Flächenangaben nachvollziehbar?',
      text:'Alte Pläne, Umbauten oder voneinander abweichende Flächenangaben sollten vor dem weiteren Verkauf geklärt werden.',
      options:statusOptions('Ja, nachvollziehbar','Nein, nicht vollständig'),
      explain:missingInfo('Ein alter Grundriss ist nicht automatisch eine belastbare Flächengrundlage.',[
        'Prüfen Sie, ob der dokumentierte Zustand noch zur heutigen Immobilie passt.',
        'Bei Unklarheiten können Bauunterlagen recherchiert oder Flächen neu aufgenommen werden.',
        'Für Käufer und Banken können nachvollziehbare Flächenangaben entscheidend sein.',
        'SLS prüft die Vermarktungsunterlagen auf Plausibilität und koordiniert bei Bedarf weitere Schritte.'
      ]),
      next:nextAfterPlans
    },

    docApartment:{
      kicker:'Unterlagen · Eigentumswohnung',title:'Sind die wichtigen WEG-Unterlagen vollständig?',
      text:'Bei einer Eigentumswohnung wird nicht nur die Wohnung selbst geprüft, sondern auch das Gemeinschaftseigentum.',
      options:statusOptions(),
      explain:missingInfo('Bei Wohnungen entstehen häufig genau hier Unterlagenlücken.',[
        'Typisch relevant: Teilungserklärung und Aufteilungsplan.',
        'Außerdem: Wirtschaftsplan, Hausgeldabrechnung und Protokolle der Eigentümerversammlungen.',
        'Informationen zu Rücklagen, Sonderumlagen oder geplanten Maßnahmen können für Käufer wichtig sein.',
        'Woher? Vieles liegt beim Eigentümer oder der Hausverwaltung.',
        'SLS strukturiert die benötigten Unterlagen und erkennt Lücken vor der intensiven Käuferprüfung.'
      ]),
      next:nextAfterSpecific
    },

    docInvestment:{
      kicker:'Unterlagen · Mehrfamilienhaus',title:'Sind Miet- und Ertragsunterlagen vollständig und nachvollziehbar?',
      text:'Bei einem Anlageobjekt prüfen Käufer zusätzlich zur Immobilie die wirtschaftlichen Grundlagen.',
      options:statusOptions(),
      explain:missingInfo('Bei Mehrfamilienhäusern reicht die reine Objektbeschreibung nicht aus.',[
        'Typisch relevant sind Mietverträge, aktuelle Mieten, Betriebskosten und Informationen zu Leerständen.',
        'Auch Modernisierungen und gegebenenfalls offene Mietthemen sollten sauber dokumentiert sein.',
        'Die Unterlagen sollten widerspruchsfrei zu Exposé und Kaufpreisargumentation passen.',
        'SLS strukturiert die wirtschaftlich relevanten Unterlagen für die Käuferprüfung.'
      ]),
      next:nextAfterSpecific
    },

    docLand:{
      kicker:'Unterlagen · Grundstück',title:'Ist die mögliche Nutzung oder Bebaubarkeit des Grundstücks geklärt?',
      text:'Bei Grundstücken ist für Käufer oft entscheidend, was tatsächlich realisiert werden kann.',
      options:statusOptions('Ja, weitgehend geklärt','Nein, noch offen'),
      explain:missingInfo('Die Bebaubarkeit sollte nicht nur vermutet werden.',[
        'Relevant können Bebauungsplan, planungsrechtliche Einordnung und Erschließung sein.',
        'Auch Baulasten, Leitungsrechte oder Wegerechte können eine Rolle spielen.',
        'Je nach Fall sind Bauamt, Baulastenverzeichnis oder weitere Stellen einzubeziehen.',
        'SLS bündelt vorhandene Informationen und zeigt, welche Punkte vor dem Abschluss noch geklärt werden sollten.'
      ]),
      next:nextAfterSpecific
    },

    docEnergy:{
      kicker:'Unterlagen · Energie',title:'Ist ein passender und gültiger Energieausweis vorhanden?',
      text:'Für viele Verkäufe müssen Energieangaben bereits in der Vermarktung berücksichtigt werden.',
      options:statusOptions(),
      explain:missingInfo('Ein vorhandener Energieausweis sollte auch tatsächlich verwertbar sein.',[
        'Zu prüfen ist, ob ein Ausweis erforderlich ist, welcher Typ passt und ob er noch gültig ist.',
        'Ein neuer Ausweis wird von entsprechend qualifizierten Ausstellern erstellt.',
        'SLS prüft, ob ein verwertbarer Ausweis vorliegt und weist auf fehlende Angaben hin.'
      ]),
      next:answers=> 'groundbook'
    },

    groundbook:{
      kicker:'Grundbuch · Inhalt', title:'Wissen Sie, was die Eintragungen in Abteilung II und III für Ihren Verkauf bedeuten?',
      text:'Der Auszug kann vorhanden sein – trotzdem müssen einzelne Rechte oder Grundschulden möglicherweise noch eingeordnet werden.',
      options:[
        ['yes','Ja, das ist geklärt','Ich kenne die relevanten Eintragungen und deren Bedeutung für den Verkauf.'],
        ['no','Nein','Ich habe die Eintragungen noch nicht geprüft.'],
        ['partly','Nur teilweise','Ich habe den Auszug, kann aber nicht alles sicher einordnen.']
      ],
      explain:{
        no:['Das sollte vor dem Notartermin geklärt werden.',['Nicht jede Eintragung verhindert einen Verkauf.','Je nach Eintragung können Eigentümer, Berechtigte, Banken und Notar beteiligt sein.','Bestehende Grundschulden können Löschungs- oder Ablösungsunterlagen erforderlich machen.']],
        partly:['Ein Grundbuchauszug allein beantwortet noch nicht jede Frage.',['Bei unklaren Rechten sollte frühzeitig geklärt werden, ob sie bestehen bleiben oder gelöscht werden sollen.','Rechtliche Einordnung gehört bei Bedarf in fachkundige Hände.']]
      },
      next:afterDocs
    },

    ownership:{
      kicker:'Eigentümer',title:'Gehört die Immobilie Ihnen allein?',
      text:'Mehrere Eigentümer, Erbengemeinschaften oder Vertretungen sollten früh im Ablauf berücksichtigt werden.',
      options:[
        ['single','Ja, mir allein','Ich bin alleiniger Eigentümer.'],
        ['multiple','Nein, mehrere Eigentümer','Zum Beispiel Ehepartner, Miteigentümer oder Erbengemeinschaft.'],
        ['represent','Ich handle für jemand anderen','Zum Beispiel mit Vollmacht oder als gesetzliche Vertretung.'],
        ['unknown','Unsicher','Ich weiß nicht, ob die Eigentümer- bzw. Vertretungssituation vollständig geklärt ist.']
      ],
      explain:{
        multiple:['Bei mehreren Eigentümern sollte die Entscheidungs- und Unterschriftssituation früh geklärt sein.',['Alle relevanten Eigentümer müssen in den Verkaufsprozess einbezogen werden.','Bei Erbfällen können zusätzliche Nachweise zur Erbfolge erforderlich sein.','Unterschiedliche Vorstellungen sollten möglichst vor Vermarktung und Preisverhandlung geklärt werden.']],
        represent:['Eine Vertretung sollte nicht erst kurz vor dem Notartermin geprüft werden.',['Je nach Situation kann eine besondere Form der Vollmacht erforderlich sein.','Die konkrete Verwendbarkeit einer Vollmacht sollte rechtzeitig mit dem Notariat abgestimmt werden.']],
        unknown:['Die Eigentümerstellung ist eine Grundvoraussetzung des Verkaufs.',['Prüfen Sie, wer im Grundbuch steht und wer wirksam handeln bzw. unterschreiben kann.']]
      },
      next:(answers,value)=> value==='multiple'||value==='represent'||value==='unknown'?'authority':'sellerLoan'
    },

    authority:{
      kicker:'Eigentümer · Vertretung',title:'Ist geklärt, wer Entscheidungen treffen und beim Notar wirksam handeln kann?',
      text:'Gerade bei mehreren Eigentümern, Erbfällen oder Vollmachten kann dieser Punkt den Ablauf stark beeinflussen.',
      options:statusOptions('Ja, geklärt','Nein, noch offen'),
      explain:missingInfo('Das sollte nicht erst am Tag der Beurkundung auffallen.',[
        'Bei Erbfällen können Erbnachweise oder weitere Unterlagen erforderlich sein.',
        'Bei Vertretung sollte die Vollmacht rechtzeitig auf ihre Eignung für den Grundstückskaufvertrag geprüft werden.',
        'Das Notariat kann die formalen Anforderungen für den konkreten Fall einordnen.'
      ]),
      next:()=> 'sellerLoan'
    },

    sellerLoan:{
      kicker:'Eigene Finanzierung',title:'Ist die Immobilie noch finanziert oder sind Grundschulden eingetragen?',
      text:'Auch die Finanzierung des Verkäufers kann für Ablösung, Löschung und Kaufpreisabwicklung wichtig werden.',
      options:[
        ['none','Nein / bereits geklärt','Es bestehen keine offenen Finanzierungsthemen.'],
        ['active','Ja, es läuft noch ein Darlehen','Es gibt noch eine Restschuld bei einer Bank.'],
        ['grundschuld','Grundschuld vorhanden, Darlehen unklar oder erledigt','Die Eintragung besteht noch, obwohl die Finanzierung möglicherweise beendet ist.'],
        ['unknown','Unsicher','Ich kenne den aktuellen Stand nicht genau.']
      ],
      explain:{
        active:['Eine laufende Finanzierung sollte früh in die Verkaufsabwicklung einbezogen werden.',['Die Bank kann für Ablösebetrag und Löschungsunterlagen benötigt werden.','Je nach Vertrag können Fragen zu Vorfälligkeit oder Ablösung entstehen.','Der Notar koordiniert die grundbuchrechtliche Abwicklung, benötigt dafür aber die richtigen Informationen.']],
        grundschuld:['Eine eingetragene Grundschuld verschwindet nicht automatisch nach Rückzahlung des Darlehens.',['Für eine lastenfreie Übertragung können Löschungsunterlagen erforderlich sein.','Frühzeitige Klärung verhindert Verzögerungen bei der Kaufpreisfälligkeit.']],
        unknown:['Hier lohnt sich eine Prüfung vor dem Notartermin.',['Grundbuch und Bankunterlagen sollten miteinander abgeglichen werden.']]
      },
      next:answers=> typeFromAnswers(answers)==='land'?'landRisks':'occupancy'
    },

    occupancy:{
      kicker:'Nutzung',title:'Wie wird die Immobilie aktuell genutzt?',
      text:'Ob selbst genutzt, leerstehend oder vermietet beeinflusst Unterlagen, Übergabe und Käuferfragen.',
      options:[
        ['owner','Selbst bewohnt','Ich bzw. meine Familie wohnen dort.'],
        ['vacant','Leerstehend','Die Immobilie ist derzeit frei.'],
        ['rented','Vermietet','Mindestens eine Einheit ist vermietet.'],
        ['mixed','Teilweise vermietet','Zum Beispiel bei einem Mehrfamilienhaus oder einer Einliegerwohnung.']
      ],
      next:(_,value)=> value==='rented'||value==='mixed'?'rental':'alterations'
    },

    rental:{
      kicker:'Vermietung',title:'Sind Mietverträge, Miethöhen, Kautionen und Abrechnungen sauber dokumentiert?',
      text:'Beim Verkauf einer vermieteten Immobilie übernimmt der Käufer grundsätzlich bestehende Mietverhältnisse mit.',
      options:statusOptions('Ja, vollständig','Nein, nicht vollständig'),
      explain:missingInfo('Bei vermieteten Immobilien braucht der Käufer eine belastbare wirtschaftliche Grundlage.',[
        'Typisch relevant sind Mietverträge, aktuelle Miethöhen, Kautionen und Nebenkostenunterlagen.',
        'Auch offene Streitpunkte, Rückstände oder vereinbarte Besonderheiten sollten sauber eingeordnet werden.',
        'Aussagen zu Kündigungsmöglichkeiten sollten nicht pauschal versprochen werden; im Zweifel rechtlich prüfen lassen.'
      ]),
      next:()=> 'alterations'
    },

    alterations:{
      kicker:'Baulicher Zustand',title:'Gab es Umbauten, Anbauten oder Nutzungsänderungen?',
      text:'Wintergarten, Dachausbau, Anbau oder umgenutzte Flächen können relevant sein, wenn Unterlagen und tatsächlicher Zustand nicht zusammenpassen.',
      options:[
        ['none','Nein / nichts Wesentliches','Mir sind keine relevanten Änderungen bekannt.'],
        ['documented','Ja, mit Unterlagen','Die Änderungen sind nach meiner Kenntnis dokumentiert bzw. genehmigt.'],
        ['unclear','Ja, aber Unterlagen sind unklar','Ich weiß nicht, ob alles vollständig dokumentiert ist.'],
        ['unknown','Unsicher','Ich kann das nicht sicher beurteilen.']
      ],
      explain:{
        unclear:['Das sollte vor der Vermarktung geprüft werden.',['Bauakte, Genehmigungen und heutiger Zustand sollten zueinander passen.','Nicht nachvollziehbare Wohn- oder Nutzflächen können Käufer und Finanzierung verunsichern.']],
        unknown:['Gerade bei älteren Immobilien lohnt sich der Abgleich mit vorhandenen Bauunterlagen.',['SLS kann auffällige Abweichungen in der Vorbereitung identifizieren und weitere Prüfung anstoßen.']]
      },
      next:answers=> ['house','investment','land'].includes(typeFromAnswers(answers))?'landRisks':'pv'
    },

    landRisks:{
      kicker:'Grundstück & öffentlich-rechtliche Themen',title:'Sind Baulasten, Erschließung und mögliche Altlastenthemen geklärt?',
      text:'Diese Punkte können Nutzung, Finanzierung oder Kaufentscheidung beeinflussen und sind nicht immer aus dem Grundbuch ersichtlich.',
      options:statusOptions('Ja, weitgehend geklärt','Nein / noch offen'),
      explain:missingInfo('Nicht alle Grundstücksthemen stehen im Grundbuch.',[
        'Baulasten werden in einem eigenen Verzeichnis geführt.',
        'Auch Erschließungsstand oder noch mögliche Beiträge können für Käufer relevant sein.',
        'Hinweise auf Altlasten oder frühere gewerbliche Nutzung sollten bei Bedarf geprüft werden.',
        'Welche Auskünfte sinnvoll sind, hängt von Lage, Nutzung und Objektart ab.'
      ]),
      next:answers=> typeFromAnswers(answers)==='land'?afterSpecials(answers):'pv'
    },

    pv:{
      kicker:'Technik & mitverkaufte Anlagen',title:'Gibt es eine Photovoltaikanlage oder andere mitzuübertragende Technik?',
      text:'Eigentum, Finanzierung, Miet- oder Pachtmodelle und laufende Verträge sollten vor dem Verkauf klar sein.',
      options:[
        ['none','Nein','Es gibt keine entsprechende Anlage.'],
        ['owned','Ja, im Eigentum und geklärt','Die Anlage gehört zum Objekt und die Unterlagen liegen vor.'],
        ['financed','Ja, noch finanziert / Vertrag läuft','Es bestehen noch Finanzierung, Miet-, Pacht- oder andere Vertragsbindungen.'],
        ['unknown','Unsicher','Ich kenne die Vertrags- oder Eigentumssituation nicht genau.']
      ],
      explain:{
        financed:['Laufende Verträge sollten vor dem Verkauf eingeordnet werden.',['Zu klären ist, ob Verträge beendet, übertragen oder vom Käufer übernommen werden können.','Bei PV können zusätzlich Einspeise- und technische Unterlagen relevant sein.']],
        unknown:['Technik am Gebäude ist nicht automatisch frei übertragbar.',['Eigentum, Finanzierung und laufende Verträge sollten vor dem Notartermin nachvollziehbar sein.']]
      },
      next:afterSpecials
    },

    market:{
      kicker:'Vermarktung', title:'Wer kümmert sich während der Vermarktung um Anfragen, Besichtigungen und Nachfassen?',
      text:'Ein Interessent entscheidet selten in einem einzigen Gespräch.',
      options:[
        ['self','Ich selbst','Ich möchte Anfragen und Termine selbst koordinieren.'],
        ['help','Das soll professionell begleitet werden','Erreichbarkeit, Vorauswahl und Nachhalten sollen strukturiert erfolgen.'],
        ['open','Noch offen','Ich habe dafür noch keinen festen Ablauf.']
      ],
      explain:{
        self:['Planen Sie nicht nur die Besichtigung, sondern auch alles danach.',['Wer beantwortet Rückfragen zu Unterlagen?','Wer erkennt, ob ein Interessent wirklich weiter im Prozess ist?','Wer hält nach, wenn Finanzierung oder Zweitbesichtigung noch offen sind?']],
        open:['Eine klare Zuständigkeit verhindert, dass gute Interessenten verloren gehen.',['Anfragen sollten zeitnah qualifiziert werden.','Rückmeldungen nach Besichtigungen helfen bei der Preis- und Vermarktungsstrategie.']]
      },
      next:()=> 'summaryPrep'
    },

    qualification:{
      kicker:'Interessent', title:'Wie konkret ist der vorhandene Interessent bereits?',
      text:'Zwischen „gefällt mir“ und einer belastbaren Kaufentscheidung liegen oft mehrere Prüfungen.',
      options:[
        ['viewed','Besichtigung erfolgt','Es gibt Interesse, aber noch keine verbindliche Einigung.'],
        ['offer','Kaufpreis ist besprochen','Die wesentlichen wirtschaftlichen Eckpunkte sind grundsätzlich geklärt.'],
        ['finance','Finanzierung wird gerade geprüft','Der Interessent arbeitet bereits mit Bank oder Finanzierungspartner.'],
        ['unknown','Das weiß ich nicht sicher','Ich kann den Stand noch nicht belastbar einordnen.']
      ],
      next:()=> 'finance'
    },

    finance:{
      kicker:'Finanzierung & Bonität', title:'Liegt bereits ein Finanzierungsnachweis des Käufers vor?',
      text:'Eine mündliche Aussage oder eine vorläufige Finanzierungsbestätigung ist noch nicht dasselbe wie eine abschließende, belastbare Finanzierungszusage.',
      options:[
        ['yes','Ja, es liegt etwas vor','Ich habe eine schriftliche Bestätigung bzw. einen Nachweis gesehen.'],
        ['promise','Nur eine mündliche Zusage','Der Käufer sagt, die Finanzierung sei kein Problem.'],
        ['pending','Noch in Prüfung','Bank oder Finanzierungspartner prüft noch.'],
        ['unknown','Ich weiß nicht, was ausreicht','Ich kann die vorhandenen Nachweise nicht einordnen.']
      ],
      explain:{
        promise:['Eine mündliche Zusage ist keine abschließende Finanzierungsbestätigung.',['Vor einem Notartermin sollte die Kaufpreisfinanzierung belastbar geprüft sein.','Je nach Fall können zusätzlich Eigenkapitalnachweise oder weitere Unterlagen erforderlich sein.']],
        pending:['Solange die Finanzierung offen ist, sollte ein Notartermin mit besonderer Vorsicht vorbereitet werden.',['Die Bank prüft nicht nur den Käufer, sondern regelmäßig auch die Immobilie als Beleihungsobjekt.','Fehlende oder veraltete Objektunterlagen können die Prüfung verzögern.']],
        unknown:['Nicht jeder Finanzierungsnachweis hat dieselbe Aussagekraft.',['Entscheidend ist, ob die Bank ihre Kreditentscheidung bereits abschließend getroffen hat oder ob noch Bedingungen offen sind.']]
      },
      next:(answers,value)=> value==='yes'?'financeType':(answers.start==='interest'?'summaryInterest':'notaryRisk')
    },

    financeType:{
      kicker:'Finanzierung · Qualität der Zusage',title:'Welche Art von Finanzierungsbestätigung liegt tatsächlich vor?',
      text:'Für den Verkäufer ist entscheidend, ob die Bank bereits abschließend zugesagt hat oder ob die Bestätigung noch unter Vorbehalten steht.',
      options:[
        ['final','Uneingeschränkte / finale Zusage','Die Bank hat die Finanzierung nach meiner Kenntnis abschließend bestätigt.'],
        ['preliminary','Vorläufige Bestätigung','Es handelt sich um ein Finanzierungszertifikat, eine Vorprüfung oder eine Zusage unter Bedingungen.'],
        ['conditional','Zusage mit offenen Bedingungen','Es fehlen noch Unterlagen oder die Bank hat weitere Voraussetzungen genannt.'],
        ['unknown','Kann ich nicht sicher unterscheiden','Ich weiß nicht, ob die Bestätigung wirklich abschließend ist.']
      ],
      explain:{
        final:['Auch eine finale Zusage sollte inhaltlich genau geprüft werden.',['Eine abschließende Immobilienfinanzierung setzt regelmäßig voraus, dass die Bank Käufer und Beleihungsobjekt geprüft hat.','Dafür werden aktuelle Objektunterlagen benötigt; Umfang und Anforderungen unterscheiden sich je nach Bank und Einzelfall.','Aktueller Grundbuchauszug, aktuelle Flurkarte und ein verwertbarer Energieausweis gehören heute häufig zu den zentralen Objektunterlagen.']],
        preliminary:['Eine vorläufige Bestätigung ist noch keine abschließende Kreditzusage.',['Sie kann zeigen, dass die Finanzierung grundsätzlich plausibel erscheint.','Solange Objektprüfung oder Unterlagenprüfung noch offen sind, kann sich die Bankentscheidung noch ändern.','Für den Verkäufer sollte das nicht wie eine uneingeschränkte Zusage behandelt werden.']],
        conditional:['Offene Bedingungen sind ein klares Signal, dass die Finanzierung noch nicht vollständig abgeschlossen ist.',['Prüfen Sie genau, welche Unterlagen oder Voraussetzungen noch fehlen.','Aktuelle Objektunterlagen können für die finale Beleihungsprüfung entscheidend sein.']],
        unknown:['Im Zweifel sollte die Bestätigung vor dem Notartermin eingeordnet werden.',['Wichtig ist die Frage, ob noch Vorbehalte, Objektprüfung oder Unterlagenanforderungen offen sind.','SLS kann die vorhandenen Nachweise mit Käufer und Finanzierungspartner strukturiert nachhalten.']]
      },
      next:answers=> answers.start==='interest'?'summaryInterest':'notaryRisk'
    },

    notaryRisk:{
      kicker:'Notar · Kostenrisiko',title:'Ist Ihnen das Risiko eines Notartermins bei ungeklärter Finanzierung bewusst?',
      text:'Auch wenn im Kaufvertrag vereinbart wird, dass der Käufer die Notar- und Grundbuchkosten trägt, sollte die Finanzierung möglichst vor der Beurkundung belastbar geklärt sein.',
      options:[
        ['yes','Ja, das ist mir bewusst','Ich möchte den Notartermin erst mit belastbarer Finanzierung angehen.'],
        ['no','Nein, das war mir nicht klar','Ich bin davon ausgegangen, dass bei einem Scheitern nur der Käufer betroffen ist.'],
        ['unsure','Unsicher','Ich weiß nicht, wer bei einem gescheiterten Kauf Kosten tragen muss.']
      ],
      explain:{
        no:['Ein geplatzter Kauf nach Beurkundung kann auch für den Verkäufer unangenehme Folgen haben.',['Die vertragliche Vereinbarung, dass der Käufer Kosten trägt, ist nicht gleichbedeutend damit, dass gegenüber dem Notar ausschließlich der Käufer Kostenschuldner sein kann.','Je nach rechtlicher Konstellation können mehrere Beteiligte als Kostenschuldner in Betracht kommen.','Deshalb ist eine belastbare Finanzierungsprüfung vor der Beurkundung auch für den Verkäufer ein wichtiger Schutz.']],
        unsure:['Kostenfragen sollten nicht erst geklärt werden, wenn der Kauf bereits gescheitert ist.',['Wer die Kosten im Innenverhältnis tragen soll und wer gegenüber dem Notar gesetzlich in Anspruch genommen werden kann, sind unterschiedliche Fragen.','Der konkrete Einzelfall gehört bei Bedarf zum Notar oder in rechtliche Beratung.']]
      },
      next:()=> 'notary'
    },

    notary:{
      kicker:'Notarvorbereitung', title:'Sind die wirtschaftlichen Eckpunkte für den Vertragsentwurf bereits vollständig geklärt?',
      text:'Dazu gehören Kaufpreis, Vertragsparteien, Finanzierung, Übergabe sowie bekannte Besonderheiten des Objekts.',
      options:[
        ['yes','Ja, weitgehend','Die wesentlichen Absprachen stehen.'],
        ['partly','Teilweise','Einige Punkte sind noch offen.'],
        ['no','Noch nicht','Ich weiß noch nicht, was der Notar benötigt.']
      ],
      explain:{
        partly:['Offene Punkte sollten möglichst vor dem Beurkundungstermin geklärt werden.',['Übergabetermin und Inventar','Grundschulden oder weitere Rechte','Finanzierung und benötigte Bankunterlagen']],
        no:['Der Notar beurkundet – aber der Verkauf muss vorher wirtschaftlich vorbereitet sein.',['Für den Vertragsentwurf werden Daten beider Parteien und Objektangaben benötigt.','Der Notar ist neutral und ersetzt nicht die wirtschaftliche Entscheidung von Käufer oder Verkäufer.']]
      },
      next:()=> 'earlyAccess'
    },

    earlyAccess:{
      kicker:'Vor der Übergabe',title:'Möchte der Käufer schon vor Kaufpreiszahlung Schlüssel, Zugang oder mit Renovierungen beginnen?',
      text:'Ein früher Besitz- oder Schlüsselübergang sollte nicht informell „auf Zuruf“ erfolgen.',
      options:[
        ['no','Nein','Der Zugang soll erst entsprechend der vertraglichen Abwicklung erfolgen.'],
        ['yes','Ja','Der Käufer möchte früher hinein oder schon Arbeiten durchführen.'],
        ['unknown','Noch nicht besprochen','Das Thema wurde bislang nicht geklärt.']
      ],
      explain:{
        yes:['Hier sollte nicht einfach vorzeitig übergeben werden.',['Risiken zu Besitz, Schäden, Versicherung und Rückabwicklung sollten vorher sauber geregelt sein.','Eine vorzeitige Nutzung oder Schlüsselübergabe sollte mit dem Notariat bzw. rechtlich abgestimmt werden.']],
        unknown:['Der Übergabezeitpunkt sollte ausdrücklich besprochen werden.',['So vermeiden Sie unterschiedliche Erwartungen unmittelbar nach der Beurkundung.']]
      },
      next:()=> 'payment'
    },

    payment:{
      kicker:'Nach der Beurkundung', title:'Ist Ihnen klar, was zwischen Notartermin, Kaufpreiszahlung und Übergabe passiert?',
      text:'Diese drei Ereignisse fallen in der Regel nicht auf denselben Tag.',
      options:[
        ['yes','Ja','Der Ablauf und die Bedingungen sind mir klar.'],
        ['partly','Teilweise','Ich kenne die Schritte nur grob.'],
        ['no','Nein','Ich möchte wissen, wann gezahlt und wann übergeben wird.']
      ],
      explain:{
        partly:['Nach der Beurkundung läuft die Abwicklung weiter.',['Der Notar veranlasst die vertraglich vorgesehenen Schritte.','Die Kaufpreisfälligkeit wird erst ausgelöst, wenn die vereinbarten Voraussetzungen erfüllt sind.','Die Übergabe sollte entsprechend dem Vertrag und dokumentiert erfolgen.']],
        no:['Die Unterschrift beim Notar ist noch nicht die Übergabe.',['Kaufpreisfälligkeit, Zahlungseingang und Besitzübergang müssen sauber aufeinander abgestimmt werden.','Schlüssel, Zählerstände und Unterlagen sollten bei der Übergabe dokumentiert werden.']]
      },
      next:()=> 'handover'
    },

    handover:{
      kicker:'Übergabe',title:'Ist eine dokumentierte Übergabe vorbereitet?',
      text:'Schlüssel, Zählerstände, Unterlagen und der tatsächliche Übergabezeitpunkt sollten nachvollziehbar festgehalten werden.',
      options:statusOptions('Ja, vorbereitet','Nein, noch offen'),
      explain:missingInfo('Auch nach der Kaufpreiszahlung sollte die Übergabe strukturiert erfolgen.',[
        'Typisch sind Übergabeprotokoll, Schlüsselübersicht und Zählerstände.',
        'Der Übergabezeitpunkt sollte zur vertraglichen Regelung passen.',
        'SLS bereitet die Übergabe strukturiert vor und begleitet den Termin.'
      ]),
      next:()=> 'summaryBuyer'
    },

    summaryPrep:summary('Vorbereitung','Sie haben jetzt einen deutlich genaueren Überblick über Ihre Verkaufsvorbereitung.','Neben Vermarktung und Interessentenmanagement haben Sie auch die für Ihren Immobilientyp relevanten Unterlagen einzeln geprüft.'),
    summaryInterest:summary('Interessent vorhanden','Der Interessent ist nur ein Teil des nächsten Schritts.','Unterlagen, Grundbuch und Finanzierung sollten jetzt parallel belastbar werden, bevor aus Interesse ein Notartermin wird.'),
    summaryBuyer:summary('Konkreter Käufer','Jetzt geht es um einen sauberen und belastbaren Abschluss.','Auch mit gefundenem Käufer müssen Objektunterlagen, Grundbuch, Finanzierung, Notardaten, Kaufpreisfälligkeit und Übergabe strukturiert zusammengeführt werden.')
  };

  function typeQuestion(){
    return {
      kicker:'Immobilientyp',title:'Welche Immobilie möchten Sie verkaufen?',text:'Damit wir nur die Unterlagen und Schritte anzeigen, die zu Ihrem Objekt passen.',
      options:[
        ['house','Haus','Einfamilienhaus, Doppelhaushälfte oder Reihenhaus'],
        ['apartment','Eigentumswohnung','Wohnung innerhalb einer WEG'],
        ['investment','Mehrfamilienhaus','Mehrere Einheiten oder Anlageobjekt'],
        ['land','Grundstück','Unbebaut oder mit Entwicklungs-/Baupotenzial']
      ],
      next:()=> 'docsIntro'
    };
  }

  function summary(k,t,b){
    return {kicker:k,title:t,text:b,summary:true,options:[],next:null};
  }

  const todoDefinitions = {
    docGrundbuch:{label:'Aktuellen Grundbuchauszug beschaffen / prüfen',critical:true,phase:'marketing'},
    docFlur:{label:'Aktuelle Flurkarte / Grundstücksangaben klären',critical:true,phase:'marketing'},
    docPlans:{label:'Grundrisse und Flächenangaben nachvollziehbar machen',critical:false,phase:'marketing'},
    docApartment:{label:'WEG-Unterlagen vervollständigen',critical:false,phase:'marketing'},
    docInvestment:{label:'Miet- und Ertragsunterlagen vervollständigen',critical:false,phase:'marketing'},
    docLand:{label:'Bebaubarkeit / Grundstücksnutzung klären',critical:false,phase:'marketing'},
    docEnergy:{label:'Gültigen Energieausweis bereitstellen',critical:true,phase:'marketing'},
    groundbook:{label:'Eintragungen in Abteilung II und III klären',critical:true,phase:'notary'},
    ownership:{label:'Eigentümer- und Beteiligtenstellung klären',critical:true,phase:'marketing'},
    authority:{label:'Vertretung / Vollmacht / Erbnachweis klären',critical:true,phase:'notary'},
    sellerLoan:{label:'Eigene Finanzierung / Grundschuld / Ablösung klären',critical:true,phase:'notary'},
    rental:{label:'Mietunterlagen und laufende Mietthemen aufbereiten',critical:false,phase:'marketing'},
    alterations:{label:'Umbauten / Genehmigungen / Bauunterlagen prüfen',critical:true,phase:'marketing'},
    landRisks:{label:'Baulasten, Erschließung und Altlastenthemen prüfen',critical:true,phase:'marketing'},
    pv:{label:'PV / Technik / laufende Verträge klären',critical:false,phase:'notary'},
    qualification:{label:'Interessentenstatus belastbar einordnen',critical:false,phase:'notary'},
    finance:{label:'Finanzierung des Käufers belastbar prüfen',critical:true,phase:'notary'},
    financeType:{label:'Uneingeschränkte Finanzierungszusage sicherstellen',critical:true,phase:'notary'},
    notary:{label:'Offene Punkte für den Notar klären',critical:true,phase:'notary'},
    earlyAccess:{label:'Vorzeitigen Schlüssel- oder Nutzungswunsch klären',critical:true,phase:'handover'},
    payment:{label:'Kaufpreisfälligkeit und Übergabeablauf klären',critical:false,phase:'handover'},
    handover:{label:'Dokumentierte Übergabe vorbereiten',critical:false,phase:'handover'}
  };

  const buildTodoList = () => {
    const missing=[]; const unsure=[];
    Object.entries(todoDefinitions).forEach(([id,def])=>{
      const value=answers[id];
      if(!value)return;
      let isMissing = value==='no' || value==='promise' || value==='pending' || value==='preliminary' || value==='conditional' || value==='partly' || value==='open';
      let isUnsure = value==='unknown' || value==='unsure';
      if(id==='finance' && value==='yes') return;
      if(id==='financeType' && value==='final') return;
      if(id==='qualification' && ['viewed','offer','finance'].includes(value)) return;
      if(id==='ownership' && value==='single') return;
      if(id==='authority' && value==='yes') return;
      if(id==='sellerLoan' && value==='none') return;
      if(id==='rental' && value==='yes') return;
      if(id==='alterations' && ['none','documented'].includes(value)) return;
      if(id==='landRisks' && value==='yes') return;
      if(id==='pv' && ['none','owned'].includes(value)) return;
      if(id==='earlyAccess' && value==='no') return;
      if(id==='notary' && value==='yes') return;
      if(id==='payment' && value==='yes') return;
      if(id==='handover' && value==='yes') return;
      if(id==='groundbook' && value==='yes') return;
      if(isMissing) missing.push({...def,id});
      else if(isUnsure) unsure.push({...def,id});
    });
    return {missing,unsure};
  };

  const renderSummary = q => {
    const {missing,unsure}=buildTodoList();
    const rows = (items,kind) => items.map(item =>
      '<li class="sales-summary-item sales-summary-'+kind+'"><span aria-hidden="true">'+(kind==='critical'?'!':'?')+'</span><div><strong>'+item.label+'</strong><small>'+(kind==='critical'?(item.critical?'Vor dem nächsten großen Schritt möglichst klären.':'Noch offen und zu klären.'):'Noch nicht eindeutig geklärt.')+'</small></div></li>'
    ).join('');

    const all=[...missing.map(x=>({...x,status:x.critical?'critical':'open'})),...unsure.map(x=>({...x,status:'unsure'}))];
    const phaseLabels={marketing:'Vor der Vermarktung klären',notary:'Vor dem Notartermin klären',handover:'Vor der Übergabe klären'};
    let html='<div class="sales-summary">';
    html+='<div class="sales-summary-lead"><h3>Ihre nächsten Schritte</h3><p>Aus Ihren Antworten ergibt sich diese persönliche Übersicht – sortiert danach, wann die Punkte relevant werden.</p></div>';

    if(!all.length){
      html+='<div class="sales-summary-good"><strong>Die abgefragten Punkte wirken derzeit weitgehend geklärt.</strong><p>Vor Vermarktung oder Beurkundung sollten Unterlagen und Nachweise trotzdem noch einmal auf Aktualität und Vollständigkeit geprüft werden.</p></div>';
    } else {
      ['marketing','notary','handover'].forEach(phase=>{
        const phaseItems=all.filter(x=>x.phase===phase);
        if(!phaseItems.length)return;
        html+='<div class="sales-summary-block sales-summary-phase"><h4>'+phaseLabels[phase]+'</h4><ul>';
        html+=phaseItems.map(item =>
          '<li class="sales-summary-item sales-summary-'+item.status+'"><span aria-hidden="true">'+(item.status==='critical'?'!':item.status==='unsure'?'?':'•')+'</span><div><strong>'+item.label+'</strong><small>'+(item.status==='critical'?'Besonders wichtig – möglichst vor dem nächsten Schritt klären.':item.status==='unsure'?'Noch nicht eindeutig geklärt.':'Noch offen und zu klären.')+'</small>'+siaButton(item.id)+'</div></li>'
        ).join('');
        html+='</ul></div>';
      });
    }

    if(['buyer','interest'].includes(answers.start)){
      html+='<div class="sales-summary-finance"><strong>Zur Finanzierung</strong><p>Eine vorläufige Finanzierungsbestätigung oder eine Zusage unter Bedingungen ist nicht mit einer uneingeschränkten, abschließenden Kreditzusage gleichzusetzen. Für die finale Objektprüfung verlangen Banken regelmäßig aktuelle Objektunterlagen; welche Unterlagen konkret erforderlich sind, hängt von Bank und Einzelfall ab.</p></div>';
    }

    html+='<div class="sales-summary-note"><strong>Hinweis zum Notartermin</strong><p>Die interne Vereinbarung, dass der Käufer Notar- und Grundbuchkosten trägt, bedeutet nicht in jedem Fall, dass gegenüber dem Notar ausschließlich der Käufer als Kostenschuldner in Betracht kommt. Deshalb sollte die Finanzierung möglichst vor der Beurkundung belastbar geprüft sein. Rechtliche Einzelfragen bitte mit dem Notar oder einer Rechtsberatung klären.</p></div>';
    html+='<p class="sales-summary-cta"><a class="text-link" href="/kontakt/">Verkauf mit SLS besprechen →</a></p></div>';
    explainer.innerHTML=html;
  };

  let current='start', history=[], answers={}, selected=null;
  let autoTimer=null;

  const render = () => {
    const q=questions[current];
    stepLabel.textContent = q.summary ? 'Ihre Einordnung' : 'Schritt ' + (history.length + 1);
    progress.style.width = Math.min(100, q.summary ? 100 : 8 + history.length * 8) + '%';
    kicker.textContent=q.kicker; title.textContent=q.title; text.textContent=q.text;
    options.innerHTML=''; explainer.hidden=true; explainer.innerHTML=''; selected=answers[current] || null;

    q.options.forEach(([value,label,small])=>{
      const b=document.createElement('button');
      b.type='button'; b.className='sales-wizard-option'; b.dataset.value=value;
      b.setAttribute('aria-pressed',String(selected===value));
      b.innerHTML='<span>'+label+'</span>'+(small?'<small>'+small+'</small>':'');
      b.addEventListener('click',()=>select(value));
      options.appendChild(b);
    });

    back.disabled=history.length===0;
    next.hidden=q.summary || !selected;
    next.textContent=q.summary?'':'Weiter →';

    if(q.summary){
      explainer.hidden=false;
      renderSummary(q);
    } else if(selected) showExplain(q,selected);
  };

  const showExplain=(q,value)=>{
    const info=q.explain?.[value];
    if(!info){explainer.hidden=true;explainer.innerHTML='';return}
    explainer.hidden=false;
    explainer.innerHTML='<h3>'+info[0]+'</h3>'+(info[1]?.length?'<ul>'+info[1].map(x=>'<li>'+x+'</li>').join('')+'</ul>':'')+siaButton(current);
  };

  const select=value=>{
    if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}
    selected=value;
    answers[current]=value;
    [...options.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===value)));

    const q=questions[current];
    const hasInfo=Boolean(q.explain?.[value]);

    showExplain(q,value);

    if(hasInfo){
      next.hidden=false;
      return;
    }

    next.hidden=true;
    autoTimer=setTimeout(()=>{
      autoTimer=null;
      goNext();
    },260);
  };

  const goNext=()=>{
    if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}
    const q=questions[current];
    if(!selected||!q.next)return;
    history.push(current);
    const nextId=typeof q.next==='function'?q.next(answers,selected):q.next;
    current=nextId;
    selected=answers[current]||null;
    render();
    root.scrollIntoView({behavior:'smooth',block:'start'});
  };

  const goBack=()=>{
    if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}
    if(!history.length)return;
    current=history.pop();
    selected=answers[current]||null;
    render();
    root.scrollIntoView({behavior:'smooth',block:'start'});
  };

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-sia-question]');
    if (!button) return;
    const question = button.dataset.siaQuestion || '';
    if (!question) return;
    window.__slsSiaQuestionRequested = question;
    window.dispatchEvent(new CustomEvent('sls:sia-ask',{detail:{question}}));
  });

  next.addEventListener('click',goNext);
  back.addEventListener('click',goBack);
  render();
})();