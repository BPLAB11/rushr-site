/* Espace compte BACKPACK LAB — logique de l'interface.
   Mêmes appels serveur qu'avant : get_my_account, claim_license, release_device (edge function),
   set_my_marketing_consent, submit_support_ticket, table profiles / support_tickets / app_versions. */
var SUPABASE_URL="https://vztqykihtnkscwcodkyf.supabase.co";
var SUPABASE_KEY="sb_publishable_z37RvcwDHOhoyS7GQIxn8Q_ZOifPQ4l";
var SB=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

var ROUTES=['overview','licenses','devices','purchases','profile','support'];
var S={account:null,tickets:null,versions:null,route:'overview',pendingEmail:'',revealed:{},draft:null,resendAt:0,resendTimer:null,lang:'fr',busy:{}};
var PRODUCTS={
  RUSHR:{fr:'Outil de dérushage pour les créateurs',en:'Dérushage tool for creators'},
  RENAME:{fr:'Outil de renommage par lot pour vos fichiers médias',en:'Batch renaming tool for your media files'}
};

/* ===================== Traductions ===================== */
var I18N={
fr:{
 auth_title:'Mon compte',auth_lead:'Un seul compte BACKPACK LAB pour tes licences, tes appareils et ton historique. Pas encore de compte ? Il sera créé automatiquement.',
 auth_google:'Continuer avec Google',auth_or:'ou par email',err_google:'Connexion avec Google impossible, réessaie ou utilise ton email.',
 email:'Email',email_ph:'ton@email.com',auth_send:'Recevoir un code',auth_privacy:"Ton email sert uniquement à t'envoyer le code de connexion et à gérer ton compte.",privacy_policy:'Politique de confidentialité',
 code_title:'Vérifie ta boîte mail',code_lead:'Nous avons envoyé un code à',code_label:'Code de connexion',code_verify:'Se connecter',code_resend:'Renvoyer le code',code_resend_in:'Renvoyer dans {s} s',code_change:"← Changer d'email",
 err_email:'Entre une adresse email valide.',err_send:"Impossible d'envoyer le code, réessaie.",err_code:'Code invalide ou expiré.',err_code_empty:'Entre le code reçu par email.',err_load:'Connecté, mais impossible de charger ton compte. Recharge la page.',err_session:'Impossible de charger ton compte, reconnecte-toi.',
 code_sent:'Code envoyé',code_sent_d:'Vérifie ta boîte mail.',signed_out:'Tu es déconnecté.',
 legal:'Mentions légales',privacy:'Confidentialité',
 side_1_t:'Tes licences au même endroit',side_1_d:'Copie ta clé, vois son statut et son logiciel.',side_2_t:"Change d'ordinateur sans stress",side_2_d:'Libère un appareil quand tu en changes.',side_3_t:'Une vraie personne te répond',side_3_d:'Écris au support directement depuis ton compte.',side_quote:'Des logiciels pensés pour les créateurs vidéo.',
 workspace:'Espace compte',grp_platform:'Plateforme',grp_account:'Compte',
 nav_overview:"Vue d'ensemble",nav_licenses:'Mes licences',nav_devices:'Mes appareils',nav_purchases:'Achats et factures',nav_download:'Télécharger Rushr',nav_profile:'Profil et préférences',nav_support:'Support',
 search:'Rechercher…',menu_lang:'Langue',menu_signout:'Se déconnecter',
 hello:'Bonjour, {name}',overview_sub:'Voici un aperçu de ton compte BACKPACK LAB.',add_key:'Ajouter une clé',
 st_licenses:'Licences',st_active:'{n} active(s)',st_devices:'Appareils',st_slots:'emplacements utilisés',st_last:'Dernière activité',st_last_none:'Aucun appareil activé',st_version:'Dernière version',st_version_sub:'RUSHR · bêta',st_member:'Membre depuis',st_member_sub:'Compte créé',
 card_licenses:'Mes licences',card_devices:'Appareils',see_all:'Tout voir',manage:'Gérer',
 empty_lic_t:'Aucune licence pour le moment',empty_lic_d:'Ajoute une clé de licence ou réclame une licence bêta offerte.',claim_beta:'Réclamer une licence bêta',
 empty_dev_t:'Aucun appareil activé',empty_dev_d:"Active RUSHR avec ta clé de licence : l'appareil apparaîtra ici.",no_lic_no_dev:'Aucune licence, donc aucun appareil pour le moment.',
 copy:'Copier',copied:'Copié',copy_key:'Copier la clé',key_copied:'Clé copiée',key_copied_d:'Elle est dans ton presse-papiers.',copy_failed:'Copie impossible',copy_failed_d:'Sélectionne la clé et copie-la à la main.',show_key:'Afficher la clé',hide_key:'Masquer la clé',
 dl_title:'Télécharger RUSHR',dl_for:'Télécharger pour {os}',dl_other:'Autre plateforme : {os}',dl_notes:'Notes de version',dl_beta:'bêta',
 help_title:"Besoin d'aide ?",help_d:'Un bug, une question, une idée ? On lit tout et on te répond par email.',help_btn:'Contacter le support',
 page_licenses_d:'Tes clés de licence, leur statut et le logiciel concerné.',page_devices_d:'Les machines où tes licences sont activées. Libère-en une pour changer d\'ordinateur.',page_purchases_d:'Retrouve tes commandes passées et tes factures.',page_profile_d:'Ton nom, ta langue et tes préférences de contact.',page_support_d:'Un bug, une question ? Écris-nous : on lit tout.',
 status:'Statut',plan:'Plan',created:'Créée le',expires:'Expire le',no_expiry:"Sans date d'expiration",devices_word:'Appareils',manage_devices:'Gérer les appareils',
 s_active:'Active',s_inactive:'Inactive',s_expired:'Expirée',s_revoked:'Révoquée',s_suspended:'Suspendue',
 dev_col_name:'Appareil',dev_col_activated:'Activé',dev_col_seen:'Dernière activité',dev_col_status:'Statut',
 dev_active:'Actif',dev_releasing:'Libération en cours',dev_freed:'Libéré',dev_lease:"bail jusqu'au {d}",dev_freed_on:'libéré le {d}',dev_free:'Libérer',device:'Appareil',
 free_title:'Libérer cet appareil ?',free_d:"Il ne sera libéré qu'à l'expiration de son bail en cours (jusqu'à 30 jours). D'ici là, il compte toujours dans la limite de ta licence.",free_confirm:"Libérer l'appareil",
 free_ok:'Libération enregistrée',free_ok_d:"L'appareil sera libéré le {d}.",free_ok_d2:'Elle sera effective à la fin du bail.',free_err:'Impossible de libérer cet appareil, réessaie.',
 slots_n:'{u} / {m} appareil(s)',
 key_title:'Ajouter une clé de licence',key_d:'Associe une licence à ton compte avec sa clé.',key_label:'Clé de licence',key_hint:"Tu la trouves dans l'email reçu ou dans l'application.",key_add:'Ajouter',
 key_ok:'Licence ajoutée',key_ok_d:'Elle est maintenant liée à ton compte.',key_err_nf:'Clé introuvable. Vérifie qu\'elle est correcte.',key_err_claimed:'Cette clé est déjà liée à un autre compte.',key_err:"Impossible d'ajouter la clé, réessaie.",key_err_empty:'Entre une clé de licence.',
 cancel:'Annuler',close:'Fermer',save:'Enregistrer',saved:'Enregistré',
 pur_t:'Aucun achat pour le moment',pur_d:'Tes commandes et tes factures apparaîtront ici.',soon:'Bientôt',
 pf_title:'Profil',pf_d:'Ces informations sont visibles uniquement par toi.',pf_name:'Nom',pf_name_ph:'Ton nom',pf_email:'Email',pf_email_hint:"L'adresse de connexion ne peut pas être modifiée ici.",pf_lang:'Langue',pf_dirty:'Modifications non enregistrées',pf_clean:'Tout est à jour',pf_ok:'Profil enregistré',pf_err:"Impossible d'enregistrer, réessaie.",verified:'Vérifié',
 ml_title:"Emails d'information",ml_d:'Nouvelles versions et actualités de RUSHR et BACKPACK LAB.',ml_on:"Tu reçois nos emails d'information (accord donné le {d}).",ml_off:"Tu ne reçois pas nos emails d'information.",ml_unsub:"Tu es désabonné de nos emails d'information.",ml_none:"Tu n'as pas demandé à recevoir nos emails d'information. Les emails liés à ton accès (bienvenue, licence) continuent d'être envoyés.",
 ml_legacy_t:'Restons en contact ?',ml_legacy_d:"Tu t'es inscrit à la bêta de RUSHR avant que nous te demandions ton accord pour les emails d'information. Veux-tu continuer à recevoir nos nouvelles (nouvelles versions, actualités) ? Tu pourras changer d'avis à tout moment dans ton profil.",ml_yes:'Oui, continuer',ml_no:'Non merci',ml_later:'Plus tard',ml_on_toast:"Emails d'information activés",ml_off_toast:'Emails d\'information désactivés',ml_err:"Impossible d'enregistrer ton choix, réessaie.",ml_toggle:"Recevoir les emails d'information",
 ac_title:'Compte',ac_created:'Compte créé le',ac_beta:'Inscrit à la bêta RUSHR',
 dp_title:'Données personnelles',dp_d:"Tu peux demander l'accès à tes données, leur rectification ou leur suppression à tout moment.",dp_rights:'Exercer mes droits',dp_policy:'Politique de confidentialité',dp_subject:'Exercice de mes droits (RGPD)',
 sp_form_t:'Nouveau message',sp_form_d:'Réponse par email, généralement sous 48 h.',sp_subject:'Sujet',sp_subject_ph:'Sujet (optionnel)',sp_message:'Message',sp_message_ph:'Décris ton problème ou ta question…',sp_send:'Envoyer',sp_ok:'Message envoyé',sp_ok_d:'On te répond par email.',sp_err:"Impossible d'envoyer le message, réessaie.",sp_err_empty:'Écris ton message.',sp_chars:'{n} / 5000',
 sp_hist_t:'Historique',sp_hist_d:'Tes derniers messages.',sp_hist_empty:'Aucun message envoyé pour le moment.',sp_no_subject:'(sans sujet)',sp_open:'Ouvert',sp_answered:'Répondu',sp_closed:'Clos',
 sp_nolic_t:'Support réservé aux détenteurs d\'une licence',sp_nolic_d:'Le support intégré est réservé aux comptes qui ont une licence. Pour toute question, écris-nous à contact@thebackpacklab.com.',sp_mail:"Écrire à l'équipe",
 cmd_ph:'Rechercher une page ou une action…',cmd_nav:'Navigation',cmd_actions:'Actions',cmd_empty:'Aucun résultat.',cmd_hint_nav:'naviguer',cmd_hint_run:'valider',cmd_hint_esc:'fermer',cmd_lang:'Passer en anglais',cmd_copy:'Copier la clé {p}',
 just_now:"à l'instant",never:'—',err_generic:'Une erreur est survenue, réessaie.',menu:'Menu',
 platform_windows:'Windows',platform_mac:'macOS'
},
en:{
 auth_title:'My account',auth_lead:'One BACKPACK LAB account for your licenses, devices and history. No account yet? It will be created automatically.',
 auth_google:'Continue with Google',auth_or:'or by email',err_google:'Google sign-in failed, try again or use your email.',
 email:'Email',email_ph:'you@email.com',auth_send:'Send me a code',auth_privacy:'Your email is only used to send you the sign-in code and manage your account.',privacy_policy:'Privacy policy',
 code_title:'Check your inbox',code_lead:'We sent a code to',code_label:'Sign-in code',code_verify:'Sign in',code_resend:'Resend code',code_resend_in:'Resend in {s}s',code_change:'← Change email',
 err_email:'Enter a valid email address.',err_send:'Could not send the code, please retry.',err_code:'Invalid or expired code.',err_code_empty:'Enter the code you received by email.',err_load:'Signed in, but your account could not be loaded. Please reload the page.',err_session:'Could not load your account, please sign in again.',
 code_sent:'Code sent',code_sent_d:'Check your inbox.',signed_out:'You have been signed out.',
 legal:'Legal notice',privacy:'Privacy',
 side_1_t:'Your licenses in one place',side_1_d:'Copy your key, see its status and software.',side_2_t:'Switch computers without stress',side_2_d:'Free up a device when you change machines.',side_3_t:'A real person answers',side_3_d:'Write to support right from your account.',side_quote:'Software built for video creators.',
 workspace:'Account',grp_platform:'Platform',grp_account:'Account',
 nav_overview:'Overview',nav_licenses:'My licenses',nav_devices:'My devices',nav_purchases:'Purchases & invoices',nav_download:'Download Rushr',nav_profile:'Profile & preferences',nav_support:'Support',
 search:'Search…',menu_lang:'Language',menu_signout:'Sign out',
 hello:'Hello, {name}',overview_sub:'Here is an overview of your BACKPACK LAB account.',add_key:'Add a key',
 st_licenses:'Licenses',st_active:'{n} active',st_devices:'Devices',st_slots:'slots used',st_last:'Last activity',st_last_none:'No device activated',st_version:'Latest version',st_version_sub:'RUSHR · beta',st_member:'Member since',st_member_sub:'Account created',
 card_licenses:'My licenses',card_devices:'Devices',see_all:'See all',manage:'Manage',
 empty_lic_t:'No license yet',empty_lic_d:'Add a license key or claim a complimentary beta license.',claim_beta:'Claim a beta license',
 empty_dev_t:'No device activated',empty_dev_d:'Activate RUSHR with your license key: the device will show up here.',no_lic_no_dev:'No license yet, so no device.',
 copy:'Copy',copied:'Copied',copy_key:'Copy key',key_copied:'Key copied',key_copied_d:'It is in your clipboard.',copy_failed:'Could not copy',copy_failed_d:'Select the key and copy it manually.',show_key:'Show key',hide_key:'Hide key',
 dl_title:'Download RUSHR',dl_for:'Download for {os}',dl_other:'Other platform: {os}',dl_notes:'Release notes',dl_beta:'beta',
 help_title:'Need help?',help_d:'A bug, a question, an idea? We read everything and reply by email.',help_btn:'Contact support',
 page_licenses_d:'Your license keys, their status and the software they unlock.',page_devices_d:'The machines where your licenses are activated. Free one up to switch computers.',page_purchases_d:'Find your past orders and invoices.',page_profile_d:'Your name, language and contact preferences.',page_support_d:'A bug, a question? Write to us: we read everything.',
 status:'Status',plan:'Plan',created:'Created on',expires:'Expires on',no_expiry:'No expiry date',devices_word:'Devices',manage_devices:'Manage devices',
 s_active:'Active',s_inactive:'Inactive',s_expired:'Expired',s_revoked:'Revoked',s_suspended:'Suspended',
 dev_col_name:'Device',dev_col_activated:'Activated',dev_col_seen:'Last activity',dev_col_status:'Status',
 dev_active:'Active',dev_releasing:'Releasing',dev_freed:'Freed',dev_lease:'lease until {d}',dev_freed_on:'freed on {d}',dev_free:'Free up',device:'Device',
 free_title:'Free up this device?',free_d:'It will only be freed when its current lease expires (up to 30 days). Until then it still counts toward your license limit.',free_confirm:'Free up device',
 free_ok:'Release saved',free_ok_d:'The device will be freed on {d}.',free_ok_d2:'It will take effect at the end of the lease.',free_err:'Could not free up this device, please retry.',
 slots_n:'{u} / {m} device(s)',
 key_title:'Add a license key',key_d:'Link a license to your account with its key.',key_label:'License key',key_hint:'You can find it in the email you received or in the app.',key_add:'Add',
 key_ok:'License added',key_ok_d:'It is now linked to your account.',key_err_nf:'Key not found. Please check it.',key_err_claimed:'This key is already linked to another account.',key_err:'Could not add the key, please retry.',key_err_empty:'Enter a license key.',
 cancel:'Cancel',close:'Close',save:'Save',saved:'Saved',
 pur_t:'No purchase yet',pur_d:'Your orders and invoices will show up here.',soon:'Soon',
 pf_title:'Profile',pf_d:'This information is only visible to you.',pf_name:'Name',pf_name_ph:'Your name',pf_email:'Email',pf_email_hint:'The sign-in address cannot be changed here.',pf_lang:'Language',pf_dirty:'Unsaved changes',pf_clean:'Everything is up to date',pf_ok:'Profile saved',pf_err:'Could not save, please retry.',verified:'Verified',
 ml_title:'Information emails',ml_d:'New releases and news about RUSHR and BACKPACK LAB.',ml_on:'You receive our information emails (consent given on {d}).',ml_off:'You do not receive our information emails.',ml_unsub:'You are unsubscribed from our information emails.',ml_none:'You did not ask to receive our information emails. Emails about your access (welcome, license) are still sent.',
 ml_legacy_t:'Stay in touch?',ml_legacy_d:'You signed up for the RUSHR beta before we asked for your consent to information emails. Would you like to keep receiving our news (new releases, updates)? You can change your mind at any time in your profile.',ml_yes:'Yes, keep me posted',ml_no:'No thanks',ml_later:'Later',ml_on_toast:'Information emails enabled',ml_off_toast:'Information emails disabled',ml_err:'Could not save your choice, please retry.',ml_toggle:'Receive information emails',
 ac_title:'Account',ac_created:'Account created on',ac_beta:'Signed up for the RUSHR beta',
 dp_title:'Personal data',dp_d:'You can ask for access to your data, its correction or its deletion at any time.',dp_rights:'Exercise my rights',dp_policy:'Privacy policy',dp_subject:'Exercising my rights (GDPR)',
 sp_form_t:'New message',sp_form_d:'We reply by email, usually within 48 h.',sp_subject:'Subject',sp_subject_ph:'Subject (optional)',sp_message:'Message',sp_message_ph:'Describe your problem or question…',sp_send:'Send',sp_ok:'Message sent',sp_ok_d:"We'll reply by email.",sp_err:'Could not send the message, please retry.',sp_err_empty:'Write your message.',sp_chars:'{n} / 5000',
 sp_hist_t:'History',sp_hist_d:'Your latest messages.',sp_hist_empty:'No messages sent yet.',sp_no_subject:'(no subject)',sp_open:'Open',sp_answered:'Answered',sp_closed:'Closed',
 sp_nolic_t:'Support is reserved for license holders',sp_nolic_d:'In-app support is reserved for accounts that have a license. For any question, write to us at contact@thebackpacklab.com.',sp_mail:'Email the team',
 cmd_ph:'Search for a page or an action…',cmd_nav:'Navigation',cmd_actions:'Actions',cmd_empty:'No results.',cmd_hint_nav:'navigate',cmd_hint_run:'select',cmd_hint_esc:'close',cmd_lang:'Switch to French',cmd_copy:'Copy {p} key',
 just_now:'just now',never:'—',err_generic:'Something went wrong, please try again.',menu:'Menu',
 platform_windows:'Windows',platform_mac:'macOS'
}};
function t(k,v){
  var s=(I18N[S.lang]&&I18N[S.lang][k]);
  if(s==null) s=I18N.fr[k];
  if(s==null) return k;
  if(v) for(var n in v) s=s.split('{'+n+'}').join(v[n]);
  return s;
}

