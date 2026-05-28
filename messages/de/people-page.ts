export const peoplePage = {
  title: 'Freunde',
  description:
    'Verwalte gegenseitige Follow-Verbindungen und füge neue Freunde über die Suche hinzu.',
  search: {
    title: 'Personen finden',
    description: 'Suche nach Namen oder stöbere in empfohlenen Profilen.',
    placeholder: 'Nach Namen suchen',
    close: 'Freundesuche schließen',
    loading: 'Suche läuft…',
    idle: 'Aktuell sind keine empfohlenen Personen verfügbar.',
    empty: 'Keine auffindbaren Benutzer passen zu deiner Suche.',
    error:
      'Profile konnten gerade nicht gesucht werden. Bitte versuche es erneut.',
    badges: {
      friend: 'Freund',
      followsYou: 'Folgt dir',
      popular: '{count} Follower',
    },
  },
  following: {
    title: 'Du folgst',
    description: 'Du folgst aktuell {count} Personen.',
    empty: 'Du folgst noch niemandem.',
  },
  friends: {
    title: 'Freunde',
    description: 'Du hast {count} gegenseitige Follow-Verbindungen.',
    empty:
      'Du hast noch keine Freunde. Füge jemanden hinzu, der dir auch folgt.',
  },
  actions: {
    addFriend: 'Personen finden',
    follow: 'Folgen',
    unfollow: 'Nicht mehr folgen',
    following: 'Wird gefolgt…',
    unfollowing: 'Wird entfolgt…',
    block: 'Blockieren',
    blocking: 'Wird blockiert…',
    friendAdded: '{name} ist jetzt ein Freund.',
    followAdded:
      'Du folgst {name}. Das Profil erscheint hier, sobald es dir zurückfolgt.',
    error:
      'Der Follow-Status konnte gerade nicht aktualisiert werden. Bitte versuche es erneut.',
    blockError:
      'Der Block-Status konnte gerade nicht aktualisiert werden. Bitte versuche es erneut.',
  },
};
