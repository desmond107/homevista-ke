// Admin permission vocabulary. Client-safe.
// Super admins have every permission; staff admins get the subset stored on User.adminPermissions.

export const ADMIN_PERMISSIONS = {
  analytics: "View analytics dashboard",
  users: "Manage users & listers",
  kyc: "Review KYC & badges",
  listings: "Moderate listings & reports",
  reviews: "Moderate reviews",
  adverts: "Manage ads & adverts",
  directory: "Manage companies & realtors",
  taxonomy: "Manage types, amenities & locations",
  payments: "View payments & export reports",
  content: "Manage blog, FAQs, pages & homepage",
  settings: "Pricing & system settings",
  staff: "Manage staff admins",
} as const;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;

export const ALL_ADMIN_PERMISSIONS = Object.keys(ADMIN_PERMISSIONS) as AdminPermission[];

export function hasAdminPermission(
  user: { role: string; isSuperAdmin: boolean; adminPermissions: string[] } | null | undefined,
  perm: AdminPermission,
) {
  if (!user || user.role !== "ADMIN") return false;
  if (user.isSuperAdmin) return true;
  // Only a super admin may manage other admins.
  if (perm === "staff") return false;
  return user.adminPermissions.includes(perm);
}
