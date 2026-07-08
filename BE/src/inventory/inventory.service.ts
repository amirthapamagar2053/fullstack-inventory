import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { FilterInventoryDto } from './dto/filter-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterInventoryDto) {
    const { search, category, location, status, assignedUserId, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {};
    if (search) where.itemName = { contains: search, mode: 'insensitive' };
    if (category) where.category = category;
    if (location) where.location = location;
    if (status) where.status = status;
    if (assignedUserId) where.assignedUserId = assignedUserId;

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        include: { assignedUser: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.inventory.findUnique({
      where: { id },
      include: { assignedUser: { select: { id: true, name: true, email: true } } },
    });
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  async create(dto: CreateInventoryDto) {
    const year = new Date().getFullYear();
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ item_code: string }[]>`
        SELECT item_code FROM inventory
        WHERE item_code LIKE ${`INV-${year}-%`}
        ORDER BY item_code DESC
        LIMIT 1
        FOR UPDATE
      `;
      const seq = rows.length > 0 ? parseInt(rows[0].item_code.split('-')[2], 10) : 0;
      const itemCode = `INV-${year}-${String(seq + 1).padStart(4, '0')}`;
      return tx.inventory.create({
        data: {
          itemCode,
          itemName: dto.itemName,
          category: dto.category,
          purchaseDate: new Date(dto.purchaseDate),
          quantity: dto.quantity,
          amount: new Prisma.Decimal(dto.amount),
          location: dto.location,
          ...(dto.status && { status: dto.status }),
          assignedUserId: dto.assignedUserId ?? null,
        },
        include: { assignedUser: { select: { id: true, name: true, email: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateInventoryDto) {
    await this.findOne(id);
    return this.prisma.inventory.update({
      where: { id },
      data: {
        ...(dto.itemName !== undefined && { itemName: dto.itemName }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.purchaseDate !== undefined && { purchaseDate: new Date(dto.purchaseDate) }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.amount !== undefined && { amount: new Prisma.Decimal(dto.amount) }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.assignedUserId !== undefined && { assignedUserId: dto.assignedUserId }),
      },
      include: { assignedUser: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.inventory.delete({ where: { id } });
  }

  async findForExport(filter: Omit<FilterInventoryDto, 'page' | 'limit'>) {
    const { search, category, location, status, assignedUserId } = filter;
    const where: Prisma.InventoryWhereInput = {};
    if (search) where.itemName = { contains: search, mode: 'insensitive' };
    if (category) where.category = category;
    if (location) where.location = location;
    if (status) where.status = status;
    if (assignedUserId) where.assignedUserId = assignedUserId;

    return this.prisma.inventory.findMany({
      where,
      include: { assignedUser: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

}