/* ===================== Utilitaires ===================== */
var ICONS={
 layout:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M17 6l3 3M14 9l2 2"/>',
 monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
 bag:'<path d="M6 2 3 6v15a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 life:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.9 4.9 4.3 4.3m5.6 5.6 4.3 4.3m0-14.2-4.3 4.3m-5.6 5.6-4.3 4.3"/>',
 search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',
 copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M9.9 4.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="m2 2 20 20"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',
 chevrons:'<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
 panel:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
 globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
 download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
 alert:'<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
 mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
 send:'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 checkc:'<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m22 4-10 10-3-3"/>',
 xc:'<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>'
};
function icon(n,cls){return '<svg class="i'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[n]||'')+'</svg>';}
function hydrateIcons(root){
  (root||document).querySelectorAll('[data-icon]:not([data-hyd])').forEach(function(el){
    el.innerHTML=icon(el.getAttribute('data-icon')); el.setAttribute('data-hyd','1');
  });
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function locale(){return S.lang==='fr'?'fr-FR':'en-GB';}
function fmtDate(d){
  if(!d) return '—'; var x=new Date(d); if(isNaN(x)) return '—';
  try{return new Intl.DateTimeFormat(locale(),{day:'numeric',month:'short',year:'numeric'}).format(x);}catch(e){return x.toLocaleDateString();}
}
function fmtRel(d){
  if(!d) return '—'; var x=new Date(d); if(isNaN(x)) return '—';
  var diff=(x.getTime()-Date.now())/1000, abs=Math.abs(diff);
  if(abs<60) return t('just_now');
  var rtf; try{rtf=new Intl.RelativeTimeFormat(locale(),{numeric:'auto'});}catch(e){return fmtDate(d);}
  if(abs<3600) return rtf.format(Math.round(diff/60),'minute');
  if(abs<86400) return rtf.format(Math.round(diff/3600),'hour');
  if(abs<86400*30) return rtf.format(Math.round(diff/86400),'day');
  if(abs<86400*365) return rtf.format(Math.round(diff/(86400*30)),'month');
  return rtf.format(Math.round(diff/(86400*365)),'year');
}
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function initials(s){
  var p=String(s||'?').replace(/@.*/,'').split(/[\s._-]+/).filter(Boolean);
  return ((p[0]||'?').charAt(0)+(p.length>1?p[1].charAt(0):'')).toUpperCase();
}
function maskKey(k){
  k=String(k||''); var p=k.split('-');
  if(p.length>=3) return p.map(function(s,i){return (i===0||i===p.length-1)?s:'••••';}).join('-');
  return k.length>8?k.slice(0,4)+'••••'+k.slice(-4):k;
}
function isRushr(c){return String(c||'').toUpperCase()==='RUSHR';}
function safeUrl(u){return /^https:\/\/[^\s"'<>]+$/.test(String(u||''))?u:'';}
function firstName(){
  var a=S.account; if(!a) return '';
  var n=(a.profile&&a.profile.full_name)||'';
  n=String(n).trim().split(/\s+/)[0];
  return n||String(a.user.email||'').split('@')[0];
}
function displayName(){
  var a=S.account; if(!a) return '';
  return (a.profile&&a.profile.full_name&&a.profile.full_name.trim())||String(a.user.email||'').split('@')[0];
}
function setBusy(btn,on){ if(!btn) return; btn.classList.toggle('loading',!!on); btn.disabled=!!on; }

/* ===================== Données : licences / appareils ===================== */
function isActiveLic(l){return String(l.status||'').toUpperCase()==='ACTIVE';}
function occupies(a){ if(!a.revoked_at) return true; return !!a.lease_expires_at && new Date(a.lease_expires_at)>new Date(); }
function deviceStatus(a){
  if(!a.revoked_at) return {key:'active',label:t('dev_active'),cls:'badge-success',canFree:true,detail:a.lease_expires_at?t('dev_lease',{d:fmtDate(a.lease_expires_at)}):''};
  if(occupies(a)) return {key:'releasing',label:t('dev_releasing'),cls:'badge-warning',canFree:false,detail:t('dev_freed_on',{d:fmtDate(a.lease_expires_at)})};
  return {key:'freed',label:t('dev_freed'),cls:'badge-secondary',canFree:false,detail:''};
}
function statusBadge(l){
  var s=String(l.status||'').toUpperCase();
  var map={ACTIVE:['badge-success','s_active'],EXPIRED:['badge-warning','s_expired'],REVOKED:['badge-destructive','s_revoked'],SUSPENDED:['badge-warning','s_suspended']};
  var m=map[s]||['badge-secondary','s_inactive'];
  return '<span class="badge '+m[0]+'"><span class="dot"></span>'+esc(map[s]?t(m[1]):(l.status||t('s_inactive')))+'</span>';
}
function seatTotals(lics){
  var used=0,max=0;
  lics.filter(isActiveLic).forEach(function(l){max+=Number(l.max_devices)||0; used+=(l.activations||[]).filter(occupies).length;});
  return {used:used,max:max};
}
function allDevices(lics){
  var out=[]; lics.forEach(function(l){(l.activations||[]).forEach(function(a){out.push({a:a,l:l});});}); return out;
}
function lastActivity(lics){
  var best=null;
  allDevices(lics).forEach(function(x){ if(!occupies(x.a)||!x.a.last_check_at) return; if(!best||new Date(x.a.last_check_at)>new Date(best.at)) best={at:x.a.last_check_at,name:x.a.machine_name}; });
  return best;
}
function findLic(id){return ((S.account&&S.account.licenses)||[]).filter(function(l){return l.id===id;})[0];}
function detectPlatform(){
  var b=S.account&&S.account.beta_signup&&S.account.beta_signup.platform;
  if(b==='MAC') return 'mac'; if(b==='WIN') return 'windows';
  var ua=navigator.userAgent||''; return (/Mac/i.test(navigator.platform||ua)&&!/iPhone|iPad/.test(ua))?'mac':'windows';
}
function consentState(){
  var b=S.account&&S.account.beta_signup; if(!b) return null;
  if(b.unsubscribed_at) return 'unsub'; if(b.marketing_consent_at) return 'yes';
  if(b.marketing_consent_source==='legacy') return 'legacy'; return 'none';
}
function laterSet(){try{return sessionStorage.getItem('bpl_consent_later')==='1';}catch(e){return false;}}

/* ===================== Notifications (toasts) ===================== */
function toast(type,title,desc){
  var box=$('#toaster'); if(!box) return;
  var el=document.createElement('div'); el.className='toast '+type; el.setAttribute('role',type==='error'?'alert':'status');
  el.innerHTML=icon(type==='error'?'xc':(type==='info'?'info':'checkc'))+'<div><b>'+esc(title)+'</b>'+(desc?'<span>'+esc(desc)+'</span>':'')+'</div><button type="button" class="x" aria-label="'+esc(t('close'))+'">'+icon('x')+'</button>';
  box.appendChild(el);
  while(box.children.length>4) box.removeChild(box.firstChild);
  var timer=null;
  function dismiss(){ clearTimeout(timer); if(!el.parentNode) return; el.classList.add('out'); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },200); }
  function arm(ms){ clearTimeout(timer); timer=setTimeout(dismiss,ms); }
  el.querySelector('.x').addEventListener('click',dismiss);
  el.addEventListener('mouseenter',function(){clearTimeout(timer);});
  el.addEventListener('mouseleave',function(){arm(2200);});
  arm(type==='error'?6500:4500);
  return dismiss;
}

/* ===================== Overlays : dialog, menu, palette ===================== */
var OVERLAYS=[];
function closeTopOverlay(){ var o=OVERLAYS[OVERLAYS.length-1]; if(o){o.close();return true;} return false; }
function trapFocus(root,e){
  var f=$$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',root).filter(function(x){return x.offsetParent!==null;});
  if(!f.length) return; var first=f[0],last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
}
function openDialog(o){
  var prev=document.activeElement, busy=false, closed=false;
  var ov=document.createElement('div'); ov.className='overlay';
  var btns=(o.actions||[]).map(function(a,i){return '<button type="button" class="btn '+(a.cls||'btn-outline')+'" data-i="'+i+'">'+esc(a.label)+'</button>';}).join('');
  ov.innerHTML='<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgT">'
    +'<div class="dialog-head"><h2 id="dlgT">'+esc(o.title)+'</h2>'+(o.desc?'<p>'+esc(o.desc)+'</p>':'')+'</div>'
    +(o.body?'<div class="dialog-body">'+o.body+'</div>':'')
    +'<div class="dialog-foot">'+btns+'</div></div>';
  document.body.appendChild(ov);
  var dlg=$('.dialog',ov);
  var api={el:dlg,
    close:function(v){ if(closed) return; closed=true; var i=OVERLAYS.indexOf(rec); if(i>=0) OVERLAYS.splice(i,1); ov.remove(); document.removeEventListener('keydown',onKey,true); try{prev&&prev.focus&&prev.focus();}catch(e){} if(o.onClose) o.onClose(v); },
    busy:function(b,btn){ busy=!!b; $$('.dialog-foot .btn',ov).forEach(function(x){ if(btn&&x===btn) setBusy(x,b); else x.disabled=!!b&&x!==btn; }); },
    error:function(m){ var e=$('.field-error',ov); if(e) e.textContent=m||''; var inp=$('.input',ov); if(inp) inp.classList.toggle('invalid',!!m); }
  };
  var rec={close:function(){ if(!busy) api.close(); }};
  OVERLAYS.push(rec);
  function onKey(e){
    if(OVERLAYS[OVERLAYS.length-1]!==rec) return;
    if(e.key==='Tab') trapFocus(dlg,e);
  }
  document.addEventListener('keydown',onKey,true);
  ov.addEventListener('mousedown',function(e){ if(e.target===ov&&!busy&&o.dismissible!==false) api.close(); });
  $$('.dialog-foot .btn',ov).forEach(function(b){ b.addEventListener('click',function(){ var a=o.actions[+b.getAttribute('data-i')]; if(a&&a.onClick) a.onClick(api,b); else api.close(a&&a.value); }); });
  var form=$('form',ov); if(form) form.addEventListener('submit',function(e){ e.preventDefault(); var p=$('.dialog-foot .btn-primary,.dialog-foot .btn-destructive',ov); if(p) p.click(); });
  hydrateIcons(ov);
  var focusEl=o.focus?$(o.focus,ov):($('.input,.textarea,.select',ov)||$('.dialog-foot .btn-outline',ov)||$('.dialog-foot .btn',ov));
  if(focusEl) setTimeout(function(){focusEl.focus();},30);
  return api;
}
function openMenu(anchor,html,onPick,opts){
  closeMenu(); opts=opts||{};
  var m=document.createElement('div'); m.className='menu'; m.setAttribute('role','menu'); m.innerHTML=html;
  document.body.appendChild(m);
  var r=anchor.getBoundingClientRect(), mw=m.offsetWidth, mh=m.offsetHeight;
  var left=Math.min(Math.max(8,r.left),window.innerWidth-mw-8);
  var top=(opts.up!==false&&r.top-mh-8>8)?r.top-mh-8:Math.min(r.bottom+8,window.innerHeight-mh-8);
  m.style.left=left+'px'; m.style.top=Math.max(8,top)+'px';
  hydrateIcons(m);
  anchor.setAttribute('aria-expanded','true');
  var rec={close:closeMenu}; OVERLAYS.push(rec); S.menu={el:m,anchor:anchor,rec:rec};
  function off(e){ if(!m.contains(e.target)&&e.target!==anchor&&!anchor.contains(e.target)) closeMenu(); }
  setTimeout(function(){document.addEventListener('mousedown',off,true);},0);
  S.menu.off=off;
  m.addEventListener('click',function(e){ var it=e.target.closest('[data-pick]'); if(it){ closeMenu(); onPick(it.getAttribute('data-pick')); } });
  var first=$('.menu-item',m); if(first) first.focus();
  m.addEventListener('keydown',function(e){
    var items=$$('.menu-item',m), i=items.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){e.preventDefault();items[(i+1)%items.length].focus();}
    if(e.key==='ArrowUp'){e.preventDefault();items[(i-1+items.length)%items.length].focus();}
  });
}
function closeMenu(){
  if(!S.menu) return;
  var m=S.menu; S.menu=null;
  document.removeEventListener('mousedown',m.off,true);
  var i=OVERLAYS.indexOf(m.rec); if(i>=0) OVERLAYS.splice(i,1);
  m.anchor.setAttribute('aria-expanded','false'); m.el.remove();
}

