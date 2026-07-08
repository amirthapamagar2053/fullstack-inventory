import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const mockUsersService = { findByEmail: jest.fn() };
const mockJwtService = { sign: jest.fn().mockReturnValue('test-token') };
const mockPrisma = { user: { create: jest.fn() } };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('throws ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u1' });
      await expect(
        service.register({ name: 'Alice', email: 'a@b.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a user and returns access_token', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1', name: 'Alice', email: 'a@b.com', role: Role.ADMIN,
      });
      const result = await service.register({
        name: 'Alice', email: 'a@b.com', password: 'password123',
      });
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token', 'test-token');
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'a@b.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u1', password: 'hashed', role: Role.ADMIN });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('returns access_token and user without password on valid credentials', async () => {
      const user = { id: 'u1', email: 'a@b.com', name: 'Alice', role: Role.ADMIN, password: 'hashed' };
      mockUsersService.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const result = await service.login({ email: 'a@b.com', password: 'password123' });
      expect(result).toHaveProperty('access_token', 'test-token');
      expect(result.user).not.toHaveProperty('password');
    });
  });
});
