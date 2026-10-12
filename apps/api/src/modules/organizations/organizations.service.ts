import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        user: { status: UserStatus.ACTIVE },
        organization: {
          status: OrganizationStatus.ACTIVE,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        isDefault: true,
        organization: { select: { id: true, name: true, slug: true } },
        roles: { select: { role: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { organization: { name: 'asc' } }],
    });

    return memberships.map(({ id, isDefault, organization, roles }) => ({
      membershipId: id,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      isDefault,
      roles: roles.map(({ role }) => role),
    }));
  }

  async listActiveMembers(organizationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        user: { status: UserStatus.ACTIVE },
      },
      select: {
        user: { select: { id: true, displayName: true } },
        roles: { select: { role: true } },
      },
      orderBy: { user: { displayName: 'asc' } },
    });

    return memberships.map(({ user, roles }) => ({
      id: user.id,
      displayName: user.displayName,
      roles: roles.map(({ role }) => role),
    }));
  }
}
