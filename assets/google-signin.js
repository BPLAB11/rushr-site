/* Connexion Google « intégrée » (Google Identity Services + Supabase signInWithIdToken).
   Le sélecteur de compte s'ouvre dans une fenêtre sur thebackpacklab.com : Google affiche
   le nom du site et non l'adresse technique du projet Supabase.
   Tant que GOOGLE_CLIENT_ID est vide, ou si le script Google ne se charge pas (bloqueur,
   réseau), le bouton « Continuer avec Google » classique (redirection) reste affiché.
   L'ID client est public (il figure dans toutes les pages qui utilisent Google) ; le secret,
   lui, reste uniquement dans Supabase. */
(function(){
  var GOOGLE_CLIENT_ID='1037325996510-hceqnqfnpfr9imat4gt3spheo4fqpbvo.apps.googleusercontent.com';

  function rnd(){
    var a=new Uint8Array(16); (window.crypto||window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
  }
  function sha256hex(s){
    return crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
    });
  }

  /* o : { sb, holder, fallback, lang():'fr'|'en', onSuccess(), onError(err) } */
  window.BPLGoogle={
    init:function(o){
      if(!GOOGLE_CLIENT_ID||!window.crypto||!crypto.subtle||!window.TextEncoder) return;
      var s=document.createElement('script');
      s.src='https://accounts.google.com/gsi/client'; s.async=true; s.defer=true;
      s.onload=function(){ try{ setup(o); }catch(e){ console.error('google init failed:',e); } };
      document.head.appendChild(s);
    }
  };

  function setup(o){
    var raw=rnd();
    sha256hex(raw).then(function(hash){
      google.accounts.id.initialize({
        client_id:GOOGLE_CLIENT_ID,
        nonce:hash,
        callback:function(resp){
          o.sb.auth.signInWithIdToken({provider:'google',token:resp.credential,nonce:raw}).then(function(r){
            if(r.error){ console.error('signInWithIdToken failed:',r.error); o.onError&&o.onError(r.error); }
            else o.onSuccess&&o.onSuccess(r.data);
          },function(e){ console.error('signInWithIdToken failed:',e); o.onError&&o.onError(e); });
        }
      });
      o.holder.style.display='flex';
      var w=Math.max(200,Math.min(400,o.holder.clientWidth||320));
      google.accounts.id.renderButton(o.holder,{
        type:'standard',theme:'filled_black',size:'large',text:'continue_with',
        shape:'rectangular',logo_alignment:'left',width:w,locale:(o.lang&&o.lang())||'fr'
      });
      o.fallback.style.display='none';
    });
  }
})();
