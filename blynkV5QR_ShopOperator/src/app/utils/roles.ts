// Role constants to avoid hardcoding
export const USER_ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
} as const;

export const STAFF_ROLES = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  KITCHEN: 'KITCHEN',
  HALL: 'HALL',
  STAFF: 'STAFF',
} as const;

// Frontend role mappings (lowercase)
export const FRONTEND_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  KITCHEN: 'kitchen',
  HALL: 'hall',
  STAFF: 'staff',
} as const;

// Helper functions
export const isOwnerOrManager = (role: string | null | undefined): boolean => {
  if (!role) return false;
  const upperRole = role.toUpperCase();
  return upperRole === USER_ROLES.OWNER || 
         upperRole === USER_ROLES.MANAGER || 
         upperRole === USER_ROLES.ADMIN || 
         upperRole === USER_ROLES.PLATFORM_ADMIN;
};

export const isPlatformOrAdmin = (role: string | null | undefined): boolean => {
  if (!role) return false;
  const upperRole = role.toUpperCase();
  return upperRole === USER_ROLES.PLATFORM_ADMIN || upperRole === USER_ROLES.ADMIN;
};

export const canAccessReports = (role: string | null | undefined): boolean => {
  return isOwnerOrManager(role);
};

export const canManageStaff = (role: string | null | undefined): boolean => {
  return isOwnerOrManager(role);
};
