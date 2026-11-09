# Modèles d'e-mails Supabase — connexion par mot de passe

À coller dans Supabase → **Authentication → Emails → Templates**. Les deux modèles contiennent
`{{ .Token }}` (le code à 6 chiffres) : le site demande ce code sur la page, il n'utilise pas de lien.
Mise en page inspirée des e-mails de code de sécurité : logo en haut à gauche, texte aligné à gauche,
code dans un cadre, sections à titres, signature ; version française puis anglaise.

## 1) « Confirm sign up » (confirmation de compte)

**Subject :** `Votre code de confirmation / Your confirmation code — BACKPACK LAB`

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
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Bienvenue chez Backpack Lab,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Voici le code à saisir pour confirmer votre adresse e-mail et activer votre compte. Il expire dans quelques minutes :</td>
        </tr>
        <!-- Code -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="center" style="padding:18px 12px 0 12px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Code de confirmation</td></tr>
              <tr><td align="center" style="padding:6px 12px 22px 22px;color:#35DC8E;font-size:40px;line-height:1.1;font-weight:800;letter-spacing:10px;">{{ .Token }}</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Cet e-mail a été envoyé car quelqu'un a saisi votre adresse pour créer un compte Backpack Lab. Si ce n'est pas vous, ignorez simplement cet e-mail : sans ce code, aucun compte n'est activé. Ne communiquez jamais ce code à personne.</td>
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
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Confirm your account</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">Welcome to Backpack Lab! Enter the code above to confirm your email address and activate your account. The code expires in a few minutes. If you didn't create this account, you can safely ignore this email, and never share this code with anyone.</td>
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

## 2) « Reset password » (mot de passe oublié)

**Subject :** `Votre code pour changer de mot de passe / Your password reset code — BACKPACK LAB`

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
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Mot de passe oublié ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Vous avez demandé à changer le mot de passe de votre compte Backpack Lab. Saisissez ce code sur la page de connexion pour choisir un nouveau mot de passe. Il expire dans quelques minutes :</td>
        </tr>
        <!-- Code -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="center" style="padding:18px 12px 0 12px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Code de vérification</td></tr>
              <tr><td align="center" style="padding:6px 12px 22px 22px;color:#35DC8E;font-size:40px;line-height:1.1;font-weight:800;letter-spacing:10px;">{{ .Token }}</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe actuel reste valable et personne ne peut le modifier sans ce code. Ne communiquez jamais ce code à personne.</td>
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
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Forgot your password?</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">You asked to change your Backpack Lab password. Enter the code above on the sign-in page, then choose your new password (at least 10 characters). The code expires in a few minutes. If you didn't request this, ignore this email: your current password stays valid, and never share this code with anyone.</td>
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

## 3) « Magic Link » (code de connexion par e-mail)

**Subject :** `Votre code de connexion / Your sign-in code — BACKPACK LAB`

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
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Votre code de connexion,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Saisissez ce code pour vérifier votre adresse e-mail et vous connecter à votre compte Backpack Lab. Il expire dans quelques minutes :</td>
        </tr>
        <!-- Code -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="center" style="padding:18px 12px 0 12px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Code de connexion</td></tr>
              <tr><td align="center" style="padding:6px 12px 22px 22px;color:#35DC8E;font-size:40px;line-height:1.1;font-weight:800;letter-spacing:10px;">{{ .Token }}</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Si vous n'avez pas demandé ce code, ignorez simplement cet e-mail : personne ne peut se connecter à votre compte sans lui. Ne communiquez jamais ce code à personne.</td>
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
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Your sign-in code</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">Enter the code above to verify your email address and sign in to your Backpack Lab account. The code expires in a few minutes. If you didn't request this code, you can safely ignore this email, and never share it with anyone.</td>
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

## 4) « Password changed » (notification de changement de mot de passe)

À activer dans **Authentication → Emails → Security notifications → Password changed** : interrupteur « Enable notification », puis coller le contenu ci-dessous et enregistrer. Cet e-mail est envoyé après chaque changement de mot de passe (y compris après « Mot de passe oublié ? »).

**Subject :** `Votre mot de passe a été modifié / Your password was changed — BACKPACK LAB`

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
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Votre mot de passe a été modifié,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Le mot de passe de votre compte Backpack Lab vient d'être modifié. Si c'est bien vous, vous n'avez rien d'autre à faire.</td>
        </tr>
        <!-- Compte concerne -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="left" style="padding:16px 20px 0 20px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Compte concerné / Account</td></tr>
              <tr><td align="left" style="padding:4px 20px 18px 20px;color:#ffffff;font-size:17px;line-height:1.4;font-weight:700;word-break:break-all;">{{ .Email }}</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Si vous n'êtes pas à l'origine de ce changement, réinitialisez votre mot de passe dès maintenant sur <a href="https://thebackpacklab.com/account" style="color:#5FE8A8;text-decoration:underline;">thebackpacklab.com/account</a> (lien « Mot de passe oublié ? »), puis écrivez-nous à <a href="mailto:contact@thebackpacklab.com" style="color:#5FE8A8;text-decoration:underline;">contact@thebackpacklab.com</a>.</td>
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
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Your password was changed</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">The password for your Backpack Lab account was just changed. If this was you, there is nothing else to do. If you didn't make this change, reset your password right away at thebackpacklab.com/account ("Forgot password?") and contact us at contact@thebackpacklab.com.</td>
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

## 5) « Reauthentication » (changement de mot de passe depuis Mon compte)

