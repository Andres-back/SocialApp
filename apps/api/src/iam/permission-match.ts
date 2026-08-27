import type { PermissionCode } from '@socialapp/shared';
export function hasEveryPermission(granted: PermissionCode[], required: PermissionCode[]) {
  return required.every((permission) => granted.includes(permission));
}