/* ----- Palette de commandes (Ctrl/Cmd + K) ----- */
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function commandItems(){
  var items=[
    {g:'nav',icon:'layout',label:t('nav_overview'),run:function(){go('overview');}},
    {g:'nav',icon:'key',label:t('nav_licenses'),run:function(){go('licenses');}},
    {g:'nav',icon:'monitor',label:t('nav_devices'),run:function(){go('devices');}},
    {g:'nav',icon:'bag',label:t('nav_purchases'),run:function(){go('purchases');}},
    {g:'nav',icon:'user',label:t('nav_profile'),run:function(){go('profile');}},
    {g:'nav',icon:'life',label:t('nav_support'),run:function(){go('support');}},
    {g:'act',icon:'plus',label:t('add_key'),run:addKeyDialog}
  ];
  ((S.account&&S.account.licenses)||[]).filter(isActiveLic).forEach(function(l){
    items.push({g:'act',icon:'copy',label:t('cmd_copy',{p:l.product||''}),hint:maskKey(l.license_key),run:function(){copyKey(l.id);}});
  });
  items.push({g:'act',icon:'globe',label:t('cmd_lang'),run:function(){setLang(S.lang==='fr'?'en':'fr');}});
  items.push({g:'act',icon:'logout',label:t('menu_signout'),run:signOut});
  return items;
}
function openPalette(){
  if(!S.account||$('.cmd')) return;
  closeMenu();
  var ov=document.createElement('div'); ov.className='overlay top';
  ov.innerHTML='<div class="cmd" role="dialog" aria-modal="true" aria-label="'+esc(t('search'))+'"><div class="cmd-input">'+icon('search')+'<input type="text" id="cmdInput" role="combobox" aria-expanded="true" aria-controls="cmdList" autocomplete="off" spellcheck="false" placeholder="'+esc(t('cmd_ph'))+'"/></div><div class="cmd-list" id="cmdList" role="listbox"></div><div class="cmd-foot"><span><span class="kbd">↑↓</span> '+esc(t('cmd_hint_nav'))+'</span><span><span class="kbd">↵</span> '+esc(t('cmd_hint_run'))+'</span><span><span class="kbd">Esc</span> '+esc(t('cmd_hint_esc'))+'</span></div></div>';
  document.body.appendChild(ov);
  var all=commandItems(), shown=[], sel=0, input=$('#cmdInput',ov), list=$('#cmdList',ov), prev=document.activeElement;
  function draw(){
    var q=norm(input.value.trim());
    shown=all.filter(function(it){return !q||norm(it.label).indexOf(q)>=0;});
    if(sel>=shown.length) sel=Math.max(0,shown.length-1);
    if(!shown.length){ list.innerHTML='<div class="cmd-empty">'+esc(t('cmd_empty'))+'</div>'; return; }
    var html='',last='';
    shown.forEach(function(it,i){
      if(it.g!==last){ last=it.g; html+='<div class="cmd-group">'+esc(t(it.g==='nav'?'cmd_nav':'cmd_actions'))+'</div>'; }
      html+='<button type="button" class="cmd-item" role="option" data-i="'+i+'" aria-selected="'+(i===sel)+'" id="cmd-'+i+'">'+icon(it.icon)+'<span>'+esc(it.label)+'</span>'+(it.hint?'<small class="mono">'+esc(it.hint)+'</small>':'')+'</button>';
    });
    list.innerHTML=html;
    input.setAttribute('aria-activedescendant','cmd-'+sel);
    var s=$('[aria-selected="true"]',list); if(s&&s.scrollIntoView) s.scrollIntoView({block:'nearest'});
  }
  function run(i){ var it=shown[i]; if(!it) return; rec.close(); setTimeout(it.run,0); }
  var rec={close:function(){ var i=OVERLAYS.indexOf(rec); if(i>=0) OVERLAYS.splice(i,1); ov.remove(); try{prev&&prev.focus&&prev.focus();}catch(e){} }};
  OVERLAYS.push(rec);
  input.addEventListener('input',function(){sel=0;draw();});
  input.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(shown.length-1,sel+1);draw();}
    else if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,sel-1);draw();}
    else if(e.key==='Home'){e.preventDefault();sel=0;draw();}
    else if(e.key==='End'){e.preventDefault();sel=Math.max(0,shown.length-1);draw();}
    else if(e.key==='Enter'){e.preventDefault();run(sel);}
  });
  list.addEventListener('click',function(e){var b=e.target.closest('.cmd-item'); if(b) run(+b.getAttribute('data-i'));});
  list.addEventListener('mousemove',function(e){var b=e.target.closest('.cmd-item'); if(b&&+b.getAttribute('data-i')!==sel){sel=+b.getAttribute('data-i'); $$('.cmd-item',list).forEach(function(x,i){x.setAttribute('aria-selected',i===sel);});}});
  ov.addEventListener('mousedown',function(e){ if(e.target===ov) rec.close(); });
  draw(); input.focus();
}

