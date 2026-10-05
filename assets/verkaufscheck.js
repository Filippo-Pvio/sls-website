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
      next:value=> value==='buyer'?'typeBuyer':value==='interest'?'typeInterest':value==='noBuyer'?'typePrep':'typePrep'
    },
    typePrep: typeQuestion('Vorbereitung'),
    typeInterest: typeQuestion('Interessent'),
    typeBuyer: typeQuestion('Käufer'),
    docs: {
      kicker:'Unterlagen', title:'Wie vollständig sind Ihre Verkaufsunterlagen?',
      text:'Dazu gehören je nach Immobilie z. B. Grundbuchauszug, Grundrisse, Flächenangaben, Energieausweis und bei Wohnungen WEG-Unterlagen.',
      options:[
        ['complete','Weitgehend vollständig','Die wichtigsten Unterlagen liegen vor und sind aktuell.'],
        ['gaps','Es fehlen Unterlagen','Ich weiß bereits, dass einzelne Dokumente beschafft werden müssen.'],
        ['unknown','Ich weiß es nicht genau','Ich kann nicht sicher beurteilen, was tatsächlich benötigt wird.']
      ],
      explain:{
        gaps:['Fehlende Unterlagen sind normal – entscheidend ist, sie früh zu erkennen.',['Grundbuch und Kataster können eigene Beschaffungswege haben.','Bei Wohnungen kommen häufig Verwaltung und WEG-Unterlagen hinzu.','Unklare Wohnflächen oder alte Grundrisse sollten vor der Vermarktung geprüft werden.']],
        unknown:['Genau hier beginnt eine strukturierte Verkaufsvorbereitung.',['Nicht jede Immobilie benötigt dieselben Unterlagen.','SLS prüft zunächst den vorhandenen Bestand und identifiziert die Lücken.']]
      },
      next:()=> 'groundbook'
    },
    groundbook:{
      kicker:'Grundbuch', title:'Wissen Sie, was in Abteilung II und III Ihres Grundbuchs steht?',
      text:'Dort können Rechte, Belastungen und Grundpfandrechte eingetragen sein, die für den Verkauf relevant werden.',
      options:[
        ['yes','Ja, das ist geklärt','Ich kenne die relevanten Eintragungen.'],
        ['no','Nein','Ich habe mich damit noch nicht beschäftigt.'],
        ['partly','Nur teilweise','Ich habe den Auszug, kann die Eintragungen aber nicht sicher einordnen.']
      ],
      explain:{
        no:['Das sollte vor dem Notartermin geklärt werden.',['Abteilung II kann z. B. Wohnrechte, Nießbrauch oder Wegerechte enthalten.','Abteilung III enthält typischerweise Grundpfandrechte wie Grundschulden.','Bestehende Rechte bedeuten nicht automatisch, dass ein Verkauf unmöglich ist – sie müssen aber eingeordnet werden.']],
        partly:['Ein Grundbuchauszug allein beantwortet noch nicht jede Frage.',['Bei unklaren Rechten können weitere Beteiligte wie Bank, Berechtigte oder Notar relevant werden.','Rechtliche Einordnung gehört bei Bedarf in fachkundige Hände.']]
      },
      next:()=> 'market'
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
      next:()=> 'summaryBuyer'
    },
    summaryPrep:summary('Vorbereitung','Sie haben jetzt einen guten Überblick darüber, was vor und während der Vermarktung organisiert werden muss.','Besonders wichtig sind vollständige Unterlagen, eine geklärte Grundbuchsituation und ein fester Ablauf für Interessenten und Besichtigungen.'),
    summaryInterest:summary('Interessent vorhanden','Der nächste Schwerpunkt liegt auf der Qualifizierung des Interessenten.','Bevor aus Interesse ein Notartermin wird, sollten Finanzierung, Kaufpreis und offene Objektfragen belastbar geklärt sein.'),
    summaryBuyer:summary('Konkreter Käufer','Jetzt geht es vor allem um einen sauberen Abschluss.','Finanzierungsnachweis, Grundbuchthemen, Notardaten, Kaufpreisfälligkeit und Übergabe sollten strukturiert koordiniert werden.')
  };

  function typeQuestion(route){
    return {
      kicker:'Immobilientyp',title:'Welche Immobilie möchten Sie verkaufen?',text:'Damit wir nur die passenden Themen anzeigen.',
      options:[
        ['house','Haus','Einfamilienhaus, Doppelhaushälfte oder Reihenhaus'],
        ['apartment','Eigentumswohnung','Wohnung innerhalb einer WEG'],
        ['investment','Mehrfamilienhaus','Mehrere Einheiten oder Anlageobjekt'],
        ['land','Grundstück','Unbebaut oder mit Entwicklungs-/Baupotenzial']
      ],
      next:()=> route==='Käufer'?'finance':route==='Interessent'?'qualification':'docs'
    };
  }
  function summary(k,t,b){
    return {kicker:k,title:t,text:b,summary:true,options:[],next:null};
  }

  let current='start', history=[], answers={}, selected=null;

  const render = () => {
    const q=questions[current];
    stepLabel.textContent = q.summary ? 'Ihre Einordnung' : 'Schritt ' + (history.length + 1);
    progress.style.width = Math.min(100, q.summary ? 100 : 12 + history.length * 13) + '%';
    kicker.textContent=q.kicker; title.textContent=q.title; text.textContent=q.text;
    options.innerHTML=''; explainer.hidden=true; explainer.innerHTML=''; selected=answers[current] || null;
    q.options.forEach(([value,label,small])=>{
      const b=document.createElement('button'); b.type='button'; b.className='sales-wizard-option'; b.dataset.value=value;
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
      explainer.innerHTML='<h3>Was bedeutet das für Sie?</h3><p>'+q.text+'</p><ul><li>Offene Punkte früh klären</li><li>Käufer- und Notarprozess nicht erst am Ende organisieren</li><li>Bei Bedarf SLS die Koordination übernehmen lassen</li></ul><p style="margin-top:14px"><a class="text-link" href="/kontakt/">Verkauf mit SLS besprechen →</a></p>';
    } else if(selected) showExplain(q,selected);
  };

  const showExplain=(q,value)=>{
    const info=q.explain?.[value];
    if(!info){explainer.hidden=true;explainer.innerHTML='';return}
    explainer.hidden=false;
    explainer.innerHTML='<h3>'+info[0]+'</h3>'+(info[1]?.length?'<ul>'+info[1].map(x=>'<li>'+x+'</li>').join('')+'</ul>':'');
  };
  const select=value=>{
    selected=value; answers[current]=value;
    [...options.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===value)));
    showExplain(questions[current],value); next.hidden=false;
  };
  const goNext=()=>{
    const q=questions[current]; if(!selected||!q.next)return;
    history.push(current);
    const nextId=typeof q.next==='function'?q.next(answers):q.next;
    current=nextId; selected=answers[current]||null; render(); root.scrollIntoView({behavior:'smooth',block:'start'});
  };
  const goBack=()=>{
    if(!history.length)return;
    current=history.pop(); selected=answers[current]||null; render(); root.scrollIntoView({behavior:'smooth',block:'start'});
  };
  next.addEventListener('click',goNext); back.addEventListener('click',goBack);
  render();
})();