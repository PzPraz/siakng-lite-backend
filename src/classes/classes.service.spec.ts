import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { DRIZZLE } from 'src/database/database.module';

describe('ClassesService', () => {
  let service: ClassesService;

  const txMock = {
    query: {
      users: { findFirst: jest.fn() },
      classes: { findFirst: jest.fn() },
      classSchedules: { findFirst: jest.fn() },
    },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const dbMock = {
    query: {
      classes: { findMany: jest.fn(), findFirst: jest.fn() },
    },
    select: jest.fn(),
    transaction: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    dbMock.transaction.mockImplementation(async (callback) => callback(txMock));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll maps class data with enrollment stats', async () => {
    dbMock.query.classes.findMany.mockResolvedValue([
      {
        id: 1,
        namaKelas: 'A',
        kapasitas: 30,
        courseId: 10,
        course: { nama: 'Algoritma', kode: 'IF101', sks: 3 },
        dosenId: 'D001',
        dosen: { nama: 'Dr. Dosen' },
        schedules: [{ hari: 1, jamMulai: '08:00', jamSelesai: '10:00' }],
      },
    ]);

    dbMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        groupBy: jest.fn().mockResolvedValue([{ classId: 1, count: '12' }]),
      }),
    });

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 1,
        namaKelas: 'A',
        kapasitas: 30,
        courseId: 10,
        namaMatkul: 'Algoritma',
        kodeMatkul: 'IF101',
        sks: 3,
        dosenId: 'D001',
        namaDosen: 'Dr. Dosen',
        schedules: [{ hari: 1, jamMulai: '08:00', jamSelesai: '10:00' }],
        terisi: 12,
      },
    ]);
  });

  it('create rejects when dosen is not found', async () => {
    txMock.query.users.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        courseId: 1,
        namaKelas: 'A',
        dosenId: 'D001',
        kapasitas: 30,
        schedules: [],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('create rejects duplicate kelas in the same course', async () => {
    txMock.query.users.findFirst.mockResolvedValue({ id: 1 });
    txMock.query.classes.findFirst.mockResolvedValue({ id: 99 });

    await expect(
      service.create({
        courseId: 1,
        namaKelas: 'A',
        dosenId: 'D001',
        kapasitas: 30,
        schedules: [],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('create inserts class and schedules when valid', async () => {
    txMock.query.users.findFirst.mockResolvedValue({ id: 1 });
    txMock.query.classes.findFirst.mockResolvedValue(null);
    txMock.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 5, namaKelas: 'A' }]),
      }),
    });
    txMock.query.classSchedules.findFirst.mockResolvedValue(null);
    txMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    await expect(
      service.create({
        courseId: 1,
        namaKelas: 'A',
        dosenId: 'D001',
        kapasitas: 30,
        schedules: [
          { hari: 1, jamMulai: '08:00', jamSelesai: '10:00', ruangan: 'R1' },
        ],
      }),
    ).resolves.toEqual({ id: 5, namaKelas: 'A' });
  });

  it('update rejects when class is not found', async () => {
    txMock.query.classes.findFirst.mockResolvedValue(null);

    await expect(
      service.update(1, { namaKelas: 'B' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('delete rejects when class is missing', async () => {
    dbMock.delete.mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([]),
      }),
    });

    await expect(service.delete(1)).rejects.toThrow(NotFoundException);
  });

  it('getClassById maps class detail and throws when missing', async () => {
    dbMock.query.classes.findFirst
      .mockResolvedValueOnce({
        id: 1,
        namaKelas: 'A',
        courseId: 10,
        course: { nama: 'Algoritma', kode: 'IF101', sks: 3 },
        dosenId: 'D001',
        dosen: { nama: 'Dr. Dosen' },
        kapasitas: 30,
        schedules: [],
      })
      .mockResolvedValueOnce(null);

    dbMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ count: '9' }]),
      }),
    });

    await expect(service.getClassById(1)).resolves.toEqual({
      id: 1,
      namaKelas: 'A',
      courseId: 10,
      namaMatkul: 'Algoritma',
      sks: 3,
      kodeMatkul: 'IF101',
      dosenId: 'D001',
      namaDosen: 'Dr. Dosen',
      kapasitas: 30,
      terisi: 9,
      schedules: [],
    });

    await expect(service.getClassById(99)).rejects.toThrow(NotFoundException);
  });
});