/* ===================== Actions ===================== */
function copyLegacy(text){
  return new Promise(function(res,rej){
    try{ var ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;opacity:0;top:0;left:0'; document.body.appendChild(ta); ta.select();
      var ok=document.execCommand('copy'); ta.remove(); ok?res():rej(new Error('copy')); }catch(e){rej(e);}
  });
}
function copyText(text){
  if(navigator.clipboard&&window.isSecureContext){ return navigator.clipboard.writeText(text).catch(function(){ return copyLegacy(text); }); }
  return copyLegacy(text);
}
function copyKey(id,btn){
  var l=findLic(id); if(!l) return;
  copyText(l.license_key).then(function(){
    toast('success',t('key_copied'),t('key_copied_d'));
    if(btn){ var old=btn.innerHTML; btn.innerHTML=icon('check')+'<span>'+esc(t('copied'))+'</span>'; setTimeout(function(){ if(btn.isConnected) btn.innerHTML=old; },1600); }
  }).catch(function(){ toast('error',t('copy_failed'),t('copy_failed_d')); });
}
function addKeyDialog(){
  var d=openDialog({
    title:t('key_title'),desc:t('key_d'),
    body:'<form novalidate><div class="field"><label class="label" for="keyInput">'+esc(t('key_label'))+'</label><input id="keyInput" class="input mono" type="text" autocomplete="off" spellcheck="false" maxlength="64" placeholder="RUSHR-XXXX-XXXX-XXXX"/><div class="hint">'+esc(t('key_hint'))+'</div><div class="field-error" role="alert"></div></div></form>',
    actions:[
      {label:t('cancel'),cls:'btn-outline',value:false},
      {label:t('key_add'),cls:'btn-primary',onClick:async function(api,btn){
        var inp=$('#keyInput',api.el), key=inp.value.trim();
        if(!key){ api.error(t('key_err_empty')); inp.focus(); return; }
        api.error(''); api.busy(true,btn);
        try{
          var r=await SB.rpc('claim_license',{p_key:key});
          if(r.error) throw r.error;
          var newId=r.data&&r.data.id;
          await refreshAccount();
          api.busy(false,btn); api.close(true);
          toast('success',t('key_ok'),t('key_ok_d'));
          if(S.route!=='licenses') go('licenses');
          if(newId) setTimeout(function(){ var c=$('[data-lic="'+newId+'"]'); if(c){ c.classList.add('flash'); c.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(function(){c.classList.remove('flash');},1800);} },60);
        }catch(ex){
          api.busy(false,btn);
          var m=(ex&&ex.message)||'';
          if(/LICENSE_NOT_FOUND/.test(m)) api.error(t('key_err_nf'));
          else if(/LICENSE_ALREADY_CLAIMED/.test(m)) api.error(t('key_err_claimed'));
          else { console.error('addKey failed:',ex); api.error(t('key_err')); }
          inp.focus();
        }
      }}
    ]
  });
  return d;
}
function freeDeviceDialog(id){
  openDialog({
    title:t('free_title'),desc:t('free_d'),focus:'.dialog-foot .btn-outline',
    actions:[
      {label:t('cancel'),cls:'btn-outline',value:false},
      {label:t('free_confirm'),cls:'btn-destructive',onClick:async function(api,btn){
        api.busy(true,btn);
        try{
          var r=await SB.functions.invoke('release_device',{body:{device_id:id}});
          if(r.error) throw r.error;
          var at=r.data&&r.data.slot_frees_at;
          await refreshAccount();
          api.busy(false,btn); api.close(true);
          toast('success',t('free_ok'),at?t('free_ok_d',{d:fmtDate(at)}):t('free_ok_d2'));
        }catch(ex){
          console.error('release failed:',ex);
          api.busy(false,btn); api.close(false);
          toast('error',t('free_err'));
        }
      }}
    ]
  });
}
async function setConsent(value){
  var b=S.account&&S.account.beta_signup; if(!b) return;
  var before=JSON.parse(JSON.stringify(b));
  // mise à jour immédiate de l'interface, annulée si le serveur refuse
  if(value){ b.marketing_consent_at=new Date().toISOString(); b.marketing_consent_source='account'; b.unsubscribed_at=null; }
  else { b.unsubscribed_at=b.unsubscribed_at||new Date().toISOString(); b.marketing_consent_at=null; b.marketing_consent_source='account-withdrawn'; }
  renderView(false); updateChrome();
  try{
    var r=await SB.rpc('set_my_marketing_consent',{p_consent:value});
    if(r.error) throw r.error;
    toast('success',value?t('ml_on_toast'):t('ml_off_toast'));
    refreshAccount(true);
  }catch(ex){
    console.error('setConsent failed:',ex);
    S.account.beta_signup=before; renderView(false); updateChrome();
    toast('error',t('ml_err'));
  }
}
async function saveProfile(btn){
  var d=profileDraft(); setBusy(btn,true);
  var patch={full_name:d.name.trim()||null,language:d.lang,updated_at:new Date().toISOString()};
  try{
    var r=await SB.from('profiles').update(patch).eq('id',S.account.user.id);
    if(r.error) throw r.error;
    S.account.profile=Object.assign({},S.account.profile||{},patch);
    S.draft=null;
    if(patch.language!==S.lang) setLang(patch.language); else { renderView(false); updateChrome(); }
    toast('success',t('pf_ok'));
  }catch(ex){
    console.error('saveProfile failed:',ex); setBusy(btn,false);
    toast('error',t('pf_err'));
  }
}
async function sendTicket(form){
  var btn=$('[type=submit]',form), subj=$('[name=subject]',form).value.trim(), msg=$('[name=message]',form).value.trim(), err=$('.field-error',form);
  err.textContent=''; if(!msg){ err.textContent=t('sp_err_empty'); $('[name=message]',form).focus(); return; }
  setBusy(btn,true);
  try{
    var r=await SB.rpc('submit_support_ticket',{p_subject:subj,p_message:msg});
    if(r.error) throw r.error;
    var tk=(r.data&&r.data.message)?r.data:{subject:subj||'(sans sujet)',message:msg,status:'OPEN',created_at:new Date().toISOString()};
    S.tickets=[tk].concat(S.tickets||[]);
    toast('success',t('sp_ok'),t('sp_ok_d'));
    renderView(false);
  }catch(ex){
    console.error('ticket failed:',ex); setBusy(btn,false); err.textContent=t('sp_err');
  }
}

