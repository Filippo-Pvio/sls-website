// Transform HTML before it reaches a browser: an observer cannot stop parser-started requests.
export function prepareConsentHtml(html){
  if(!/<head[\s>]/i.test(html))return html;
  html=html.replace(/<iframe\b[^>]*>/gi,tag=>tag.replace(/(?<![\w-])src=("|')(https?:[^"']+)\1/i,(_,quote,url)=>`data-consent-src=${quote}${url}${quote}`));
  html=html.replace(/<img\b[^>]*>/gi,tag=>tag.replace(/(?<![\w-])src=("|')(https?:\/\/i\.ytimg\.com\/[^"']+)\1/i,(_,quote,url)=>`src="/assets/images/magazin/dennis.jpg" data-consent-image=${quote}${url}${quote}`));
  if(!html.includes('src="/assets/privacy-consent.js"'))html=html.replace(/(<head\b[^>]*>)/i,'$1<script src="/assets/privacy-consent.js"></script><link rel="stylesheet" href="/assets/privacy-consent.css">');
  return html;
}
