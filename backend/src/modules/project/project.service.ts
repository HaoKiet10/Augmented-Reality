import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(designerId: string) {
    return this.prisma.project.findMany({
      where: { designerId },
      orderBy: { lastOpenedAt: 'desc' },
    });
  }

  async findOne(id: string, designerId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, designerId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async create(designerId: string, name: string) {
    return this.prisma.project.create({
      data: {
        name,
        description: 'Interact with target images and 3D overlays in real-time.',
        status: 'draft',
        designerId,
      },
    });
  }

  async update(id: string, designerId: string, data: { name?: string; status?: string; description?: string; lastOpenedAt?: Date | string }) {
    await this.findOne(id, designerId);

    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, designerId: string) {
    await this.findOne(id, designerId); // Ensure ownership
    return this.prisma.project.delete({
      where: { id },
    });
  }
}