/* ===================== Rendu des vues ===================== */
function pageHead(title,desc,actions){
  return '<div class="page-head"><div><h1>'+esc(title)+'</h1>'+(desc?'<p>'+esc(desc)+'</p>':'')+'</div>'+(actions?'<div class="page-actions">'+actions+'</div>':'')+'</div>';
}
function addKeyBtn(){return '<button type="button" class="btn btn-primary" data-action="add-key">'+icon('plus')+'<span>'+esc(t('add_key'))+'</span></button>';}
function emptyState(ic,title,desc,btn){
  return '<div class="empty"><div class="empty-icon">'+icon(ic)+'</div><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p>'+(btn||'')+'</div>';
}
function skeletonView(){
  var sk=function(w,h,x){return '<div class="skeleton" style="width:'+w+';height:'+h+'px;'+(x||'')+'"></div>';};
  var card=function(){return '<div class="card"><div class="card-content" style="padding:20px">'+sk('40%',16,'margin-bottom:14px')+sk('100%',12,'margin-bottom:10px')+sk('85%',12,'margin-bottom:10px')+sk('60%',12)+'</div></div>';};
  return '<div class="page-head"><div>'+sk('220px',28,'margin-bottom:10px')+sk('340px',14)+'</div></div>'
    +'<div class="stats">'+[1,2,3,4].map(function(){return '<div class="card stat">'+sk('50%',12,'margin-bottom:12px')+sk('40%',26,'margin-bottom:10px')+sk('70%',10)+'</div>';}).join('')+'</div>'
    +'<div class="grid-2"><div class="stack">'+card()+card()+'</div><div class="stack">'+card()+'</div></div>';
}

/* ---- Vue d'ensemble ---- */
function consentAlert(){
  if(consentState()!=='legacy'||laterSet()) return '';
  return '<div class="alert" style="margin-bottom:16px">'+icon('mail')+'<div><div class="alert-title">'+esc(t('ml_legacy_t'))+'</div><div class="alert-desc">'+esc(t('ml_legacy_d'))+'</div>'
    +'<div class="alert-actions"><button type="button" class="btn btn-primary btn-sm" data-action="consent-yes">'+esc(t('ml_yes'))+'</button><button type="button" class="btn btn-outline btn-sm" data-action="consent-no">'+esc(t('ml_no'))+'</button><button type="button" class="btn btn-ghost btn-sm" data-action="consent-later">'+esc(t('ml_later'))+'</button></div></div></div>';
}
function productBadge(l){
  var p=String(l.product||'').toUpperCase();
  return p?'<span class="badge '+(isRushr(p)?'badge-rushr':'badge-product')+'">'+esc(l.product)+'</span>':'';
}
function renderOverview(){
  var a=S.account, lics=a.licenses||[], active=lics.filter(isActiveLic), seats=seatTotals(lics), last=lastActivity(lics);
  var pct=seats.max?Math.min(100,Math.round(seats.used/seats.max*100)):0;
  var ver=lics.length?latestVersion():null;
  var stats=''
   +'<div class="card stat"><div class="s-label"><span>'+esc(t('st_licenses'))+'</span>'+icon('key')+'</div><div class="s-value">'+lics.length+'</div><div class="s-sub">'+esc(t('st_active',{n:active.length}))+'</div></div>'
   +'<div class="card stat"><div class="s-label"><span>'+esc(t('st_devices'))+'</span>'+icon('monitor')+'</div><div class="s-value">'+seats.used+'<small> / '+seats.max+'</small></div><div class="progress'+(seats.max&&seats.used>=seats.max?' full':'')+'"><i style="width:'+pct+'%"></i></div><div class="s-sub">'+esc(t('st_slots'))+'</div></div>'
   +'<div class="card stat"><div class="s-label"><span>'+esc(t('st_last'))+'</span>'+icon('clock')+'</div><div class="s-value" style="font-size:20px;margin-top:10px">'+(last?esc(fmtRel(last.at)):'—')+'</div><div class="s-sub">'+esc(last?(last.name||t('device')):t('st_last_none'))+'</div></div>'
   +(ver
     ?'<div class="card stat"><div class="s-label"><span>'+esc(t('st_version'))+'</span>'+icon('download')+'</div><div class="s-value" style="font-size:20px;margin-top:10px">'+esc(ver.latest_version)+'</div><div class="s-sub">'+esc(t('st_version_sub'))+'</div></div>'
     :'<div class="card stat"><div class="s-label"><span>'+esc(t('st_member'))+'</span>'+icon('user')+'</div><div class="s-value" style="font-size:20px;margin-top:10px">'+esc(fmtDate(a.user.created_at))+'</div><div class="s-sub">'+esc(t('st_member_sub'))+'</div></div>');

  // licences (aperçu)
  var licRows=lics.length?lics.slice(0,4).map(function(l){
    var n=(l.activations||[]).filter(occupies).length;
    return '<div class="list-row"><span class="ico-box '+(isRushr(l.product)?'rushr':'green')+'">'+icon('key')+'</span><div class="lr-main"><div class="lr-title">'+productBadge(l)+'<span class="mono muted" style="font-size:12.5px">'+esc(maskKey(l.license_key))+'</span></div><div class="lr-sub">'+esc(t('slots_n',{u:n,m:l.max_devices}))+(l.plan?' · '+esc(l.plan):'')+'</div></div>'+statusBadge(l)
      +'<button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="copy-key" data-id="'+esc(l.id)+'" aria-label="'+esc(t('copy_key'))+'" title="'+esc(t('copy_key'))+'">'+icon('copy')+'</button></div>';
  }).join(''):emptyState('key',t('empty_lic_t'),t('empty_lic_d'),'<div class="row" style="margin-top:12px">'+addKeyBtn()+'<a class="btn btn-outline" href="claim">'+esc(t('claim_beta'))+'</a></div>');
  var licCard='<div class="card card-flush"><div class="card-header" style="padding-bottom:14px"><div><div class="card-title">'+esc(t('card_licenses'))+'</div></div><a class="btn btn-ghost btn-sm" href="#licenses">'+esc(t('see_all'))+icon('chevron')+'</a></div><div style="border-top:1px solid var(--border)">'+licRows+'</div></div>';

  // appareils (aperçu)
  var devs=allDevices(lics).filter(function(x){return occupies(x.a);}).sort(function(x,y){return new Date(y.a.last_check_at||0)-new Date(x.a.last_check_at||0);}).slice(0,4);
  var devRows=devs.length?devs.map(function(x){
    var st=deviceStatus(x.a);
    return '<div class="list-row"><span class="ico-box">'+icon('monitor')+'</span><div class="lr-main"><div class="lr-title">'+esc(x.a.machine_name||t('device'))+'</div><div class="lr-sub">'+(x.a.app_version?'v'+esc(x.a.app_version)+' · ':'')+esc(fmtRel(x.a.last_check_at))+'</div></div><span class="badge '+st.cls+'">'+esc(st.label)+'</span></div>';
  }).join(''):emptyState('monitor',t('empty_dev_t'),t('empty_dev_d'));
  var devCard='<div class="card card-flush"><div class="card-header" style="padding-bottom:14px"><div><div class="card-title">'+esc(t('card_devices'))+'</div></div><a class="btn btn-ghost btn-sm" href="#devices">'+esc(t('manage'))+icon('chevron')+'</a></div><div style="border-top:1px solid var(--border)">'+devRows+'</div></div>';

  var side=downloadCard(lics)
    +'<div class="card"><div class="card-header"><div><div class="card-title">'+esc(t('help_title'))+'</div><div class="card-description">'+esc(t('help_d'))+'</div></div></div><div class="card-content"><a class="btn btn-outline btn-block" href="#support">'+icon('life')+'<span>'+esc(t('help_btn'))+'</span></a></div></div>';

  return consentAlert()
    +pageHead(t('hello',{name:firstName()}),t('overview_sub'),addKeyBtn())
    +'<div class="stats">'+stats+'</div>'
    +'<div class="grid-2"><div class="stack">'+licCard+devCard+'</div><div class="stack">'+side+'</div></div>';
}
function latestVersion(){
  var v=S.versions; if(!v||!v.length) return null;
  var p=detectPlatform(); return v.filter(function(x){return x.platform===p;})[0]||v[0];
}
// Comptage des téléchargements par logiciel (table app_versions sans colonne « product » pour l'instant -> RUSHR).
function dlAttrs(v){ return 'data-action="track-dl" data-product="'+esc((v&&v.product)||'RUSHR')+'" data-platform="'+esc(v.platform)+'" data-version="'+esc(v.latest_version)+'"'; }
function trackDownload(el){
  try{ SB.rpc('track_download',{p_product:el.getAttribute('data-product'),p_platform:el.getAttribute('data-platform'),p_version:el.getAttribute('data-version')}).then(function(){},function(){}); }catch(e){}
}
function downloadCard(lics){
  var v=S.versions; if(!lics.length||!v||!v.length) return '';
  var p=detectPlatform(), cur=v.filter(function(x){return x.platform===p;})[0]||v[0], other=v.filter(function(x){return x.platform!==cur.platform;})[0];
  var os=function(x){return t('platform_'+(x==='mac'?'mac':'windows'));};
  var url=safeUrl(cur.download_url);
  var otherUrl=other&&safeUrl(other.download_url);
  return '<div class="card"><div class="card-header"><div><div class="card-title">'+esc(t('dl_title'))+'</div><div class="card-description">v'+esc(cur.latest_version)+' · '+esc(t('dl_beta'))+'</div></div><span class="ico-box rushr">'+icon('download')+'</span></div><div class="card-content">'
    +(url?'<a class="btn btn-primary btn-block" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" '+dlAttrs(cur)+'>'+icon('download')+'<span>'+esc(t('dl_for',{os:os(cur.platform)}))+'</span></a>':'')
    +(otherUrl?'<a class="hint link" style="display:inline-block;margin-top:10px" href="'+esc(otherUrl)+'" target="_blank" rel="noopener noreferrer" '+dlAttrs(other)+'>'+esc(t('dl_other',{os:os(other.platform)}))+'</a>':'')
    +(cur.changelog?'<details class="notes"><summary>'+icon('chevron','chev')+'<span>'+esc(t('dl_notes'))+'</span></summary><pre>'+esc(cur.changelog)+'</pre></details>':'')
    +'</div></div>';
}

