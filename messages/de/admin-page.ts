export const adminPage = {
  accessBadge: 'ADMIN oder SUPERADMIN',
  navigation: {
    overview: 'Übersicht',
    content: 'Inhalte',
    reports: 'Berichte',
    auditLog: 'Audit Log',
    users: 'Benutzer',
    problemReports: 'Problemmeldungen',
    emailTemplates: 'E-Mail-Templates',
    systemSettings: 'Systemeinstellungen',
    dataStudio: 'Repair Console',
  },
  overview: {
    title: 'Admin-Übersicht',
    description:
      'Nutze diese Bereiche für privilegierte Berichte, Benutzeroperationen, Plattform-Konfiguration und schema-gesteuerte Werkzeuge.',
    layoutTitle: 'Bereichs-Layout',
    layoutDescription:
      'Ordne die Übersichtskarten so an, wie dein Team die Bereiche am häufigsten nutzt.',
    editHint:
      'Ziehe die Karten am Handle an die gewünschte Position und speichere dann die Reihenfolge.',
    editLayout: 'Layout bearbeiten',
    saveLayout: 'Layout speichern',
    cancelEditing: 'Abbrechen',
    resetLayout: 'Reihenfolge zurücksetzen',
    dragAction: 'Ziehen',
    dragHandle: 'Bereichskarte ziehen',
    openWorkspace: 'Bereich öffnen',
  },
  content: {
    title: 'Content-Betrieb',
    description:
      'Verwalte lokalisierte Ankuendigungen und operative Inhalte, die datenbankgestuetzt bleiben sollen.',
  },
  reports: {
    title: 'Berichte',
    description:
      'Prüfe Plattformzustand, Sicherheitslage und Nutzungssignale an einer Stelle.',
    ready: 'Zur Prüfung bereit',
    columns: {
      report: 'Bericht',
      owner: 'Verantwortlich',
      cadence: 'Rhythmus',
      status: 'Status',
      actions: 'Aktionen',
    },
    actions: {
      open: 'Öffnen',
      export: 'Exportieren',
    },
    metrics: {
      coverage: {
        label: 'Autorisierungsabdeckung',
        value: '100%',
        detail:
          'Alle privilegierten Admin-Routen verlangen jetzt die Rolle ADMIN oder SUPERADMIN.',
      },
      auditTrail: {
        label: 'Audit-Fenster',
        value: '24h',
        detail:
          'Sicherheitsrelevante Aktivitäten lassen sich nach Änderungen oder Vorfällen schnell prüfen.',
      },
      refreshCadence: {
        label: 'Aktualisierungsrhythmus',
        value: '5 Min',
        detail:
          'Betriebliche Zusammenfassungen werden häufig für schnelle Entscheidungen vorbereitet.',
      },
    },
    catalogTitle: 'Berichtskatalog',
    catalogDescription:
      'Jeder Bericht unten hat einen klaren Owner, einen Aktualisierungsrhythmus und einen nächsten Schritt.',
    catalog: {
      securityAccess: {
        title: 'Sicherheits- und Zugriffsprüfung',
        description:
          'Verfolge Rollenänderungen, aktuelle Ablehnungen und Anomalien bei Anmeldungen.',
        owner: 'Security Operations',
        cadence: 'Alle 4 Stunden',
      },
      auditActivity: {
        title: 'Audit-Aktivitätslog',
        description:
          'Prüfe Admin-Aktionen, Kontoänderungen und risikoreiche Endpunkte in einem Feed.',
        owner: 'Platform-Team',
        cadence: 'Live-Feed',
      },
      workspaceAdoption: {
        title: 'Workspace-Nutzung',
        description:
          'Miss aktive Teams, wiederkehrende Besuche und Abbrüche in Admin-Bereichen.',
        owner: 'Operations',
        cadence: 'Täglich um 06:00',
      },
      schemaHealth: {
        title: 'Schema-Zustand',
        description:
          'Prüfe Validierungsfehler, Ingestions-Abweichungen und Integritätsprobleme bei Writes.',
        owner: 'Data Engineering',
        cadence: 'Bei jedem Deployment',
      },
      navigationJourneys: {
        title: 'Navigationspfade',
        description:
          'Verfolge Einstiegsseiten, typische nächste Schritte, Ausstiege und Bounce-Verhalten über eingewilligte Besucher.',
        owner: 'Produktanalyse',
        cadence: 'Live-Feed',
      },
    },
    alertsTitle: 'Geplante Alerts',
    alertsDescription:
      'Admins können die wichtigsten Berichtsergebnisse direkt an die richtigen Empfänger verteilen.',
    alerts: {
      dailyDigest: {
        title: 'Täglicher Admin-Digest',
        description:
          'Sendet aktuelle Plattform- und Sicherheitszusammenfassungen an die Admin-Rotation.',
        channel: 'E-Mail',
      },
      weeklyExecutive: {
        title: 'Wöchentlicher Executive-Snapshot',
        description:
          'Bündelt Nutzung, Risiko und operative Highlights für die Leitungsebene.',
        channel: 'PDF',
      },
      failedIngestion: {
        title: 'Warnung bei fehlgeschlagener Ingestion',
        description:
          'Eskaliert Schema- oder Write-Fehler sofort, sobald der Schwellwert überschritten wird.',
        channel: 'Slack',
      },
    },
  },
  auditLog: {
    title: 'Audit Log',
    description:
      'Prüfe sicherheitsrelevante Routenentscheidungen und operative Aktionen.',
  },
  users: {
    title: 'Benutzerverwaltung',
    description:
      'Pruefe einzelne Konten, verfolge aktuelle Aktivitaeten und sende In-App-Benachrichtigungen an einen Nutzer oder ganze Gruppen.',
    metrics: {
      privileged: {
        label: 'Privilegierte Benutzer',
        detail: 'Konten mit direktem Zugriff auf Admin-Bereiche und Freigaben.',
      },
      operational: {
        label: 'Manager',
        detail:
          'Operative Nutzer, die Teams koordinieren, ohne volle Admin-Rechte zu haben.',
      },
      member: {
        label: 'Mitglieder',
        detail:
          'Standardnutzer, die aktuell reguläre Produktabläufe ausführen.',
      },
    },
    tableTitle: 'Benutzerverzeichnis',
    tableDescription:
      'Durchsuche das Verzeichnis, um Kontostatus, letzte Aktivitaeten und den Versand von Benachrichtigungen fuer einen Nutzer zu pruefen.',
    columns: {
      user: 'Benutzer',
      role: 'Rolle',
      status: 'Status',
      lastSeen: 'Letzte Aktivität',
      notifications: 'Benachrichtigungen',
      actions: 'Verwalten',
    },
    lastActivityFallback: 'Noch keine verfolgte Aktivitaet',
    status: {
      active: 'Aktiv',
      pending: 'Einladung offen',
      suspended: 'Gesperrt',
      disabled: 'Deaktiviert',
    },
    actions: {
      inspect: 'Nutzer pruefen',
    },
    search: {
      label: 'Benutzer suchen',
      placeholder: 'Nach Name, E-Mail, Handle oder Nutzer-ID suchen',
      idle: 'Suche nach einem Nutzer, bevor du Kontodetails oeffnest.',
      short: 'Gib mindestens 2 Zeichen ein.',
      loading: 'Benutzer werden gesucht...',
      empty: 'Keine Benutzer fuer diese Suche gefunden.',
      error: 'Benutzer koennen gerade nicht gesucht werden.',
      resultLimit: 'Bis zu {count} Treffer werden angezeigt',
    },
    notifications: {
      title: 'Benachrichtigungen senden',
      description:
        'Versende Updates an einen Nutzer, eine rollenbasierte Gruppe oder alle registrierten Konten.',
      fields: {
        audience: 'Zielgruppe',
        user: 'Empfaenger',
        role: 'Rollen-Gruppe',
        title: 'Titel',
        body: 'Nachricht',
        href: 'Ziel-Link',
      },
      audiences: {
        user: 'Einzelner Nutzer',
        role: 'Rollen-Gruppe',
        all: 'Alle Nutzer',
      },
      roles: {
        SUPERADMIN: 'Superadmins',
        ADMIN: 'Admins',
        MANAGER: 'Manager',
        USER: 'Mitglieder',
      },
      placeholders: {
        title: 'Geplante Wartung heute Abend',
        body: 'Beschreibe kurz das Update, die benoetigte Aktion oder den Kontext, den die Empfaenger pruefen sollen.',
        href: '/settings',
      },
      hrefHint:
        'Optional. Nutze einen In-App-Pfad wie /profile oder /settings.',
      directRecipient: 'Diese Benachrichtigung wird gesendet an',
      selectedRecipient: 'Ausgewaehlter Empfaenger',
      changeRecipient: 'Aendern',
      recipientSearchPlaceholder:
        'Nach Name, E-Mail, Handle oder Nutzer-ID suchen',
      recipientSearchLoading: 'Empfaenger werden gesucht...',
      recipientSearchEmpty: 'Keine Benutzer fuer diese Suche gefunden.',
      recipientSearchError: 'Empfaenger koennen gerade nicht gesucht werden.',
      submit: 'Benachrichtigung senden',
      sending: 'Wird gesendet...',
      success: 'Benachrichtigung an {count} Empfaenger gesendet.',
      genericError: 'Die Benachrichtigung konnte gerade nicht gesendet werden.',
      total: '{count} gesamt',
      unread: '{count} ungelesen',
    },
    workflowTitle: 'Admin-Abläufe',
    workflowDescription:
      'Zentrale Arbeitsmuster fuer die Pruefung von Nutzerkonten und sichere Kommunikation von Aenderungen.',
    workflows: {
      inspect: {
        title: 'Pruefen',
        description:
          'Oeffne eine eigene Nutzeransicht mit Profildaten, Aktivitaetshistorie und Versandkontext.',
      },
      broadcast: {
        title: 'Versenden',
        description:
          'Sende In-App-Hinweise an einen Nutzer, eine Rollen-Gruppe oder den gesamten Workspace.',
      },
      status: {
        title: 'Status verwalten',
        description:
          'Oeffne die Nutzerdetailansicht, um Zugriff zu deaktivieren, Konten zu reaktivieren oder Anmeldesperren zu loeschen.',
      },
    },
    detail: {
      title: 'Nutzerpruefung',
      description:
        'Pruefe Kontostatus, aktuelle Aktivitaet und Benachrichtigungsverlauf fuer {name}.',
      back: 'Zurueck zur Benutzerliste',
      fallback: 'Ausgewaehlter Nutzer',
      pending: 'Verifizierung ausstehend',
      none: 'Keine',
      notProvided: 'Nicht hinterlegt',
      profileTitle: 'Profil und Kontostatus',
      profileDescription:
        'Zentrale Profildaten und Verifizierungsdetails fuer Administratoren.',
      activityTitle: 'Letzte Aktivitaeten',
      activityDescription: 'Zuletzt verfolgte Routen dieses Kontos.',
      noActivity: 'Bisher wurden keine Seitenaufrufe verfolgt.',
      notificationsTitle: 'Letzte Benachrichtigungen',
      notificationsDescription:
        'Die neuesten In-App-Benachrichtigungen fuer diesen Nutzer.',
      noNotifications: 'Bisher wurden keine Benachrichtigungen zugestellt.',
      directNotificationTitle: 'Direkte Benachrichtigung senden',
      directNotificationDescription:
        'Erstelle eine Nachricht, die direkt im Postfach dieses Nutzers landet.',
      roleManager: {
        title: 'Rollenverwaltung',
        description:
          'Superadmins können hier privilegierten Workspace-Zugriff vergeben oder entziehen.',
        currentRole: 'Aktuelle Rolle',
        nextRole: 'Zugewiesene Rolle',
        submit: 'Rolle speichern',
        saving: 'Wird gespeichert...',
        success: 'Rolle auf {role} gesetzt.',
        genericError: 'Die Rolle konnte gerade nicht aktualisiert werden.',
        selfChangeHint:
          'Nutze ein anderes Superadmin-Konto, um deine eigene Rolle sicher zu ändern.',
      },
      accountHealthTitle: 'Kontozustand',
      accountHealthDescription:
        'Operative Signale, die mit diesem Konto verbunden sind.',
      summary: {
        role: 'Rolle',
        status: 'Status',
        lastActivity: 'Letzte Aktivitaet',
        unread: 'Ungelesene Benachrichtigungen',
      },
      fields: {
        email: 'E-Mail-Adresse',
        createdAt: 'Erstellt',
        verified: 'E-Mail verifiziert',
        lockout: 'Sperre bis',
        locale: 'Locale',
        timezone: 'Zeitzone',
      },
      health: {
        followers: 'Follower',
        visits: 'Verfolgte Besuche',
        totalNotifications: 'Gesamte Benachrichtigungen',
        updatedAt: 'Letztes Konto-Update',
        bio: 'Bio',
      },
      notificationStatus: {
        unread: 'Ungelesen',
        read: 'Gelesen',
      },
    },
  },
  problemReports: {
    title: 'Problemmeldungen',
    description:
      'Pruefe von Besuchern und Nutzern eingereichte Meldungen, aktualisiere den Triage-Status und halte Referenznummern nachvollziehbar.',
    back: 'Zurueck zu Problemmeldungen',
    tableTitle: 'Eingereichte Meldungen',
    tableDescription:
      'Filtere Meldungen nach Status und Kategorie, bevor du die Detailansicht oeffnest.',
    filters: {
      status: 'Status',
      area: 'Kategorie',
      all: 'Alle',
    },
    columns: {
      reference: 'Referenz',
      subject: 'Betreff',
      area: 'Kategorie',
      status: 'Status',
      createdAt: 'Erstellt',
      actions: 'Aktionen',
    },
    actions: {
      open: 'Oeffnen',
      save: 'Triage speichern',
    },
    status: {
      open: 'Offen',
      triaged: 'Triagiert',
      closed: 'Geschlossen',
    },
    empty: 'Keine Problemmeldungen passen zu den aktuellen Filtern.',
    detailTitle: 'Meldung {referenceId}',
    submittedBy: 'Eingereicht von',
    pageUrl: 'Gemeldete Seite',
    noPageUrl: 'Keine Seiten-URL angegeben',
    details: 'Details',
    adminNote: 'Admin-Notiz',
    adminNotePlaceholder: 'Interne Triage-Notizen ergaenzen',
    updated: 'Problemmeldung aktualisiert.',
  },
  emailTemplates: {
    title: 'E-Mail-Templates',
    description:
      'Pruefe, bearbeite, zeige Vorschauen an und versende React-Email-Templates im Admin-Bereich.',
  },
  systemSettings: {
    title: 'Systemeinstellungen',
    description:
      'Steuere plattformweite Richtlinien, die in Admin-Hände gehören und nicht in persönliche Präferenzen.',
    actions: {
      edit: 'Bearbeiten',
      audit: 'Audit-Log',
    },
    groups: {
      sessions: {
        title: 'Sitzungskontrollen',
        description:
          'Definiere Sitzungsdauer, Rotationsrhythmus und Zeitfenster für erneute Anmeldung.',
      },
      notifications: {
        title: 'Benachrichtigungs-Standards',
        description:
          'Lege Digest-Rhythmus, Eskalationswege und Admin-Broadcasts fest.',
      },
      storage: {
        title: 'Speicher und Aufbewahrung',
        description:
          'Prüfe Upload-Limits, lokale Assets und Bereinigungsfenster.',
      },
    },
    settings: {
      sessionLifetime: {
        label: 'Sitzungsdauer',
        value:
          '8 Stunden mit erzwungener Token-Rotation bei privilegierten Aktionen.',
        scope: 'Authentifizierung',
      },
      idleTimeout: {
        label: 'Inaktivitäts-Timeout',
        value: '20 Minuten bis zum automatischen Logout auf Admin-Routen.',
        scope: 'Sicherheit',
      },
      mfaPolicy: {
        label: 'MFA-Richtlinie',
        value:
          'Pflicht für ADMIN- und SUPERADMIN-Konten und optional für alle anderen.',
        scope: 'Zugriff',
      },
      digestCadence: {
        label: 'Digest-Rhythmus',
        value:
          'Zwei tägliche Zusammenfassungen für Admin-Benachrichtigungen und Berichtsdigests.',
        scope: 'Kommunikation',
      },
      incidentRouting: {
        label: 'Incident-Routing',
        value:
          'Kritische Vorfälle gehen an den Security-Kanal und den On-Call-Alias.',
        scope: 'Eskalation',
      },
      maintenanceWindow: {
        label: 'Wartungshinweis',
        value:
          'Änderungen werden 72 Stunden vor geplanter Downtime angekündigt.',
        scope: 'Betrieb',
      },
      uploadLimit: {
        label: 'Upload-Limit',
        value: '25 MB pro Asset mit Bildvalidierung vor dem Speichern.',
        scope: 'Storage',
      },
      retentionWindow: {
        label: 'Aufbewahrungsfenster',
        value:
          '365 Tage für Logs, Uploads und wiederherstellbare Admin-Datensätze.',
        scope: 'Compliance',
      },
      auditExports: {
        label: 'Audit-Exporte',
        value: 'Nächtlicher Archiv-Export in den Reporting-Storage-Bucket.',
        scope: 'Backups',
      },
    },
    checklistTitle: 'Änderungs-Checkliste',
    checklistDescription:
      'Nutze dasselbe Prüfverfahren, wenn plattformweite Einstellungen geändert werden.',
    checklist: {
      review:
        'Prüfe die operative Auswirkung, bevor du eine plattformweite Änderung vornimmst.',
      announce:
        'Kommuniziere Änderungen frühzeitig an betroffene Teams, wenn sich Verhalten ändert.',
      verify:
        'Prüfe nach dem Rollout Audit-Logs, Fehlerraten und Auswirkungen auf Nutzer.',
    },
  },
  dataStudio: {
    title: 'Repair Console',
    description:
      'Privilegiertes Reparaturwerkzeug für schema-gesteuerte Datensatz-Erstellung. Der Zugriff ist auf SUPERADMIN beschränkt.',
    summary: {
      tables: 'Schreibbare Tabellen',
      fields: 'Verfügbare Felder',
      required: 'Pflichtfelder in der gewählten Tabelle',
    },
    explorerTitle: 'Schema-Explorer',
    explorerDescription:
      'Wähle eine Tabelle aus, prüfe ihre Struktur und erstelle dann einen Datensatz über das generierte Formular.',
    emptyState: 'Keine Tabelle ausgewählt',
    noDescription: 'Für diese Tabelle ist keine Beschreibung hinterlegt.',
    details: {
      tableName: 'Tabellenname',
      fieldCount: 'Anzahl Felder',
      endpoint: 'Write-Endpunkt',
    },
    formTitle: 'Generiertes Formular',
    formDescription:
      'Sende das generierte Formular ab, um einen Datensatz in der ausgewählten Tabelle zu erstellen.',
    fieldListTitle: 'Feldübersicht',
    fieldType: 'Feldtyp',
    fieldRequired: 'Pflicht',
    fieldOptional: 'Optional',
    guideTitle: 'Studio-Leitfaden',
    guideDescription:
      'Wähle eine Tabelle, fülle die Pflichtfelder aus und sende das generierte Formular ab, um einen neuen Datensatz über die Admin-API zu schreiben.',
  },
};
