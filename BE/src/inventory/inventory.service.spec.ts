import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  inventory: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns paginated data and meta', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([{ id: 'i1', itemCode: 'INV-2026-0001' }]);
      mockPrisma.inventory.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });
  });

  describe('findOne', () => {
    it('returns item when found', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue({ id: 'i1' });
      const result = await service.findOne('i1');
      expect(result).toEqual({ id: 'i1' });
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('generates itemCode and creates inventory item inside transaction', async () => {
      const mockTx = {
        $queryRaw: jest.fn().mockResolvedValue([]),
        inventory: {
          create: jest.fn().mockResolvedValue({
            id: 'i1',
            itemCode: 'INV-2026-0001',
            itemName: 'MacBook',
          }),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));
      const dto = {
        itemName: 'MacBook', category: 'Electronics',
        purchaseDate: '2026-01-15', quantity: 1,
        amount: '999.99', location: 'Office',
      };
      const result = await service.create(dto as any);
      expect(result).toHaveProperty('itemCode', 'INV-2026-0001');
      expect(mockTx.inventory.create).toHaveBeenCalled();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when item does not exist', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('deletes the item when found', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue({ id: 'i1' });
      mockPrisma.inventory.delete.mockResolvedValue({ id: 'i1' });
      const result = await service.remove('i1');
      expect(result).toEqual({ id: 'i1' });
    });
  });
});
