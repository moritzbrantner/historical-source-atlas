export const adminPage = {
  accessBadge: 'ADMIN or SUPERADMIN',
  navigation: {
    overview: 'Overview',
    content: 'Content',
    reports: 'Reports',
    auditLog: 'Audit log',
    users: 'Users',
    problemReports: 'Problem reports',
    emailTemplates: 'Email templates',
    systemSettings: 'System settings',
    dataStudio: 'Repair console',
  },
  overview: {
    title: 'Admin overview',
    description:
      'Use these workspaces for privileged reporting, user operations, platform configuration, and schema-driven tools.',
    layoutTitle: 'Workspace layout',
    layoutDescription:
      'Arrange the overview cards to match the order your team uses most.',
    editHint:
      'Drag cards by their handle, then save the arrangement when the layout feels right.',
    editLayout: 'Edit layout',
    saveLayout: 'Save layout',
    cancelEditing: 'Cancel',
    resetLayout: 'Reset order',
    dragAction: 'Drag',
    dragHandle: 'Drag workspace card',
    openWorkspace: 'Open workspace',
  },
  content: {
    title: 'Content operations',
    description:
      'Manage localized announcements and operational content that should stay database-backed.',
  },
  reports: {
    title: 'Reports',
    description:
      'Review platform health, security posture, and adoption signals from one place.',
    ready: 'Ready for review',
    columns: {
      report: 'Report',
      owner: 'Owner',
      cadence: 'Cadence',
      status: 'Status',
      actions: 'Actions',
    },
    actions: {
      open: 'Open',
      export: 'Export',
    },
    metrics: {
      coverage: {
        label: 'Authorization coverage',
        value: '100%',
        detail:
          'All privileged admin routes now require the ADMIN or SUPERADMIN role.',
      },
      auditTrail: {
        label: 'Audit trail window',
        value: '24h',
        detail:
          'Security-sensitive activity can be reviewed quickly after changes or incidents.',
      },
      refreshCadence: {
        label: 'Refresh cadence',
        value: '5 min',
        detail:
          'Operational summaries are staged frequently for rapid decision-making.',
      },
    },
    catalogTitle: 'Report catalog',
    catalogDescription:
      'Each report below has a clear owner, refresh cadence, and action path for admins.',
    catalog: {
      securityAccess: {
        title: 'Security access review',
        description:
          'Track privileged role changes, recent denials, and sign-in anomalies.',
        owner: 'Security operations',
        cadence: 'Every 4 hours',
      },
      auditActivity: {
        title: 'Audit activity log',
        description:
          'Inspect admin actions, account changes, and high-risk endpoints in one stream.',
        owner: 'Platform team',
        cadence: 'Live feed',
      },
      workspaceAdoption: {
        title: 'Workspace adoption',
        description:
          'Measure active teams, repeat visits, and drop-offs across admin workspaces.',
        owner: 'Operations',
        cadence: 'Daily at 06:00',
      },
      schemaHealth: {
        title: 'Schema health',
        description:
          'Review validation failures, ingestion mismatches, and write integrity issues.',
        owner: 'Data engineering',
        cadence: 'On every deployment',
      },
      navigationJourneys: {
        title: 'Navigation journeys',
        description:
          'Track entry pages, common next steps, exits, and bounce behavior across consented visitors.',
        owner: 'Product analytics',
        cadence: 'Live feed',
      },
    },
    alertsTitle: 'Scheduled alerts',
    alertsDescription:
      'Admins can keep the most important report outputs pushed to the right audience.',
    alerts: {
      dailyDigest: {
        title: 'Daily admin digest',
        description:
          'Sends the latest platform and security summaries to the admin rotation.',
        channel: 'Email',
      },
      weeklyExecutive: {
        title: 'Weekly executive snapshot',
        description:
          'Bundles adoption, risk, and operational highlights into a leadership brief.',
        channel: 'PDF',
      },
      failedIngestion: {
        title: 'Failed ingestion warning',
        description:
          'Escalates schema or record write failures as soon as they cross the threshold.',
        channel: 'Slack',
      },
    },
  },
  auditLog: {
    title: 'Audit log',
    description:
      'Review security-sensitive route decisions and operational actions.',
  },
  users: {
    title: 'User management',
    description:
      'Inspect individual accounts, review recent activity, and send in-app notifications to one user or a broader audience.',
    metrics: {
      privileged: {
        label: 'Privileged users',
        detail:
          'Accounts with direct access to admin-only workspaces and approvals.',
      },
      operational: {
        label: 'Managers',
        detail:
          'Operational users coordinating teams without full admin privileges.',
      },
      member: {
        label: 'Members',
        detail:
          'Standard workspace users currently assigned to product workflows.',
      },
    },
    tableTitle: 'User directory',
    tableDescription:
      'Search the directory to inspect account state, recent activity, and notification delivery for a user.',
    columns: {
      user: 'User',
      role: 'Role',
      status: 'Status',
      lastSeen: 'Last activity',
      notifications: 'Notifications',
      actions: 'Manage',
    },
    lastActivityFallback: 'No tracked activity yet',
    status: {
      active: 'Active',
      pending: 'Pending invite',
      suspended: 'Suspended',
      disabled: 'Disabled',
    },
    actions: {
      inspect: 'Inspect user',
    },
    search: {
      label: 'Search users',
      placeholder: 'Search by name, email, handle, or user ID',
      idle: 'Search for a user before opening account details.',
      short: 'Enter at least 2 characters.',
      loading: 'Searching users...',
      empty: 'No users matched your search.',
      error: 'Unable to search users right now.',
      resultLimit: 'Showing up to {count} matches',
    },
    notifications: {
      title: 'Send notifications',
      description:
        'Broadcast updates to one user, a role-based cohort, or every registered account.',
      fields: {
        audience: 'Audience',
        user: 'Recipient',
        role: 'Role group',
        title: 'Title',
        body: 'Message',
        href: 'Destination link',
      },
      audiences: {
        user: 'Individual user',
        role: 'Role group',
        all: 'All users',
      },
      roles: {
        SUPERADMIN: 'Superadmins',
        ADMIN: 'Admins',
        MANAGER: 'Managers',
        USER: 'Members',
      },
      placeholders: {
        title: 'Scheduled maintenance tonight',
        body: 'Briefly describe the update, action request, or context recipients should review.',
        href: '/settings',
      },
      hrefHint: 'Optional. Use an in-app path like /profile or /settings.',
      directRecipient: 'This notification will be sent to',
      selectedRecipient: 'Selected recipient',
      changeRecipient: 'Change',
      recipientSearchPlaceholder: 'Search by name, email, handle, or user ID',
      recipientSearchLoading: 'Searching recipients...',
      recipientSearchEmpty: 'No users matched your search.',
      recipientSearchError: 'Unable to search recipients right now.',
      submit: 'Send notification',
      sending: 'Sending...',
      success: 'Notification sent to {count} recipients.',
      genericError: 'Unable to send the notification right now.',
      total: '{count} total',
      unread: '{count} unread',
    },
    workflowTitle: 'Admin workflows',
    workflowDescription:
      'Core operating patterns for reviewing user accounts and communicating changes safely.',
    workflows: {
      inspect: {
        title: 'Inspect',
        description:
          'Open a dedicated user view with profile data, activity history, and delivery context.',
      },
      broadcast: {
        title: 'Broadcast',
        description:
          'Send in-app notices to one user, a role cohort, or the entire workspace from the admin panel.',
      },
      status: {
        title: 'Manage status',
        description:
          'Open a user detail view to disable access, reactivate an account, or clear credential lockout.',
      },
    },
    detail: {
      title: 'User inspection',
      description:
        'Inspect account state, recent activity, and notification history for {name}.',
      back: 'Back to users',
      fallback: 'Selected user',
      pending: 'Pending verification',
      none: 'None',
      notProvided: 'Not provided',
      profileTitle: 'Profile and account state',
      profileDescription:
        'Core profile fields and verification details available to administrators.',
      activityTitle: 'Recent activity',
      activityDescription: 'Latest tracked routes for this account.',
      noActivity: 'No tracked page visits yet.',
      notificationsTitle: 'Recent notifications',
      notificationsDescription:
        'Newest in-app notifications delivered to this user.',
      noNotifications: 'No notifications have been delivered yet.',
      directNotificationTitle: 'Send a direct notification',
      directNotificationDescription:
        'Compose a message that will land directly in this user’s notification inbox.',
      roleManager: {
        title: 'Role management',
        description:
          'Superadmins can assign and revoke privileged workspace access here.',
        currentRole: 'Current role',
        nextRole: 'Assigned role',
        submit: 'Save role',
        saving: 'Saving...',
        success: 'Role updated to {role}.',
        genericError: 'Unable to update the role right now.',
        selfChangeHint:
          'Use another superadmin account to change your own role safely.',
      },
      accountHealthTitle: 'Account health',
      accountHealthDescription: 'Operational signals tied to this account.',
      summary: {
        role: 'Role',
        status: 'Status',
        lastActivity: 'Last activity',
        unread: 'Unread notifications',
      },
      fields: {
        email: 'Email address',
        createdAt: 'Created',
        verified: 'Email verified',
        lockout: 'Lockout until',
        locale: 'Locale',
        timezone: 'Timezone',
      },
      health: {
        followers: 'Followers',
        visits: 'Tracked visits',
        totalNotifications: 'Total notifications',
        updatedAt: 'Last account update',
        bio: 'Bio',
      },
      notificationStatus: {
        unread: 'Unread',
        read: 'Read',
      },
    },
  },
  problemReports: {
    title: 'Problem reports',
    description:
      'Review visitor and user-submitted issue reports, update triage status, and keep reference IDs traceable.',
    back: 'Back to problem reports',
    tableTitle: 'Submitted reports',
    tableDescription:
      'Filter reports by status and category before opening a detailed triage view.',
    filters: {
      status: 'Status',
      area: 'Category',
      all: 'All',
    },
    columns: {
      reference: 'Reference',
      subject: 'Subject',
      area: 'Category',
      status: 'Status',
      createdAt: 'Created',
      actions: 'Actions',
    },
    actions: {
      open: 'Open',
      save: 'Save triage',
    },
    status: {
      open: 'Open',
      triaged: 'Triaged',
      closed: 'Closed',
    },
    empty: 'No problem reports matched the current filters.',
    detailTitle: 'Report {referenceId}',
    submittedBy: 'Submitted by',
    pageUrl: 'Reported page',
    noPageUrl: 'No page URL provided',
    details: 'Details',
    adminNote: 'Admin note',
    adminNotePlaceholder: 'Add internal triage notes',
    updated: 'Problem report updated.',
  },
  emailTemplates: {
    title: 'Email templates',
    description:
      'Review, edit, preview, and send React Email templates from the admin workspace.',
  },
  systemSettings: {
    title: 'System settings',
    description:
      'Control platform-wide policies that should stay in admin hands, not personal user preferences.',
    actions: {
      edit: 'Edit',
      audit: 'Audit log',
    },
    groups: {
      sessions: {
        title: 'Session controls',
        description:
          'Define session lifetime, rotation cadence, and forced re-authentication windows.',
      },
      notifications: {
        title: 'Notification defaults',
        description:
          'Set digest cadence, escalation routing, and admin broadcast expectations.',
      },
      storage: {
        title: 'Storage and retention',
        description:
          'Review upload limits, local asset handling, and cleanup windows.',
      },
    },
    settings: {
      sessionLifetime: {
        label: 'Session lifetime',
        value: '8 hours with forced token rotation on privileged actions.',
        scope: 'Authentication',
      },
      idleTimeout: {
        label: 'Idle timeout',
        value: '20 minutes before automatic sign-out on admin routes.',
        scope: 'Security',
      },
      mfaPolicy: {
        label: 'MFA policy',
        value:
          'Required for ADMIN and SUPERADMIN accounts and optional for all others.',
        scope: 'Access',
      },
      digestCadence: {
        label: 'Digest cadence',
        value:
          'Two daily summaries for admin notifications and report digests.',
        scope: 'Communication',
      },
      incidentRouting: {
        label: 'Incident routing',
        value:
          'Critical issues fan out to the security channel and on-call alias.',
        scope: 'Escalation',
      },
      maintenanceWindow: {
        label: 'Maintenance notice',
        value: 'Changes are announced 72 hours before scheduled downtime.',
        scope: 'Operations',
      },
      uploadLimit: {
        label: 'Upload limit',
        value: '25 MB per asset with image validation before storage.',
        scope: 'Storage',
      },
      retentionWindow: {
        label: 'Retention window',
        value: '365 days for logs, uploads, and recoverable admin records.',
        scope: 'Compliance',
      },
      auditExports: {
        label: 'Audit exports',
        value: 'Nightly archival export to the reporting storage bucket.',
        scope: 'Backups',
      },
    },
    checklistTitle: 'Change checklist',
    checklistDescription:
      'Use the same review pattern whenever a platform-level setting is changed.',
    checklist: {
      review:
        'Review the operational impact before making a platform-wide change.',
      announce:
        'Communicate setting changes to affected teams when behavior will shift.',
      verify: 'Verify audit logs, error rates, and user impact after rollout.',
    },
  },
  dataStudio: {
    title: 'Repair console',
    description:
      'Privileged repair tool for schema-driven record creation. Access is restricted to SUPERADMIN users.',
    summary: {
      tables: 'Writable tables',
      fields: 'Available fields',
      required: 'Required fields in selected table',
    },
    explorerTitle: 'Schema explorer',
    explorerDescription:
      'Select a table to inspect its shape and compose a record from the generated form.',
    emptyState: 'No table selected',
    noDescription: 'No description available for this table.',
    details: {
      tableName: 'Table name',
      fieldCount: 'Field count',
      endpoint: 'Write endpoint',
    },
    formTitle: 'Generated form',
    formDescription:
      'Submit the generated form to create a record in the selected database table.',
    fieldListTitle: 'Field inventory',
    fieldType: 'Field type',
    fieldRequired: 'Required',
    fieldOptional: 'Optional',
    guideTitle: 'Studio guide',
    guideDescription:
      'Pick a table, complete the required fields, and submit the generated form to create a new record through the admin API.',
  },
};