/* ---- Licences ---- */
function renderLicenses(){
  var lics=S.account.licenses||[];
  var body;
  if(!lics.length) body='<div class="card">'+emptyState('key',t('empty_lic_t'),t('empty_lic_d'),'<div class="row" style="margin-top:12px">'+addKeyBtn()+'<a class="btn btn-outline" href="claim">'+esc(t('claim_beta'))+'</a></div>')+'</div>';
  else body=lics.map(licCard).join('');
  return pageHead(t('nav_licenses'),t('page_licenses_d'),lics.length?addKeyBtn():'')+body;
}
function licCard(l){
  var rushr=isRushr(l.product), shown=!!S.revealed[l.id];
  var n=(l.activations||[]).filter(occupies).length, max=Number(l.max_devices)||0, pct=max?Math.min(100,Math.round(n/max*100)):0;
  var pr=PRODUCTS[String(l.product||'').toUpperCase()];
  return '<article class="card lic-card'+(rushr?' rushr':'')+'" data-lic="'+esc(l.id)+'"><div class="card-content">'
    +'<div class="lic-top"><div class="lic-prod"><span class="ico-box '+(rushr?'rushr':'green')+'">'+icon('key')+'</span><div><h3>'+esc(l.product||t('nav_licenses'))+'</h3>'+(pr?'<div class="card-description" style="margin-top:1px">'+esc(pr[S.lang])+'</div>':'')+'</div></div>'+statusBadge(l)+'</div>'
    +'<div class="keybox"><code title="'+esc(shown?'':'')+'">'+esc(shown?l.license_key:maskKey(l.license_key))+'</code>'
    +'<button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="toggle-key" data-id="'+esc(l.id)+'" aria-pressed="'+shown+'" aria-label="'+esc(shown?t('hide_key'):t('show_key'))+'" title="'+esc(shown?t('hide_key'):t('show_key'))+'">'+icon(shown?'eyeoff':'eye')+'</button>'
    +'<button type="button" class="btn btn-secondary btn-sm" data-action="copy-key" data-id="'+esc(l.id)+'">'+icon('copy')+'<span>'+esc(t('copy'))+'</span></button></div>'
    +'<dl class="meta"><div><dt>'+esc(t('plan'))+'</dt><dd>'+esc(l.plan||'—')+'</dd></div><div><dt>'+esc(t('created'))+'</dt><dd>'+esc(fmtDate(l.created_at))+'</dd></div>'
    +'<div><dt>'+esc(t('expires'))+'</dt><dd>'+(l.expires_at?esc(fmtDate(l.expires_at)):'<span class="muted">'+esc(t('no_expiry'))+'</span>')+'</dd></div>'
    +'<div><dt>'+esc(t('devices_word'))+'</dt><dd>'+n+' / '+max+'<div class="progress'+(max&&n>=max?' full':'')+'" style="margin-top:7px"><i style="width:'+pct+'%"></i></div></dd></div></dl>'
    +'</div><div class="card-footer"><span class="hint">'+esc(t('slots_n',{u:n,m:max}))+'</span><a class="btn btn-outline btn-sm" href="#devices">'+icon('monitor')+'<span>'+esc(t('manage_devices'))+'</span></a></div></article>';
}

/* ---- Appareils ---- */
function renderDevices(){
  var lics=S.account.licenses||[];
  if(!lics.length) return pageHead(t('nav_devices'),t('page_devices_d'))+'<div class="card">'+emptyState('monitor',t('empty_dev_t'),t('no_lic_no_dev'))+'</div>';
  return pageHead(t('nav_devices'),t('page_devices_d'))+lics.map(function(l){
    var acts=l.activations||[], n=acts.filter(occupies).length, max=Number(l.max_devices)||0, pct=max?Math.min(100,Math.round(n/max*100)):0;
    var rows=acts.length?'<div class="dev-head"><span>'+esc(t('dev_col_name'))+'</span><span>'+esc(t('dev_col_activated'))+'</span><span>'+esc(t('dev_col_seen'))+'</span><span>'+esc(t('dev_col_status'))+'</span><span></span></div>'
      +acts.map(function(a){
        var st=deviceStatus(a);
        return '<div class="dev-row"><div class="dev-name"><span class="ico-box">'+icon('monitor')+'</span><div style="min-width:0"><b>'+esc(a.machine_name||t('device'))+'</b><small>'+(a.app_version?'v'+esc(a.app_version):'')+'</small></div></div>'
          +'<div class="dev-cell"><span class="dev-label">'+esc(t('dev_col_activated'))+'</span><span>'+esc(fmtDate(a.activated_at))+'</span></div>'
          +'<div class="dev-cell"><span class="dev-label">'+esc(t('dev_col_seen'))+'</span><span>'+esc(fmtRel(a.last_check_at))+'</span></div>'
          +'<div class="dev-cell"><span class="dev-label">'+esc(t('dev_col_status'))+'</span><span><span class="badge '+st.cls+'">'+esc(st.label)+'</span>'+(st.detail?'<small>'+esc(st.detail)+'</small>':'')+'</span></div>'
          +'<div class="dev-act">'+(st.canFree?'<button type="button" class="btn btn-outline btn-sm" data-action="free-device" data-id="'+esc(a.id)+'">'+esc(t('dev_free'))+'</button>':'')+'</div></div>';
      }).join('')
      :emptyState('monitor',t('empty_dev_t'),t('empty_dev_d'));
    return '<article class="card card-flush lic-card'+(isRushr(l.product)?' rushr':'')+'" style="margin-bottom:14px"><div class="card-header" style="padding-bottom:16px"><div class="lic-prod"><span class="ico-box '+(isRushr(l.product)?'rushr':'green')+'">'+icon('key')+'</span><div><h3 style="font-size:15px;font-weight:600">'+esc(l.product||t('nav_licenses'))+' <span class="mono muted" style="font-size:12.5px;font-weight:500">'+esc(maskKey(l.license_key))+'</span></h3><div class="card-description" style="margin-top:1px">'+esc(t('slots_n',{u:n,m:max}))+'</div></div></div><div style="width:120px"><div class="progress'+(max&&n>=max?' full':'')+'"><i style="width:'+pct+'%"></i></div></div></div>'+rows+'</article>';
  }).join('');
}

/* ---- Achats ---- */
function renderPurchases(){
  return pageHead(t('nav_purchases'),t('page_purchases_d'))
    +'<div class="card">'+emptyState('bag',t('pur_t'),t('pur_d'),'<span class="badge badge-secondary" style="margin-top:14px">'+esc(t('soon'))+'</span>')+'</div>';
}

/* ---- Profil ---- */
function profileDraft(){
  var p=S.account.profile||{};
  return S.draft||{name:p.full_name||'',lang:(p.language==='en')?'en':'fr'};
}
function profileDirty(){
  var p=S.account.profile||{}, d=profileDraft();
  return d.name.trim()!==String(p.full_name||'').trim()||d.lang!==((p.language==='en')?'en':'fr');
}
function renderProfile(){
  var a=S.account, d=profileDraft(), st=consentState(), b=a.beta_signup, dirty=profileDirty();
  var profileCard='<div class="card"><div class="card-header"><div><div class="card-title">'+esc(t('pf_title'))+'</div><div class="card-description">'+esc(t('pf_d'))+'</div></div></div><form id="profileForm" novalidate><div class="card-content">'
    +'<div class="row" style="margin-bottom:18px"><span class="avatar avatar-lg">'+esc(initials(d.name||a.user.email))+'</span><div style="min-width:0"><div style="font-weight:600">'+esc(d.name||String(a.user.email).split("@")[0])+'</div><div class="muted" style="font-size:13px;overflow:hidden;text-overflow:ellipsis">'+esc(a.user.email)+'</div></div></div>'
    +'<div class="field"><label class="label" for="pName">'+esc(t('pf_name'))+'</label><input id="pName" name="name" class="input" type="text" maxlength="80" autocomplete="name" value="'+esc(d.name)+'" placeholder="'+esc(t('pf_name_ph'))+'"/></div>'
    +'<div class="field"><label class="label" for="pEmail">'+esc(t('pf_email'))+' <span class="badge badge-success" style="margin-left:6px;height:18px;font-size:10.5px">'+esc(t('verified'))+'</span></label><input id="pEmail" class="input" type="email" readonly value="'+esc(a.user.email)+'"/><div class="hint">'+esc(t('pf_email_hint'))+'</div></div>'
    +'<div class="field"><label class="label" for="pLang">'+esc(t('pf_lang'))+'</label><select id="pLang" name="lang" class="select"><option value="fr"'+(d.lang==='fr'?' selected':'')+'>Français</option><option value="en"'+(d.lang==='en'?' selected':'')+'>English</option></select></div>'
    +'</div><div class="card-footer"><span class="hint" id="pfHint">'+esc(dirty?t('pf_dirty'):t('pf_clean'))+'</span><button type="submit" id="pfSave" class="btn btn-primary"'+(dirty?'':' disabled')+'>'+esc(t('save'))+'</button></div></form></div>';

  var mailBody='';
  if(st==='legacy'){
    mailBody='<p class="hint" style="margin-bottom:14px">'+esc(t('ml_legacy_d'))+'</p><div class="row"><button type="button" class="btn btn-primary btn-sm" data-action="consent-yes">'+esc(t('ml_yes'))+'</button><button type="button" class="btn btn-outline btn-sm" data-action="consent-no">'+esc(t('ml_no'))+'</button></div>';
  }else if(st){
    var on=(st==='yes');
    var desc=on?t('ml_on',{d:fmtDate(b.marketing_consent_at)}):(st==='unsub'?t('ml_unsub'):t('ml_none'));
    mailBody='<div class="setting"><div><label class="label" id="mlLbl">'+esc(t('ml_toggle'))+'</label><p>'+esc(desc)+'</p></div><button type="button" role="switch" class="switch" aria-labelledby="mlLbl" aria-checked="'+on+'" data-action="consent-toggle"></button></div>';
  }
  var mailCard=st?'<div class="card"><div class="card-header"><div><div class="card-title">'+esc(t('ml_title'))+'</div><div class="card-description">'+esc(t('ml_d'))+'</div></div>'+icon('mail')+'</div><div class="card-content">'+mailBody+'</div></div>':'';

  var plat=b&&b.platform==='MAC'?'macOS':'Windows';
  var accCard='<div class="card"><div class="card-header"><div class="card-title">'+esc(t('ac_title'))+'</div></div><div class="card-content"><div class="info-rows"><div><span>'+esc(t('ac_created'))+'</span><span>'+esc(fmtDate(a.user.created_at))+'</span></div>'+(b?'<div><span>'+esc(t('ac_beta'))+'</span><span>'+esc(fmtDate(b.created_at))+' · '+plat+'</span></div>':'')+'</div></div></div>';
  var mailto='mailto:contact@thebackpacklab.com?subject='+encodeURIComponent(t('dp_subject'));
  var dpCard='<div class="card"><div class="card-header"><div><div class="card-title">'+esc(t('dp_title'))+'</div><div class="card-description">'+esc(t('dp_d'))+'</div></div>'+icon('shield')+'</div><div class="card-content row" style="flex-wrap:wrap"><a class="btn btn-outline btn-sm" href="'+mailto+'">'+icon('mail')+'<span>'+esc(t('dp_rights'))+'</span></a><a class="btn btn-ghost btn-sm" href="privacy">'+esc(t('dp_policy'))+'</a></div></div>';
  return pageHead(t('nav_profile'),t('page_profile_d'))+'<div class="grid-eq"><div class="stack">'+profileCard+'</div><div class="stack">'+mailCard+accCard+dpCard+'</div></div>';
}

