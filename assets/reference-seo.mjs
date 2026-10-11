const slug=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,105);
export const referencePath=item=>`/referenz/${slug(`${item.title}-${item.city}`)}-${encodeURIComponent(item.id)}/`;
export const referenceCardHtml=item=>{
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<article class="reference-card"><a href="${esc(referencePath(item))}"><img src="${esc(item.image)}" alt="Verkaufte Immobilie in ${esc(item.city)}" width="600" height="450" loading="lazy" decoding="async"><span class="reference-tag">Erfolgreich vermittelt</span><h3>${esc(item.title)}</h3><p>${esc(item.city)}</p></a></article>`;
};
