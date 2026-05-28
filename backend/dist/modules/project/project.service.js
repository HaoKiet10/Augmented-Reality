"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProjectService = class ProjectService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(designerId) {
        return this.prisma.project.findMany({
            where: { designerId },
            orderBy: { lastOpenedAt: 'desc' },
        });
    }
    async findOne(id, designerId) {
        const project = await this.prisma.project.findFirst({
            where: { id, designerId },
        });
        if (!project) {
            throw new common_1.NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }
    async create(designerId, name) {
        return this.prisma.project.create({
            data: {
                name,
                description: 'Interact with target images and 3D overlays in real-time.',
                status: 'draft',
                designerId,
            },
        });
    }
    async update(id, designerId, data) {
        await this.findOne(id, designerId);
        return this.prisma.project.update({
            where: { id },
            data,
        });
    }
    async delete(id, designerId) {
        await this.findOne(id, designerId); // Ensure ownership
        return this.prisma.project.delete({
            where: { id },
        });
    }
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProjectService);