/* ---- Support ---- */
function renderSupport(){
  var lics=S.account.licenses||[];
  if(!lics.length){
    return pageHead(t('nav_support'),t('page_support_d'))
      +'<div class="alert warning">'+icon('alert')+'<div><div class="alert-title">'+esc(t('sp_nolic_t'))+'</div><div class="alert-desc">'+esc(t('sp_nolic_d'))+'</div><div class="alert-actions"><a class="btn btn-outline btn-sm" href="mailto:contact@thebackpacklab.com">'+icon('mail')+'<span>'+esc(t('sp_mail'))+'</span></a></div></div></div>';
  }
  var form='<div class="card"><div class="card-header"><div><div class="card-title">'+esc(t('sp_form_t'))+'</div><div class="card-description">'+esc(t('sp_form_d'))+'</div></div>'+icon('send')+'</div><form id="ticketForm" novalidate><div class="card-content">'
    +'<div class="field"><label class="label" for="tSubject">'+esc(t('sp_subject'))+'</label><input id="tSubject" name="subject" class="input" type="text" maxlength="150" placeholder="'+esc(t('sp_subject_ph'))+'"/></div>'
    +'<div class="field"><label class="label" for="tMessage">'+esc(t('sp_message'))+'</label><textarea id="tMessage" name="message" class="textarea" maxlength="5000" placeholder="'+esc(t('sp_message_ph'))+'"></textarea><div class="row-between"><div class="field-error" role="alert"></div><span class="hint" id="tCount">'+esc(t('sp_chars',{n:0}))+'</span></div></div>'
    +'</div><div class="card-footer"><span></span><button type="submit" class="btn btn-primary">'+icon('send')+'<span>'+esc(t('sp_send'))+'</span></button></div></form></div>';
  var hist;
  if(S.tickets==null){ hist='<div style="padding:18px 20px">'+[1,2,3].map(function(){return '<div class="skeleton" style="height:14px;width:80%;margin-bottom:14px"></div>';}).join('')+'</div>'; }
  else if(!S.tickets.length){ hist=emptyState('mail',t('sp_hist_empty'),''); }
  else hist=S.tickets.map(function(tk){
    var m={OPEN:['badge-warning','sp_open'],ANSWERED:['badge-success','sp_answered'],CLOSED:['badge-secondary','sp_closed']}[String(tk.status||'OPEN').toUpperCase()]||['badge-secondary','sp_open'];
    var subj=(tk.subject&&tk.subject!=='(sans sujet)')?tk.subject:t('sp_no_subject');
    return '<details class="ticket"><summary>'+icon('chevron','chev')+'<div class="t-main"><div class="lr-title" style="font-weight:500">'+esc(subj)+'</div><div class="t-sub">'+esc(fmtDate(tk.created_at))+'</div></div><span class="badge '+m[0]+'">'+esc(t(m[1]))+'</span></summary><div class="t-body">'+esc(tk.message)+'</div></details>';
  }).join('');
  var histCard='<div class="card card-flush"><div class="card-header" style="padding-bottom:14px"><div><div class="card-title">'+esc(t('sp_hist_t'))+'</div><div class="card-description">'+esc(t('sp_hist_d'))+'</div></div></div><div style="border-top:1px solid var(--border)">'+hist+'</div></div>';
  return pageHead(t('nav_support'),t('page_support_d'))+'<div class="grid-eq">'+form+histCard+'</div>';
}

/* ===================== Routage & chrome ===================== */
function currentRoute(){var h=(location.hash||'').replace('#',''); return ROUTES.indexOf(h)>=0?h:'overview';}
function go(r){ if(location.hash==='#'+r) onRoute(); else location.hash=r; }
function routeLabel(r){return t('nav_'+r);}
function renderView(animate){
  var v=$('#view'); if(!v||$('#app').hidden) return;
  var html;
  if(!S.account) html=skeletonView();
  else html=({overview:renderOverview,licenses:renderLicenses,devices:renderDevices,purchases:renderPurchases,profile:renderProfile,support:renderSupport}[S.route]||renderOverview)();
  // conserve la position et le focus du champ en cours de saisie pendant un re-rendu silencieux
  var keep=null,ae=document.activeElement;
  if(animate===false&&ae&&v.contains(ae)&&ae.id){ keep={id:ae.id,s:ae.selectionStart,e:ae.selectionEnd}; }
  v.innerHTML=html; hydrateIcons(v);
  if(keep){ var el=document.getElementById(keep.id); if(el){ el.focus(); try{ if(keep.s!=null) el.setSelectionRange(keep.s,keep.e); }catch(e){} } }
  if(animate!==false){ v.classList.remove('view-enter'); void v.offsetWidth; v.classList.add('view-enter'); }
}
function onRoute(){
  S.route=currentRoute();
  $$('.sb-btn').forEach(function(a){ if(a.getAttribute('data-route')===S.route) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  $('#crumb').textContent=routeLabel(S.route);
  document.title=routeLabel(S.route)+' — BACKPACK LAB';
  closeSheet(); renderView(true); window.scrollTo(0,0);
  var v=$('#view'); if(v) v.focus({preventScroll:true});
}
function updateChrome(){
  if(!S.account) return;
  var name=displayName(), email=S.account.user.email||'';
  $('#userAvatar').textContent=initials(name||email); $('#userName').textContent=name; $('#userMail').textContent=email;
  var lics=S.account.licenses||[], nDev=allDevices(lics).filter(function(x){return occupies(x.a);}).length;
  var c1=$('#cntLic'), c2=$('#cntDev');
  c1.hidden=!lics.length; c1.textContent=lics.length; c2.hidden=!nDev; c2.textContent=nDev;
}
function isMobile(){return window.matchMedia('(max-width:1023px)').matches;}
function openSheet(){ $('#app').classList.add('sheet-open'); }
function closeSheet(){ $('#app').classList.remove('sheet-open'); }
function toggleSidebar(){
  if(isMobile()){ $('#app').classList.toggle('sheet-open'); return; }
  var c=$('#app').classList.toggle('collapsed'); try{localStorage.setItem('bpl_sb',c?'1':'0');}catch(e){}
}
function setLang(l){
  S.lang=(l==='en')?'en':'fr';
  document.documentElement.lang=S.lang;
  try{localStorage.setItem('bpl_lang',S.lang);}catch(e){}
  applyStatic();
  if(S.account){ renderView(false); updateChrome(); $('#crumb').textContent=routeLabel(S.route); document.title=routeLabel(S.route)+' — BACKPACK LAB'; }
}
function applyStatic(){
  $$('[data-t]').forEach(function(el){el.textContent=t(el.getAttribute('data-t'));});
  $$('[data-t-ph]').forEach(function(el){el.setAttribute('placeholder',t(el.getAttribute('data-t-ph')));});
  $$('[data-lang]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-lang')===S.lang));});
  var sb=$('#sbToggle'); if(sb) sb.setAttribute('aria-label',t('menu'));
  var cb=$('#cmdBtn'); if(cb) cb.setAttribute('aria-label',t('search'));
  var rb=$('#resendBtn'); if(rb&&!S.resendTimer) rb.textContent=t('code_resend');
}

/* ===================== Données ===================== */
async function fetchAccount(){
  var r=await SB.rpc('get_my_account'); if(r.error) throw r.error; S.account=r.data;
}
async function refreshAccount(silent){
  await fetchAccount(); updateChrome(); renderView(false);
}
async function loadVersions(){
  try{
    var r=await SB.from('app_versions').select('platform,latest_version,download_url,changelog,mandatory');
    if(!r.error&&r.data) { S.versions=r.data; if(S.account&&S.route==='overview') renderView(false); }
  }catch(e){}
}
async function loadTickets(){
  try{
    var r=await SB.from('support_tickets').select('subject,message,status,created_at').order('created_at',{ascending:false}).limit(20);
    S.tickets=(r.error||!r.data)?[]:r.data;
  }catch(e){S.tickets=[];}
  if(S.account&&S.route==='support') renderView(false);
}

