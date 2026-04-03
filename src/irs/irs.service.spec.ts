import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IrsService } from './irs.service';
import { DRIZZLE } from 'src/database/database.module';

describe('IrsService', () => {
  let service: IrsService;

  const txMock = {
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
  };

  const dbMock = {
    transaction: jest.fn(),
    select: jest.fn(),
    query: {
      grades: { findMany: jest.fn() },
    },
  };

  const makeSelectWhere = (value: unknown) => ({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(value),
    }),
  });

  const makeSelectJoinWhere = (value: unknown) => ({
    from: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(value),
      }),
    }),
  });

  const makeSelectJoinJoinWhere = (value: unknown) => ({
    from: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(value),
        }),
      }),
    }),
  });

  const makeSelectJoinJoinJoinWhere = (value: unknown) => ({
    from: jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(value),
          }),
        }),
      }),
    }),
  });

  const makeSelectLimit = (value: unknown) => ({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(value),
      }),
    }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    dbMock.transaction.mockImplementation(async (callback) => callback(txMock));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IrsService,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
      ],
    }).compile();

    service = module.get<IrsService>(IrsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sync rejects invalid payload type', async () => {
    await expect(service.sync(1, null as unknown as number[])).rejects.toThrow(
      BadRequestException,
    );
  });

  it('sync rejects when class is not found', async () => {
    txMock.select
      .mockReturnValueOnce(makeSelectWhere([]))
      .mockReturnValueOnce(makeSelectJoinWhere([]));

    await expect(service.sync(1, [10])).rejects.toThrow(BadRequestException);
  });

  it('sync rejects when removing approved class from IRS', async () => {
    txMock.select.mockReturnValueOnce(
      makeSelectWhere([{ id: 1, classId: 10, status: 'APPROVED' }]),
    );

    await expect(service.sync(1, [20])).rejects.toThrow(
      'Tidak bisa mengubah matkul yang sudah disetujui',
    );
  });

  it('sync rejects when student already registered in the same course', async () => {
    txMock.select
      .mockReturnValueOnce(makeSelectWhere([]))
      .mockReturnValueOnce(
        makeSelectJoinWhere([
          { id: 20, kapasitas: 40, courseId: 1, namaMatkul: 'Algoritma', sks: 3 },
        ]),
      )
      .mockReturnValueOnce(makeSelectWhere([]))
      .mockReturnValueOnce(
        makeSelectJoinJoinWhere([
          { classId: 1, courseId: 1, namaMatkul: 'Algoritma', sks: 3 },
        ]),
      )
      .mockReturnValueOnce(makeSelectJoinJoinJoinWhere([]));

    await expect(service.sync(1, [20])).rejects.toThrow(
      'Anda sudah terdaftar di mata kuliah Algoritma',
    );
  });

  it('sync rejects when new class schedule conflicts with existing IRS schedule', async () => {
    txMock.select
      .mockReturnValueOnce(makeSelectWhere([]))
      .mockReturnValueOnce(
        makeSelectJoinWhere([
          { id: 20, kapasitas: 40, courseId: 2, namaMatkul: 'Basis Data', sks: 3 },
        ]),
      )
      .mockReturnValueOnce(makeSelectWhere([
        { classId: 20, hari: 1, jamMulai: '08:00', jamSelesai: '10:00' },
      ]))
      .mockReturnValueOnce(
        makeSelectJoinJoinWhere([
          { classId: 1, courseId: 1, namaMatkul: 'Algoritma', sks: 3 },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectJoinJoinJoinWhere([
          {
            namaMatkul: 'Algoritma',
            hari: 1,
            jamMulai: '08:30',
            jamSelesai: '10:30',
          },
        ]),
      );

    await expect(service.sync(1, [20])).rejects.toThrow(
      'Jadwal bentrok: Basis Data dengan Algoritma',
    );
  });

  it('sync rejects when new classes overlap each other', async () => {
    txMock.select
      .mockReturnValueOnce(makeSelectWhere([]))
      .mockReturnValueOnce(
        makeSelectJoinWhere([
          { id: 20, kapasitas: 40, courseId: 2, namaMatkul: 'Basis Data', sks: 3 },
          { id: 21, kapasitas: 40, courseId: 3, namaMatkul: 'Jaringan', sks: 3 },
        ]),
      )
      .mockReturnValueOnce(makeSelectWhere([
        { classId: 20, hari: 1, jamMulai: '08:00', jamSelesai: '10:00' },
        { classId: 21, hari: 1, jamMulai: '09:00', jamSelesai: '11:00' },
      ]))
      .mockReturnValueOnce(makeSelectJoinJoinWhere([]))
      .mockReturnValueOnce(makeSelectJoinJoinJoinWhere([]));

    await expect(service.sync(1, [20, 21])).rejects.toThrow(
      'Jadwal bentrok antar kelas baru: Basis Data dengan Jaringan',
    );
  });

  it('sync rejects when class capacity is full', async () => {
    txMock.select
      .mockReturnValueOnce(makeSelectWhere([]))
      .mockReturnValueOnce(
        makeSelectJoinWhere([
          { id: 20, kapasitas: 1, courseId: 2, namaMatkul: 'Basis Data', sks: 3 },
        ]),
      )
      .mockReturnValueOnce(makeSelectWhere([]))
      .mockReturnValueOnce(makeSelectJoinJoinWhere([]))
      .mockReturnValueOnce(makeSelectJoinJoinJoinWhere([]))
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            for: jest.fn().mockResolvedValue([{ id: 20 }]),
          }),
        }),
      })
      .mockReturnValueOnce(
        makeSelectWhere([{ count: '1' }]),
      );

    await expect(service.sync(1, [20])).rejects.toThrow(
      'Kelas Basis Data sudah penuh',
    );
  });

  it('sync returns success when nothing changes', async () => {
    txMock.select.mockReturnValueOnce(
      makeSelectWhere([{ id: 1, classId: 10, status: 'PENDING' }]),
    );

    await expect(service.sync(1, [10])).resolves.toEqual({
      message: 'IRS berhasil disinkronisasi',
    });
  });

  it('drop rejects when record not found', async () => {
    txMock.select.mockReturnValueOnce(makeSelectLimit([]));

    await expect(service.drop(1, 99)).rejects.toThrow(NotFoundException);
  });

  it('drop rejects when record is already approved', async () => {
    txMock.select.mockReturnValueOnce(
      makeSelectLimit([{ id: 1, studentId: 1, status: 'APPROVED' }]),
    );

    await expect(service.drop(1, 1)).rejects.toThrow(
      'Mata kuliah sudah disetujui (APPROVED). Silakan hubungi Dosen PA untuk melakukan perubahan.',
    );
  });

  it('drop removes a pending IRS record', async () => {
    txMock.select.mockReturnValueOnce(
      makeSelectLimit([{ id: 1, studentId: 1, status: 'PENDING' }]),
    );

    txMock.delete.mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([
          { id: 1, studentId: 1, status: 'PENDING' },
        ]),
      }),
    });

    await expect(service.drop(1, 1)).resolves.toEqual({
      message: 'Mata kuliah berhasil dihapus dari IRS',
      droppedItem: { id: 1, studentId: 1, status: 'PENDING' },
    });
  });

  it('getMyIrs returns joined IRS data', async () => {
    dbMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                id: 1,
                status: 'PENDING',
                createdAt: new Date(),
                namaKelas: 'A',
                namaMatkul: 'Algoritma',
                kodeMatkul: 'IF101',
                sks: 3,
                classId: 10,
              },
            ]),
          }),
        }),
      }),
    });

    await expect(service.getMyIrs(1)).resolves.toHaveLength(1);
  });
});