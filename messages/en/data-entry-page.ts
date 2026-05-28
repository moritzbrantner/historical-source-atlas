export const dataEntryPage = {
  title: 'Repair console data entry',
  description:
    'Create rows for repair-only tables. Access is restricted to superadmins.',
  permissions: {
    read: 'Read',
    write: 'Write',
    noWrite: 'You can read this table but do not have write access.',
  },
  form: {
    creating: 'Creating…',
    createRow: 'Create {table} row',
    fields: {
      bio: 'Bio',
      locale: 'Locale',
      timezone: 'Timezone',
      email: 'Email',
      name: 'Name',
      role: 'Role',
      action: 'Action',
      outcome: 'Outcome',
      statusCode: 'Status code',
      metadataJson: 'Metadata JSON',
      key: 'Key',
      count: 'Count',
      resetAt: 'Reset at',
    },
  },
};
