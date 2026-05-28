import {
  appRoles,
  profiles,
  securityAuditLogs,
  securityRateLimitCounters,
  userFeatureOverrides,
  userRoles,
  users,
} from '@/src/db/schema';

export type WritableTableConfig = {
  name: string;
  label: string;
  description?: string;
  table:
    | typeof appRoles
    | typeof users
    | typeof userRoles
    | typeof userFeatureOverrides
    | typeof profiles
    | typeof securityAuditLogs
    | typeof securityRateLimitCounters;
  includeFields?: string[];
  excludeFields?: string[];
  includeDefaultedFields?: boolean;
};

export const writableTableConfigs: WritableTableConfig[] = [
  {
    name: 'AppRole',
    label: 'Role',
    description: 'Create or repair role definitions and permission JSON.',
    table: appRoles,
    includeFields: ['id', 'label', 'description', 'permissions'],
  },
  {
    name: 'UserRole',
    label: 'User Role',
    description: 'Assign roles to users through the many-to-many join table.',
    table: userRoles,
    includeFields: ['userId', 'roleId'],
  },
  {
    name: 'UserFeatureOverride',
    label: 'User Functionality Override',
    description:
      'Enable or disable user-specific functionality by feature key.',
    table: userFeatureOverrides,
    includeFields: ['userId', 'featureKey', 'enabled'],
    includeDefaultedFields: true,
  },
  {
    name: 'Profile',
    label: 'Profile',
    description: 'Create profile records from a schema-driven form.',
    table: profiles,
    includeFields: ['id', 'userId', 'bio', 'locale', 'timezone'],
  },
  {
    name: 'SecurityRateLimitCounter',
    label: 'Security Rate Limit Counter',
    description: 'Create or repair security rate-limit rows.',
    table: securityRateLimitCounters,
    includeFields: ['key', 'count', 'resetAt'],
  },
  {
    name: 'SecurityAuditLog',
    label: 'Security Audit Log',
    description: 'Create security audit entries manually.',
    table: securityAuditLogs,
    includeFields: [
      'id',
      'actorId',
      'action',
      'outcome',
      'statusCode',
      'metadata',
      'timestamp',
    ],
    includeDefaultedFields: true,
  },
  {
    name: 'User',
    label: 'User',
    description: 'Create local user records (admin use only).',
    table: users,
    includeFields: ['id', 'email', 'name', 'role', 'passwordHash'],
  },
];

export const writableTableMap = Object.fromEntries(
  writableTableConfigs.map((config) => [config.name, config.table]),
) as Record<string, WritableTableConfig['table']>;
