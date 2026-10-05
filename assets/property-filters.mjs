// One form is reused in the desktop view and the mobile filter dialog.
export async function setupPropertyFilters(form,{demoItems,restore={}}={}){
  const type=form.elements.type,subtype=form.elements.subtype,city=form.elements.city;
  let filters={types:[],cities:[]};
  const selectedType=restore.type||type.value,selectedSubtype=restore.subtype||subtype.value;
  const setOptions=(select,items,placeholder,value)=>{
    select.replaceChildren(new Option(placeholder,''),...items.map(item=>new Option(item.label,item.value)));
    select.value=items.some(item=>item.value===value)?value:'';
  };
  const updateSubtypes=(value='')=>{
    const options=filters.types.find(item=>item.value===type.value)?.subtypes||[];
    setOptions(subtype,options,type.value?'Alle Unterkategorien':'Zuerst Immobilienart wählen',value);
    subtype.disabled=!type.value||!options.length;
  };
  type.addEventListener('change',()=>updateSubtypes());

  const wrapper=document.createElement('div');wrapper.className='pp-city-combobox';
  city.before(wrapper);wrapper.append(city);
  city.id='pp-city';city.setAttribute('role','combobox');city.setAttribute('aria-label','Ort');
  city.setAttribute('aria-autocomplete','list');city.setAttribute('aria-expanded','false');
  city.setAttribute('aria-controls','pp-city-options');city.autocomplete='off';
  const list=document.createElement('div');list.id='pp-city-options';list.className='pp-city-options';
  list.setAttribute('role','listbox');list.setAttribute('aria-label','Veröffentlichte Orte');list.hidden=true;
  wrapper.append(list);
  let matches=[],active=-1;
  const close=()=>{list.hidden=true;city.setAttribute('aria-expanded','false');city.removeAttribute('aria-activedescendant');active=-1};
  const highlight=()=>{
    [...list.children].forEach((option,index)=>option.setAttribute('aria-selected',String(index===active)));
    if(active>=0){city.setAttribute('aria-activedescendant',`pp-city-option-${active}`);list.children[active]?.scrollIntoView({block:'nearest'})}
    else city.removeAttribute('aria-activedescendant');
  };
  const choose=index=>{if(matches[index]!=null){city.value=matches[index];city.dispatchEvent(new Event('change',{bubbles:true}));close()}};
  const open=()=>{
    const term=city.value.trim().toLocaleLowerCase('de-DE');
    matches=filters.cities.filter(value=>value.toLocaleLowerCase('de-DE').includes(term));active=-1;
    list.replaceChildren(...matches.map((value,index)=>{
      const option=document.createElement('div');option.id=`pp-city-option-${index}`;
      option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.textContent=value;
      option.addEventListener('pointerdown',event=>event.preventDefault());
      option.addEventListener('click',()=>choose(index));return option;
    }));
    if(!matches.length){const empty=document.createElement('div');empty.className='pp-city-empty';empty.textContent='Kein passender Ort – freie Eingabe möglich.';list.append(empty)}
    list.hidden=false;city.setAttribute('aria-expanded','true');city.removeAttribute('aria-activedescendant');
  };
  city.addEventListener('focus',open);city.addEventListener('click',open);city.addEventListener('input',open);
  city.addEventListener('blur',close);
  city.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!list.hidden){event.preventDefault();event.stopPropagation();close()}
    else if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();if(list.hidden)open();
      if(matches.length){active=event.key==='ArrowDown'?(active+1)%matches.length:(active<=0?matches.length-1:active-1);highlight()}
    }else if(event.key==='Enter'&&!list.hidden&&active>=0){event.preventDefault();choose(active)}
    else if(event.key==='Tab')close();
  });
  form.addEventListener('submit',close);
  const notice=document.createElement('p');notice.className='pp-filter-notice';notice.setAttribute('role','status');notice.hidden=true;form.after(notice);
  const load=async()=>{
    try{
      if(demoItems){
        filters={types:[...new Set(demoItems.map(p=>p.type))].map(value=>({value,label:value,subtypes:[]})),cities:[...new Set(demoItems.map(p=>p.city).filter(Boolean))]};
      }else{
        const response=await fetch('/api/propstack-properties?filters=1',{signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error('filters unavailable');
        const data=await response.json();if(!Array.isArray(data.filters?.types)||!Array.isArray(data.filters?.cities))throw new Error('invalid filters');
        filters=data.filters;
      }
      setOptions(type,filters.types,'Alle Immobilien',type.value||selectedType);
      updateSubtypes(subtype.value||selectedSubtype);notice.hidden=true;
      if(document.activeElement===city)open();
    }catch{
      notice.hidden=false;notice.replaceChildren('Filterauswahl derzeit nicht verfügbar. Freie Ortssuche bleibt möglich. ');
      const retry=document.createElement('button');retry.type='button';retry.textContent='Erneut laden';
      retry.addEventListener('click',()=>{retry.disabled=true;load()});notice.append(retry);
    }
  };
  await load();
}
