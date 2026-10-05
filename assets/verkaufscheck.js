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

  const afterDocs = answers =>
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
    docGrundbuch:{label:'Aktueller Grundbuchauszug',critical:true},
    docFlur:{label:'Aktuelle Flurkarte / Grundstücksangaben',critical:true},
    docPlans:{label:'Grundrisse und Flächenangaben',critical:false},
    docApartment:{label:'WEG-Unterlagen',critical:false},
    docInvestment:{label:'Miet- und Ertragsunterlagen',critical:false},
    docLand:{label:'Bebaubarkeit / Grundstücksnutzung',critical:false},
    docEnergy:{label:'Gültiger Energieausweis',critical:true},
    groundbook:{label:'Eintragungen in Abteilung II und III klären',critical:true},
    qualification:{label:'Interessentenstatus belastbar einordnen',critical:false},
    finance:{label:'Finanzierung des Käufers belastbar prüfen',critical:true},
    financeType:{label:'Uneingeschränkte Finanzierungszusage sicherstellen',critical:true},
    notary:{label:'Offene Punkte für den Notar klären',critical:true},
    payment:{label:'Kaufpreisfälligkeit und Übergabeablauf klären',critical:false},
    handover:{label:'Dokumentierte Übergabe vorbereiten',critical:false}
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

    const criticalMissing=missing.filter(x=>x.critical);
    const normalMissing=missing.filter(x=>!x.critical);
    let html='<div class="sales-summary">';
    html+='<div class="sales-summary-lead"><h3>Ihre nächsten Schritte</h3><p>Aus Ihren Antworten ergibt sich diese persönliche Übersicht.</p></div>';

    if(!missing.length && !unsure.length){
      html+='<div class="sales-summary-good"><strong>Die abgefragten Punkte wirken derzeit weitgehend geklärt.</strong><p>Vor Vermarktung oder Beurkundung sollten Unterlagen und Nachweise trotzdem noch einmal auf Aktualität und Vollständigkeit geprüft werden.</p></div>';
    } else {
      if(criticalMissing.length) html+='<div class="sales-summary-block"><h4>Besonders wichtig</h4><ul>'+rows(criticalMissing,'critical')+'</ul></div>';
      if(normalMissing.length) html+='<div class="sales-summary-block"><h4>Noch offen</h4><ul>'+rows(normalMissing,'open')+'</ul></div>';
      if(unsure.length) html+='<div class="sales-summary-block"><h4>Noch unsicher</h4><ul>'+rows(unsure,'unsure')+'</ul></div>';
    }

    if(['buyer','interest'].includes(answers.start)){
      html+='<div class="sales-summary-finance"><strong>Zur Finanzierung</strong><p>Eine vorläufige Finanzierungsbestätigung oder eine Zusage unter Bedingungen ist nicht mit einer uneingeschränkten, abschließenden Kreditzusage gleichzusetzen. Für die finale Objektprüfung verlangen Banken regelmäßig aktuelle Objektunterlagen; welche Unterlagen konkret erforderlich sind, hängt von Bank und Einzelfall ab.</p></div>';
    }

    html+='<div class="sales-summary-note"><strong>Hinweis zum Notartermin</strong><p>Die interne Vereinbarung, dass der Käufer Notar- und Grundbuchkosten trägt, bedeutet nicht in jedem Fall, dass gegenüber dem Notar ausschließlich der Käufer als Kostenschuldner in Betracht kommt. Deshalb sollte die Finanzierung möglichst vor der Beurkundung belastbar geprüft sein. Rechtliche Einzelfragen bitte mit dem Notar oder einer Rechtsberatung klären.</p></div>';
    html+='<p class="sales-summary-cta"><a class="text-link" href="/kontakt/">Verkauf mit SLS besprechen →</a></p></div>';
    explainer.innerHTML=html;
  };

  let current='start', history=[], answers={}, selected=null;

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
    explainer.innerHTML='<h3>'+info[0]+'</h3>'+(info[1]?.length?'<ul>'+info[1].map(x=>'<li>'+x+'</li>').join('')+'</ul>':'');
  };

  const select=value=>{
    selected=value;
    answers[current]=value;
    [...options.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===value)));
    showExplain(questions[current],value);
    next.hidden=false;
  };

  const goNext=()=>{
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
    if(!history.length)return;
    current=history.pop();
    selected=answers[current]||null;
    render();
    root.scrollIntoView({behavior:'smooth',block:'start'});
  };

  next.addEventListener('click',goNext);
  back.addEventListener('click',goBack);
  render();
})();