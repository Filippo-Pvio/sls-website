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
      next:value=> value==='buyer'?'typeBuyer':value==='interest'?'typeInterest':'typePrep'
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
      kicker:'Unterlagen · Grundstück',title:'Liegen Flurkarte und belastbare Grundstücksangaben vor?',
      text:'Flurstück, Grundstücksgröße und Zuschnitt sollten eindeutig zum Objekt passen.',
      options:statusOptions(),
      explain:missingInfo('Diese Angaben gehören zu den zentralen Objektgrundlagen.',[
        'Woher? Je nach Unterlage über Kataster- bzw. Vermessungsstellen oder vorhandene Eigentümerunterlagen.',
        'Warum wichtig? Käufer und Finanzierung benötigen nachvollziehbare Grundstücksdaten.',
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
      kicker:'Finanzierung & Bonität', title:'Liegt bereits ein belastbarer Finanzierungsnachweis vor?',
      text:'Eine mündliche Kaufzusage ist noch kein Nachweis dafür, dass der Kaufpreis tatsächlich finanziert werden kann.',
      options:[
        ['yes','Ja','Eine belastbare Bestätigung bzw. ein nachvollziehbarer Nachweis liegt vor.'],
        ['promise','Nur eine mündliche Zusage','Der Käufer sagt, die Finanzierung sei kein Problem.'],
        ['pending','Noch in Prüfung','Bank oder Finanzierungspartner prüft noch.'],
        ['unknown','Ich weiß nicht, was ausreicht','Ich kann die vorhandenen Nachweise nicht einordnen.']
      ],
      explain:{
        promise:['Eine Zusage allein reicht für die Vorbereitung des Abschlusses nicht aus.',['Vor einem Notartermin sollte die Kaufpreisfinanzierung nachvollziehbar sein.','Je nach Fall können Finanzierungsbestätigung und Eigenkapitalnachweise eine Rolle spielen.']],
        pending:['Solange die Finanzierung offen ist, sollte auch der nächste Schritt bewusst gesteuert werden.',['Offene Bankunterlagen können den Zeitplan verändern.','SLS hält solche Punkte mit Käufer und Finanzierungspartner nach.']],
        unknown:['Nicht jeder Nachweis hat dieselbe Aussagekraft.',['Entscheidend ist, ob der Kaufpreis realistisch und belastbar darstellbar ist.']]
      },
      next:answers=> answers.start==='interest'?'summaryInterest':'notary'
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
      explainer.innerHTML='<h3>Was bedeutet das für Sie?</h3><p>'+q.text+'</p><ul><li>Offene Unterlagen und Objektfragen früh klären</li><li>Käufer- und Notarprozess nicht erst am Ende organisieren</li><li>Bei Bedarf SLS die Beschaffung und Koordination übernehmen lassen</li></ul><p style="margin-top:14px"><a class="text-link" href="/kontakt/">Verkauf mit SLS besprechen →</a></p>';
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