**Subject :** `Votre code de confirmation / Your confirmation code — BACKPACK LAB`

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
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Confirmez votre identité,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Saisissez ce code pour confirmer le changement du mot de passe de votre compte Backpack Lab. Il expire dans quelques minutes :</td>
        </tr>
        <!-- Code -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="center" style="padding:18px 12px 0 12px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Code de confirmation</td></tr>
              <tr><td align="center" style="padding:6px 12px 22px 22px;color:#35DC8E;font-size:40px;line-height:1.1;font-weight:800;letter-spacing:10px;">{{ .Token }}</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Si vous n'avez rien demandé, ignorez cet e-mail et changez votre mot de passe dès maintenant depuis <a href="https://thebackpacklab.com/account" style="color:#5FE8A8;text-decoration:underline;">thebackpacklab.com/account</a> : quelqu'un a peut-être accès à votre session. Ne communiquez jamais ce code à personne.</td>
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
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Confirm it's you</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">Enter the code above to confirm the password change on your Backpack Lab account. The code expires in a few minutes. If you didn't request this, ignore this email and change your password right away at thebackpacklab.com/account: someone may have access to your session. Never share this code with anyone.</td>
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

## 6) « Change Email Address » (changement d'adresse, envoyé à l'ancienne ET à la nouvelle adresse)

**Subject :** `Confirmez votre nouvelle adresse / Confirm your new email address — BACKPACK LAB`

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
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Confirmez le changement d'adresse,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">Une demande de changement d'adresse e-mail a été faite sur votre compte Backpack Lab : la nouvelle adresse sera {{ .NewEmail }}. Saisissez ce code pour confirmer :</td>
        </tr>
        <!-- Code -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="center" style="padding:18px 12px 0 12px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Code de confirmation</td></tr>
              <tr><td align="center" style="padding:6px 12px 22px 22px;color:#35DC8E;font-size:40px;line-height:1.1;font-weight:800;letter-spacing:10px;">{{ .Token }}</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Cet e-mail est envoyé à l'ancienne et à la nouvelle adresse, chacune avec son propre code : les deux codes sont nécessaires. Si vous n'êtes pas à l'origine de cette demande, ignorez-le et changez votre mot de passe dès maintenant depuis <a href="https://thebackpacklab.com/account" style="color:#5FE8A8;text-decoration:underline;">thebackpacklab.com/account</a>. Ne communiquez jamais ce code à personne.</td>
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
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Confirm your new email address</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">A request was made to change the email address of your Backpack Lab account to {{ .NewEmail }}. Enter the code above to confirm. This email is sent to both the old and the new address, each with its own code: both are required. If you didn't request this, ignore it and change your password right away. Never share this code.</td>
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

## 7) « Email address changed » (notification de sécurité, à activer comme « Password changed »)

**Subject :** `Votre adresse e-mail a été modifiée / Your email address was changed — BACKPACK LAB`

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
          <td align="left" style="color:#35DC8E;font-size:22px;line-height:1.3;font-weight:800;padding:0 0 12px 0;">Votre adresse e-mail a été modifiée,</td>
        </tr>
        <tr>
          <td align="left" style="color:#C8C8CC;font-size:14px;line-height:1.65;padding:0 0 22px 0;">L'adresse e-mail de votre compte Backpack Lab vient d'être modifiée. Si c'est bien vous, vous n'avez rien d'autre à faire.</td>
        </tr>
        <!-- Compte concerne -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141417;border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
              <tr><td align="left" style="padding:16px 20px 0 20px;color:#8A8A90;font-size:12px;letter-spacing:0.5px;">Ancienne adresse &rarr; nouvelle adresse / Account</td></tr>
              <tr><td align="left" style="padding:4px 20px 18px 20px;color:#ffffff;font-size:17px;line-height:1.4;font-weight:700;word-break:break-all;">{{ .OldEmail }} &rarr; {{ .Email }}</td></tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        <tr>
          <td align="left" style="color:#E4E4E7;font-size:20px;line-height:1.3;font-weight:800;padding:0 0 10px 0;">Ce n'était pas vous ?</td>
        </tr>
        <tr>
          <td align="left" style="color:#B4B4B9;font-size:13px;line-height:1.7;padding:0 0 28px 0;">Si vous n'êtes pas à l'origine de ce changement, écrivez-nous immédiatement à <a href="mailto:contact@thebackpacklab.com" style="color:#5FE8A8;text-decoration:underline;">contact@thebackpacklab.com</a> : nous sécuriserons votre compte.</td>
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
          <td align="left" style="color:#ffffff;font-size:17px;line-height:1.3;font-weight:800;padding:0 0 8px 0;">Your email address was changed</td>
        </tr>
        <tr>
          <td align="left" style="color:#9A9A9E;font-size:13px;line-height:1.7;padding:0 0 22px 0;">The email address of your Backpack Lab account was just changed. If this was you, there is nothing else to do. If you didn't make this change, contact us right away at contact@thebackpacklab.com and we will secure your account.</td>
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

## Réglages à vérifier (Authentication)

- **Sign In / Providers → Email :** « Confirm email » **activé** (indispensable), **Minimum password length = 10**.
- **Email OTP Expiration :** 600 secondes (10 minutes) conseillé.
- **Secure email change :** activé (le changement d'adresse demande un code sur l'ancienne ET la nouvelle adresse, comme le fait l'écran Mon compte).
- **Secure password change :** activé (le changement de mot de passe exige le code du modèle « Reauthentication »).
- **Security notifications :** activer « Password changed » et « Email address changed » avec les modèles 4 et 7.
- Le modèle « Magic Link » n'est plus utilisé par le site (connexion par mot de passe), mais il reste utilisé par tout autre client qui demande un code de connexion par e-mail (par exemple l'application Rushr, si elle se connecte ainsi).
