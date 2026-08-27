import { Injectable } from '@nestjs/common';
import type { SportsCatalogs } from '@socialapp/shared';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}
  async sports(): Promise<SportsCatalogs> {
    const [programs, sports, categories, coaches] = await Promise.all([
      this.prisma.sportsProgram.findMany({ where: { active: true, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.sport.findMany({ where: { active: true, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.category.findMany({ where: { active: true, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.coach.findMany({ where: { active: true, deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ]);
    return { programs, sports, categories, coaches };
  }
}
