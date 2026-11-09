/* Anti-robot Cloudflare Turnstile pour les connexions par e-mail / mot de passe.
   Supabase (Authentication > Attack Protection > CAPTCHA) exige un jeton « captchaToken » sur
   signInWithOtp, signInWithPassword et signUp. Ce script affiche le widget (invisible dans la plupart
   des cas) et fournit le jeton.

   Tant que SITE_KEY est vide, rien n'est affiché et aucun jeton n'est envoye : les connexions
   fonctionnent comme avant (a activer en meme temps que le CAPTCHA dans Supabase).
   La cle de site est PUBLIQUE ; la cle secrete reste uniquement dans Supabase. */
(function(){
  var SITE_KEY='0x4AAAAAAF6SnMcgZRoez52X';

  var widgetId=null, token=null, waiters=[], mounted=false;

  function flush(t){ var w=waiters.slice(); waiters=[]; w.forEach(function(f){ f(t); }); }

  function render(el){
    try{
      widgetId=window.turnstile.render(el,{
        sitekey:SITE_KEY,
        theme:'dark',
        appearance:'interaction-only',   // visible seulement si Cloudflare demande une action
        callback:function(t){ token=t; flush(t); },
        'expired-callback':function(){ token=null; try{ window.turnstile.reset(widgetId); }catch(e){} },
        'error-callback':function(){ token=null; flush(null); }
      });
    }catch(e){ console.error('turnstile render failed:',e); flush(null); }
  }

  window.BPLCaptcha={
    enabled:function(){ return !!SITE_KEY; },
    /* mount(element) : a appeler une fois, element = conteneur du widget */
    mount:function(el){
      if(!SITE_KEY||mounted||!el) return; mounted=true;
      window.__bplTurnstileReady=function(){ render(el); };
      var s=document.createElement('script');
      s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__bplTurnstileReady';
      s.async=true; s.defer=true;
      s.onerror=function(){ flush(null); };
      document.head.appendChild(s);
    },
    /* Promesse : jeton pret (attend jusqu'a ms), ou undefined si desactive / indisponible */
    token:function(ms){
      if(!SITE_KEY) return Promise.resolve(undefined);
      if(token) return Promise.resolve(token);
      return new Promise(function(resolve){
        var done=false;
        function fin(t){ if(done) return; done=true; resolve(t||undefined); }
        waiters.push(fin); setTimeout(function(){ fin(null); },ms||8000);
      });
    },
    /* Execute fn(jeton) puis renouvelle le jeton (usage unique). Si le jeton n'a pas pu etre obtenu
       (bloqueur, reseau, mauvaise configuration), on tente quand meme sans jeton : c'est Supabase qui
       decide (il refuse si le CAPTCHA est actif). Aucun blocage cote page. */
    withToken:async function(fn){
      var api=window.BPLCaptcha, t=await api.token();
      try{ return await fn(t); } finally { api.reset(); }
    },
    /* A appeler apres chaque utilisation : un jeton ne sert qu'une fois */
    reset:function(){
      token=null;
      try{ if(widgetId!==null&&window.turnstile) window.turnstile.reset(widgetId); }catch(e){}
    }
  };
})();
