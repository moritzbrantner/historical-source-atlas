export const authPages = {
  login: {
    eyebrow: 'Willkommen zurueck',
    heroTitle:
      'Melde dich an und arbeite dort weiter, wo du zuletzt aufgehoert hast.',
    heroDescription:
      'Greife mit deiner E-Mail-Adresse und deinem Passwort auf Profil, Einstellungen und geschuetzte Bereiche zu.',
    title: 'Anmelden',
    description: 'Nutze deine Zugangsdaten, um auf die Anwendung zuzugreifen.',
    form: {
      email: 'E-Mail',
      password: 'Passwort',
      otpCode: 'Einmalpasswort',
      submit: 'Anmelden',
      submitting: 'Anmeldung laeuft...',
      requestOtp: 'Login-Code per E-Mail senden',
      requestingOtp: 'Code wird gesendet...',
      verifyOtp: 'Mit Code anmelden',
      verifyingOtp: 'Code wird geprueft...',
      otpSent:
        'Falls das Konto existiert, ist ein Login-Code per E-Mail unterwegs.',
      otpRequestError: 'Der Login-Code konnte gerade nicht gesendet werden.',
      invalidOtp: 'Das Einmalpasswort ist ungueltig oder abgelaufen.',
      invalidCredentials: 'E-Mail oder Passwort ist nicht korrekt.',
      requiredEmail: 'E-Mail ist erforderlich.',
      invalidEmail: 'Gib eine gueltige E-Mail-Adresse ein.',
      requiredPassword: 'Passwort ist erforderlich.',
      requiredOtp: 'Gib den 6-stelligen Code aus deiner E-Mail ein.',
      registerPrompt: 'Noch kein Konto?',
      registerCta: 'Registrieren',
      social: {
        divider: 'Oder weiter mit',
        providers: {
          google: 'Mit Google fortfahren',
          facebook: 'Mit Facebook fortfahren',
          x: 'Mit X fortfahren',
        },
      },
      socialErrors: {
        access_denied:
          'Die Anmeldung mit {provider} wurde abgebrochen oder verweigert.',
        missing_code:
          'Die Anmeldung mit {provider} hat keinen Autorisierungscode zurueckgegeben.',
        invalid_state:
          'Die Anmeldung mit {provider} konnte nicht verifiziert werden. Bitte versuche es erneut.',
        expired_state:
          'Die Anmeldung mit {provider} hat zu lange gedauert. Bitte versuche es erneut.',
        provider_mismatch:
          'Der Anmeldefluss mit {provider} passt nicht mehr zu dieser Browsersitzung.',
        missing_config:
          'Die Anmeldung mit {provider} ist derzeit nicht konfiguriert.',
        token_exchange_failed:
          'Die Anmeldung mit {provider} konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
        profile_fetch_failed:
          'Dein {provider}-Profil konnte nicht geladen werden. Bitte versuche es erneut.',
        identity_resolution_failed:
          'Die Anmeldung mit {provider} konnte keinem App-Konto zugeordnet werden. Bitte versuche es erneut.',
      },
    },
  },
  register: {
    eyebrow: 'Konto erstellen',
    heroTitle: 'Erstelle ein sicheres Konto und bestaetige deine E-Mail.',
    heroDescription:
      'Registriere dich mit einer gueltigen E-Mail-Adresse und einem starken Passwort. Du kannst dich anmelden, nachdem du den Link in deinem Postfach bestaetigt hast.',
    title: 'Registrieren',
    description:
      'Lege dein Konto mit Zugangsdaten an, die die Sicherheitsregeln erfuellen.',
    form: {
      name: 'Anzeigename',
      email: 'E-Mail',
      password: 'Passwort',
      confirmPassword: 'Passwort bestaetigen',
      submit: 'Konto erstellen',
      submitting: 'Konto wird erstellt...',
      success:
        'Konto erstellt. Pruefe deine E-Mails und bestaetige den Verifizierungslink, bevor du dich anmeldest.',
      requiredEmail: 'E-Mail ist erforderlich.',
      invalidEmail: 'Gib eine gueltige E-Mail-Adresse ein.',
      requiredPassword: 'Passwort ist erforderlich.',
      weakPassword:
        'Verwende mindestens 10 Zeichen mit Grossbuchstaben, Kleinbuchstaben und einer Zahl.',
      requiredConfirmPassword: 'Bitte bestaetige dein Passwort.',
      passwordMismatch: 'Die Passwoerter stimmen nicht ueberein.',
      nameTooLong: 'Der Anzeigename darf hoechstens 80 Zeichen lang sein.',
      continue: 'Weiter',
      back: 'Zurueck',
      genericError:
        'Dein Konto konnte gerade nicht erstellt werden. Bitte versuche es erneut.',
      loginPrompt: 'Bereits registriert?',
      loginCta: 'Anmelden',
      social: {
        divider: 'Oder weiter mit',
        providers: {
          google: 'Mit Google fortfahren',
          facebook: 'Mit Facebook fortfahren',
          x: 'Mit X fortfahren',
        },
      },
      socialErrors: {
        access_denied:
          'Die Anmeldung mit {provider} wurde abgebrochen oder verweigert.',
        missing_code:
          'Die Anmeldung mit {provider} hat keinen Autorisierungscode zurueckgegeben.',
        invalid_state:
          'Die Anmeldung mit {provider} konnte nicht verifiziert werden. Bitte versuche es erneut.',
        expired_state:
          'Die Anmeldung mit {provider} hat zu lange gedauert. Bitte versuche es erneut.',
        provider_mismatch:
          'Der Anmeldefluss mit {provider} passt nicht mehr zu dieser Browsersitzung.',
        missing_config:
          'Die Anmeldung mit {provider} ist derzeit nicht konfiguriert.',
        token_exchange_failed:
          'Die Anmeldung mit {provider} konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
        profile_fetch_failed:
          'Dein {provider}-Profil konnte nicht geladen werden. Bitte versuche es erneut.',
        identity_resolution_failed:
          'Die Anmeldung mit {provider} konnte keinem App-Konto zugeordnet werden. Bitte versuche es erneut.',
      },
      resetPasswordTitle: 'Passwort fuer ein bestehendes Konto zuruecksetzen?',
      resetPasswordDescription:
        'Sende einen sicheren Reset-Link, ohne diese Seite zu verlassen.',
      resetPasswordEmail: 'Konto-E-Mail',
      resetPasswordSubmit: 'Reset-Link senden',
      resetPasswordSubmitting: 'Reset-Link wird gesendet...',
      resetPasswordSuccess:
        'Falls das Konto existiert, ist der Reset-Link unterwegs.',
      resetPasswordGenericError:
        'Der Reset-Link konnte gerade nicht gesendet werden.',
    },
  },
  resetPassword: {
    eyebrow: 'Kontowiederherstellung',
    title: 'Neues Passwort festlegen',
    description:
      'Nutze den sicheren Token aus deiner E-Mail, um ein neues Passwort zu setzen.',
    missingToken:
      'Dieser Reset-Link ist unvollstaendig oder wurde bereits verwendet.',
    success: 'Dein Passwort wurde aktualisiert. Du kannst dich jetzt anmelden.',
    loginCta: 'Zur Anmeldung',
    form: {
      password: 'Neues Passwort',
      confirmPassword: 'Neues Passwort bestaetigen',
      submit: 'Passwort aktualisieren',
      submitting: 'Passwort wird aktualisiert...',
      requiredPassword: 'Passwort ist erforderlich.',
      weakPassword:
        'Verwende mindestens 10 Zeichen mit Grossbuchstaben, Kleinbuchstaben und einer Zahl.',
      requiredConfirmPassword: 'Bitte bestaetige dein Passwort.',
      passwordMismatch: 'Die Passwoerter stimmen nicht ueberein.',
      genericError:
        'Das Passwort konnte mit diesem Link nicht zurueckgesetzt werden.',
    },
  },
  verifyEmail: {
    eyebrow: 'Kontobestaetigung',
    title: 'E-Mail bestaetigen',
    description:
      'Wir pruefen gerade den sicheren Bestaetigungslink aus deiner E-Mail.',
    verifying: 'Deine E-Mail-Adresse wird bestaetigt...',
    success: 'Deine E-Mail ist bestaetigt. Du kannst dein Konto weiter nutzen.',
    error: 'Dieser Bestaetigungslink ist ungueltig oder abgelaufen.',
    loginCta: 'Zur Anmeldung',
    registerCta: 'Weiteres Konto erstellen',
  },
};
