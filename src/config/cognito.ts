export const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-2_EqDFs61qG',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '4o3655i407fumejofao8tovoet',
  region: import.meta.env.VITE_COGNITO_REGION || 'us-east-2',
};

export const ADMIN_ROLES = ['super_admin', 'engineer', 'support_lead', 'support'] as const;

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number]);
}

export function canCreateIncident(role: string): boolean {
  return ['super_admin', 'engineer', 'support_lead'].includes(role);
}

export function canModifyIncident(role: string): boolean {
  return ['super_admin', 'engineer', 'support_lead'].includes(role);
}
