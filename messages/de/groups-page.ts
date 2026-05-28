export const groupsPage = {
  title: 'Gruppen',
  description:
    'Erstelle gemeinsame Gruppen, lade Personen ein und lege fest, wer Gruppen verwalten kann.',
  overview: {
    groupsLabel: 'Gruppen',
    invitationsLabel: 'Offene Einladungen',
    membershipsLabel: 'Mitglieder gesamt',
  },
  roles: {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MEMBER: 'Mitglied',
    VIEWER: 'Betrachter',
  },
  visibility: {
    PUBLIC: 'Oeffentlich',
    PRIVATE: 'Privat',
  },
  create: {
    title: 'Gruppe erstellen',
    description:
      'Owner koennen nach dem Erstellen Mitglieder einladen und Admins ernennen.',
    nameLabel: 'Gruppenname',
    namePlaceholder: 'Gruppenname',
    descriptionLabel: 'Gruppenbeschreibung',
    descriptionPlaceholder: 'Beschreibung',
    visibilityLabel: 'Sichtbarkeit',
    submit: 'Gruppe erstellen',
    creating: 'Wird erstellt...',
  },
  invitations: {
    title: 'Einladungen',
    description: 'Du hast {count} offene Gruppeneinladungen.',
    empty: 'Keine offenen Einladungen.',
    emptyDescription:
      'Neue Einladungen erscheinen hier, wenn dich jemand einlaedt.',
    invitedBy: 'Eingeladen von {name}',
    accept: 'Annehmen',
    accepting: 'Wird angenommen...',
    decline: 'Ablehnen',
    declining: 'Wird abgelehnt...',
  },
  groups: {
    title: 'Deine Gruppen',
    description: 'Du bist Mitglied in {count} Gruppen.',
    empty: 'Du bist noch in keiner Gruppe.',
    emptyDescription:
      'Erstelle eine Gruppe, um Mitglieder, Einladungen und Admin-Rollen zu verwalten.',
    meta: '{members} Mitglieder, {invitations} offene Einladungen',
  },
  detail: {
    back: 'Zurueck zu Gruppen',
    meta: '{members} Mitglieder, {invitations} offene Einladungen',
    chatTitle: 'Gruppenchat',
    chatDescription: 'Teile Nachrichten mit allen Mitgliedern dieser Gruppe.',
    chatEmpty: 'Noch keine Nachrichten in dieser Gruppe.',
    chatPlaceholder: 'Schreibe eine Gruppennachricht',
    chatComposer: {
      text: 'Nachricht',
      poll: 'Umfrage',
      todo: 'Todo',
      attachMedia: 'Anhaengen',
      attachmentSelected: 'Angehaengt:',
      removeAttachment: 'Anhang entfernen',
      openAttachment: 'Anhang oeffnen',
      pollPlaceholder: 'Frage\n- Option A\n- Option B',
      todoPlaceholder: 'Listentitel\n- Erster Punkt\n- Zweiter Punkt',
    },
    chatPinned: 'Angeheftete Nachrichten',
    chatPin: 'Nachricht anheften',
    chatUnpin: 'Nachricht loesen',
    chatVoteFor: 'Stimme fuer',
    chatVotes: 'Stimmen',
    chatVoted: 'gewaehlt',
    chatCompleteItem: 'Erledigen',
    chatSend: 'Senden',
    chatSending: 'Wird gesendet...',
    chatSent: 'Nachricht gesendet.',
    inviteTitle: 'Mitglieder einladen',
    inviteDescription:
      'Suche auffindbare Benutzer und sende ihnen eine Einladung zu dieser Gruppe.',
    searchPlaceholder: 'Personen suchen',
    searching: 'Suche laeuft...',
    noCandidates: 'Keine verfuegbaren Benutzer passen zu deiner Suche.',
    invite: 'Einladen',
    inviting: 'Wird eingeladen...',
    membersTitle: 'Mitglieder',
    membersDescription: '{count} Personen gehoeren zu dieser Gruppe.',
    pendingTitle: 'Offene Einladungen',
    pendingDescription: '{count} Einladungen wurden noch nicht beantwortet.',
    pendingEmpty: 'Keine offenen Einladungen.',
    pendingBadge: 'Offen',
    roleLabel: 'Rolle fuer {name}',
    remove: 'Entfernen',
    leave: 'Verlassen',
  },
  errors: {
    create:
      'Die Gruppe konnte gerade nicht erstellt werden. Bitte versuche es erneut.',
    invitation:
      'Die Einladung konnte gerade nicht aktualisiert werden. Bitte versuche es erneut.',
    search:
      'Einladungskandidaten konnten gerade nicht gesucht werden. Bitte versuche es erneut.',
    invite:
      'Dieser Benutzer konnte gerade nicht eingeladen werden. Bitte versuche es erneut.',
    member:
      'Dieses Mitglied konnte gerade nicht aktualisiert werden. Bitte versuche es erneut.',
    message:
      'Diese Nachricht konnte gerade nicht gesendet werden. Bitte versuche es erneut.',
  },
};
