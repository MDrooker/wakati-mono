import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles are required to access a route
 * Use this decorator on controllers or specific methods
 *
 * @param roles - Array of role strings required to access the route
 *
 * @example
 * @Roles('admin', 'moderator')
 * @Get('/admin-only')
 * adminOnlyRoute() {
 *   return 'Only admins and moderators can see this';
 * }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
