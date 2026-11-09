# Invitation à créer un mot de passe (comptes déjà enregistrés)

Texte prêt à envoyer aux adresses déjà enregistrées (inscrits beta et comptes créés par code), depuis BP CENTER
ou Resend. **Ce n'est pas un modèle Supabase** : rien n'est envoyé automatiquement.

- **Objet :** `Créez votre mot de passe Backpack Lab / Create your Backpack Lab password`
- **Lien du bouton :** `https://thebackpacklab.com/account?mode=password` (ouvre directement « Crée ton mot de passe » ;
  on peut préremplir l'adresse avec `&email=adresse@exemple.com`).
- Message de service lié à la sécurité du compte : un seul envoi suffit, pas de relance automatique.

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0B;margin:0;padding:36px 0;font-family:Inter,Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center" style="padding:0 16px;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;">
        <!-- Logo -->
        <tr>
          <td align="left" style="padding:0 0 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td valign="middle"><img src="https://thebackpacklab.com/assets/bp-mark-120.png" width="40" height="40" alt="" style="display:block;border:0;outline:none;width:40px;height:40px;"></td>
              <td valign="middle" style="padding-left:12px;color:#ffffff;font-size:16px;font-weight:800;letter-spacing:1px;">BACKPACK&nbsp;LAB</td>
            </tr></table>
          </td>
        </tr>
        <!-- Salutation + introduction -->
        <tr>
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Créez votre mot de passe,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Backpack Lab passe à une connexion par e-mail et mot de passe, plus sûre. Votre adresse est déjà enregistrée sur thebackpacklab.com (inscription à la beta de Rushr) : il vous suffit de choisir votre mot de passe, en deux minutes.</td>
        </tr>
        <!-- Bouton -->
        <tr>
          <td align="left" style="padding:0 0 30px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td align="center" bgcolor="#35DC8E" style="border-radius:10px;">
                <a href="https://thebackpacklab.com/account?mode=password" style="display:inline-block;padding:14px 28px;color:#04150C;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">Créer mon mot de passe</a>
              </td>
            </tr></table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Pourquoi ce changement ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Jusqu'ici, la connexion se faisait uniquement avec un code reçu par e-mail. Un mot de passe, associé si vous le souhaitez à une double authentification par e-mail, renforce la sécurité de vos licences et de vos téléchargements. Vous pouvez aussi continuer à vous connecter avec Google ou Microsoft. Le bouton ci-dessus vous envoie un code pour choisir votre mot de passe.</td>
        </tr>
        <!-- Signature -->
        <tr>
          <td align="left" style="padding:0 0 30px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="border-left:3px solid #35DC8E;padding:2px 0 2px 14px;color:#C8C8CC;font-size:13px;line-height:1.6;">Cordialement,<br><b style="color:#ffffff;">L'équipe Backpack Lab</b></td>
            </tr></table>
          </td>
        </tr>
        <!-- Separateur + version anglaise -->
        <tr><td style="padding:0 0 24px 0;"><div style="border-top:1px solid rgba(255,255,255,0.08);font-size:0;line-height:0;">&nbsp;</div></td></tr>
        <tr>
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Create your password</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">Backpack Lab is moving to a safer sign-in with email and password. Your address is already registered on thebackpacklab.com (Rushr beta sign-up): just choose your password, it takes two minutes. Use the button above: we send you a code to set it. You can also keep signing in with Google or Microsoft.</td>
        </tr>
        <tr>
          <td align="left" style="padding:0 0 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="border-left:3px solid #35DC8E;padding:2px 0 2px 14px;color:#9A9A9E;font-size:13px;line-height:1.6;">Best regards,<br><b style="color:#ffffff;">The Backpack Lab team</b></td>
            </tr></table>
          </td>
        </tr>
        <!-- Pied de page -->
        <tr>
          <td align="left" style="color:#5E5E64;font-size:11px;line-height:1.6;">&#169; 2026 BACKPACK LAB &#183; thebackpacklab.com</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```
