(() => {
 'use strict';
 const target=document.getElementById('anfrage');
 if(target && 'IntersectionObserver' in window)new IntersectionObserver(entries=>document.body.classList.toggle('lp-form-visible',entries[0].isIntersecting),{rootMargin:'-80px 0px -100px 0px'}).observe(target);
 // PriceHubble owns its form and result. Loading the widget is not a successful enquiry.
})();