/* ===================== Authentification ===================== */
function showAuth(step){
  $('#app').hidden=true; $('#auth').hidden=false;
  $('#step-email').hidden=(step==='code'); $('#step-code').hidden=(step!=='code');
  var f=(step==='code')?$('#codeInput'):$('#emailInput'); if(f) setTimeout(function(){f.focus();},40);
}
function showApp(){
  $('#auth').hidden=true; $('#app').hidden=false;
  try{ if(localStorage.getItem('bpl_sb')==='1') $('#app').classList.add('collapsed'); }catch(e){}
  onRoute();
}
function startResendTimer(){
  var btn=$('#resendBtn'); clearInterval(S.resendTimer); S.resendAt=Date.now()+30000;
  function tick(){
    var left=Math.ceil((S.resendAt-Date.now())/1000);
    if(left<=0){ clearInterval(S.resendTimer); S.resendTimer=null; btn.disabled=false; btn.textContent=t('code_resend'); }
    else { btn.disabled=true; btn.textContent=t('code_resend_in',{s:left}); }
  }
  tick(); S.resendTimer=setInterval(tick,1000);
}
async function sendCode(email,isResend){
  var btn=isResend?$('#resendBtn'):$('#sendBtn'), err=$('#emailErr');
  err.textContent=''; $('#emailInput').classList.remove('invalid');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ err.textContent=t('err_email'); $('#emailInput').classList.add('invalid'); return false; }
  setBusy(btn,true);
  try{
    var r=await SB.auth.signInWithOtp({email:email,options:{shouldCreateUser:true}});
    if(r.error) throw r.error;
    S.pendingEmail=email; $('#codeEmail').textContent=email; $('#codeInput').value=''; $('#codeErr').textContent='';
    showAuth('code'); startResendTimer();
    if(isResend) toast('success',t('code_sent'),t('code_sent_d'));
    return true;
  }catch(ex){
    console.error('sendCode failed:',ex);
    if(isResend) toast('error',t('err_send')); else { err.textContent=t('err_send'); }
    return false;
  }finally{ if(!isResend||!S.resendTimer) setBusy(btn,false); else btn.classList.remove('loading'); }
}
async function signInGoogle(){
  var btn=$('#googleBtn'), err=$('#emailErr');
  err.textContent=''; setBusy(btn,true);
  try{
    var r=await SB.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/account',queryParams:{prompt:'select_account'}}});
    if(r.error) throw r.error;
    // la page est redirigée vers Google ; rien d'autre à faire ici
  }catch(ex){
    console.error('google sign-in failed:',ex);
    err.textContent=t('err_google'); setBusy(btn,false);
  }
}
function initGoogleButton(){
  if(!window.BPLGoogle) return;
  BPLGoogle.init({
    sb:SB, holder:$('#googleHolder'), fallback:$('#googleBtn'), lang:function(){return S.lang;},
    onSuccess:async function(){
      try{ await enterApp(); }
      catch(ex){ console.error('enterApp failed:',ex); showAuth('email'); $('#emailErr').textContent=t('err_load'); }
    },
    onError:function(){ $('#emailErr').textContent=t('err_google'); }
  });
}
async function verifyCode(){
  var btn=$('#verifyBtn'), err=$('#codeErr'), code=$('#codeInput').value.trim();
  err.textContent=''; $('#codeInput').classList.remove('invalid');
  if(!code){ err.textContent=t('err_code_empty'); return; }
  setBusy(btn,true);
  try{
    var r=await SB.auth.verifyOtp({email:S.pendingEmail,token:code,type:'email'});
    if(r.error){
      // Une adresse jamais confirmée reçoit son code en type "signup" plutôt que "email".
      r=await SB.auth.verifyOtp({email:S.pendingEmail,token:code,type:'signup'});
      if(r.error) throw r.error;
    }
  }catch(ex){
    console.error('verifyOtp failed:',ex);
    err.textContent=t('err_code'); $('#codeInput').classList.add('invalid'); setBusy(btn,false); $('#codeInput').select(); return;
  }
  try{
    await enterApp();
  }catch(ex){
    console.error('enterApp failed:',ex); err.textContent=t('err_load');
  }finally{ setBusy(btn,false); }
}
async function enterApp(){
  S.account=null; S.tickets=null; S.draft=null; S.revealed={};
  showApp();                      // coquille + squelettes immédiatement
  await fetchAccount();
  var saved=null; try{saved=localStorage.getItem('bpl_lang');}catch(e){}
  var pl=S.account.profile&&S.account.profile.language;
  if(!saved&&(pl==='fr'||pl==='en')&&pl!==S.lang) setLang(pl);
  updateChrome(); renderView(false);
  loadVersions(); loadTickets();
}
async function signOut(){
  try{ await SB.auth.signOut(); }catch(e){}
  S.account=null; S.tickets=null; S.draft=null; S.revealed={};
  closeSheet(); while(closeTopOverlay()){}
  $('#emailInput').value=''; $('#codeInput').value='';
  showAuth('email'); toast('info',t('signed_out'));
}

/* ===================== Événements ===================== */
document.addEventListener('click',function(e){
  var seg=e.target.closest('[data-lang]'); if(seg){ setLang(seg.getAttribute('data-lang')); return; }
  var el=e.target.closest('[data-action]'); if(!el) return;
  var id=el.getAttribute('data-id');
  switch(el.getAttribute('data-action')){
    case 'track-dl': trackDownload(el); break;   // le lien s'ouvre normalement
    case 'add-key': addKeyDialog(); break;
    case 'copy-key': copyKey(id,el.classList.contains('btn-secondary')?el:null); break;
    case 'toggle-key': S.revealed[id]=!S.revealed[id]; renderView(false); { var nb=$('[data-action="toggle-key"][data-id="'+id+'"]'); if(nb) nb.focus(); } break;
    case 'free-device': freeDeviceDialog(id); break;
    case 'consent-yes': setConsent(true); break;
    case 'consent-no': setConsent(false); break;
    case 'consent-later': try{sessionStorage.setItem('bpl_consent_later','1');}catch(x){} renderView(false); break;
    case 'consent-toggle': setConsent(el.getAttribute('aria-checked')!=='true'); break;
  }
});
document.addEventListener('input',function(e){
  var t0=e.target;
  if(t0.closest&&t0.closest('#profileForm')){
    S.draft={name:$('#pName').value,lang:$('#pLang').value};
    var dirty=profileDirty(); $('#pfSave').disabled=!dirty; $('#pfHint').textContent=dirty?t('pf_dirty'):t('pf_clean');
  }
  if(t0.id==='tMessage'){ $('#tCount').textContent=t('sp_chars',{n:t0.value.length}); }
});
document.addEventListener('change',function(e){
  if(e.target.id==='pLang'&&$('#profileForm')){ S.draft={name:$('#pName').value,lang:$('#pLang').value}; var d=profileDirty(); $('#pfSave').disabled=!d; $('#pfHint').textContent=d?t('pf_dirty'):t('pf_clean'); }
});
document.addEventListener('submit',function(e){
  var f=e.target;
  if(f.id==='profileForm'){ e.preventDefault(); if(profileDirty()) saveProfile($('#pfSave')); }
  else if(f.id==='ticketForm'){ e.preventDefault(); sendTicket(f); }
  else if(f.id==='step-email'){ e.preventDefault(); sendCode($('#emailInput').value.trim().toLowerCase(),false); }
  else if(f.id==='step-code'){ e.preventDefault(); verifyCode(); }
});
document.addEventListener('keydown',function(e){
  var mod=e.ctrlKey||e.metaKey;
  if(mod&&(e.key==='k'||e.key==='K')){ if(!S.account) return; e.preventDefault(); if($('.cmd')) closeTopOverlay(); else openPalette(); return; }
  if(mod&&(e.key==='b'||e.key==='B')){ if(!S.account) return; e.preventDefault(); toggleSidebar(); return; }
  if(e.key==='Escape'){ if(closeTopOverlay()) return; if($('#app')&&$('#app').classList.contains('sheet-open')) closeSheet(); }
});
window.addEventListener('hashchange',function(){ if(S.account||!$('#app').hidden) onRoute(); });
window.addEventListener('resize',function(){ if(!isMobile()) closeSheet(); });
$('#sbToggle').addEventListener('click',toggleSidebar);
$('#scrim').addEventListener('click',closeSheet);
$('#cmdBtn').addEventListener('click',openPalette);
$('#googleBtn').addEventListener('click',signInGoogle);
$('#backBtn').addEventListener('click',function(){ clearInterval(S.resendTimer); S.resendTimer=null; showAuth('email'); });
$('#resendBtn').addEventListener('click',function(){ if(S.pendingEmail) sendCode(S.pendingEmail,true); });
$('#userBtn').addEventListener('click',function(){
  var name=displayName(), mail=S.account?S.account.user.email:'';
  var html='<div class="menu-label"><b>'+esc(name)+'</b>'+esc(mail)+'</div><div class="menu-sep"></div>'
    +'<div class="menu-label" style="padding-bottom:2px">'+esc(t('menu_lang'))+'</div>'
    +'<button type="button" class="menu-item" role="menuitem" data-pick="fr"><span data-icon="globe"></span>Français'+(S.lang==='fr'?'<span class="check" data-icon="check"></span>':'')+'</button>'
    +'<button type="button" class="menu-item" role="menuitem" data-pick="en"><span data-icon="globe"></span>English'+(S.lang==='en'?'<span class="check" data-icon="check"></span>':'')+'</button>'
    +'<div class="menu-sep"></div><button type="button" class="menu-item danger" role="menuitem" data-pick="out"><span data-icon="logout"></span>'+esc(t('menu_signout'))+'</button>';
  if(S.menu&&S.menu.anchor===this){ closeMenu(); return; }
  openMenu(this,html,function(v){ if(v==='out') signOut(); else setLang(v); });
});
SB.auth.onAuthStateChange(function(ev){
  if(ev==='SIGNED_OUT'&&S.account){ S.account=null; showAuth('email'); }
});

/* ===================== Démarrage ===================== */
(async function init(){
  var saved=null; try{saved=localStorage.getItem('bpl_lang');}catch(e){}
  S.lang=saved||((navigator.language||'en').toLowerCase().indexOf('fr')===0?'fr':'en');
  document.documentElement.lang=S.lang;
  if(/Mac|iPhone|iPad/.test(navigator.platform||'')) $('#kbdHint').textContent='⌘ K';
  hydrateIcons(document); applyStatic();
  var session=null; try{ session=(await SB.auth.getSession()).data.session; }catch(e){}
  if(session){
    try{ await enterApp(); }
    catch(ex){ console.error('enterApp failed:',ex); showAuth('email'); $('#emailErr').textContent=t('err_session'); }
  }else{
    showAuth('email');
    initGoogleButton();
    // retour de Google en erreur (ex. refus de l'utilisateur) : message discret
    if(/[?&#](error|error_description)=/.test(location.search+location.hash)){
      $('#emailErr').textContent=t('err_google');
      try{ history.replaceState(null,'',location.pathname); }catch(e){}
    }
  }
})();
