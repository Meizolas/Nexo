const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  ORG_ADMIN: ['*'],
  LAWYER: [
    'organization.read',
    'clients.*',
    'documents.*',
    'legal.*',
    'notifications.*',
    'parties.*',
  ],
  REAL_ESTATE_MANAGER: [
    'organization.read',
    'clients.*',
    'documents.*',
    'notifications.*',
    'parties.*',
    'real-estate.*',
  ],
  STAFF: ['organization.read'],
  CLIENT: ['notifications.read', 'organization.read', 'portal.legal.*'],
  OWNER: ['notifications.read', 'organization.read', 'portal.owner.*'],
  TENANT: ['notifications.read', 'organization.read', 'portal.tenant.*'],
};

function matchesPermission(pattern: string, permission: string): boolean {
  if (pattern === '*' || pattern === permission) {
    return true;
  }

  return pattern.endsWith('.*') && permission.startsWith(pattern.slice(0, -1));
}

export function hasPermission(
  roles: readonly string[],
  grants: ReadonlyArray<{ permission: string; effect: 'ALLOW' | 'DENY' }>,
  permission: string,
): boolean {
  const matchingGrants = grants.filter((grant) =>
    matchesPermission(grant.permission, permission),
  );

  if (matchingGrants.some((grant) => grant.effect === 'DENY')) {
    return false;
  }

  if (matchingGrants.some((grant) => grant.effect === 'ALLOW')) {
    return true;
  }

  return roles.some((role) =>
    (ROLE_PERMISSIONS[role] ?? []).some((pattern) =>
      matchesPermission(pattern, permission),
    ),
  );
}
