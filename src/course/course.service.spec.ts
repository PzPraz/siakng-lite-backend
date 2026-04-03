import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CourseService } from './course.service';
import { DRIZZLE } from '../database/database.module';

describe('CourseService', () => {
  let service: CourseService;

  const dbMock = {
    query: {
      courses: {
        findFirst: jest.fn(),
      },
    },
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll returns all courses', async () => {
    const courses = [
      { id: 1, kode: 'IF101', nama: 'Algoritma', sks: 3 },
    ];

    dbMock.select.mockReturnValue({
      from: jest.fn().mockResolvedValue(courses),
    });

    await expect(service.findAll()).resolves.toEqual(courses);
  });

  it('create rejects duplicate course code', async () => {
    dbMock.query.courses.findFirst.mockResolvedValue({
      id: 1,
      kode: 'IF101',
      nama: 'Algoritma',
    });

    await expect(
      service.create({ kode: 'IF101', nama: 'Algoritma Baru', sks: 3 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('create inserts a new course when unique', async () => {
    const payload = { kode: 'IF102', nama: 'Basis Data', sks: 3 };

    dbMock.query.courses.findFirst.mockResolvedValue(null);
    dbMock.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([payload]),
      }),
    });

    await expect(service.create(payload)).resolves.toEqual([payload]);
  });

  it('delete rejects when course does not exist', async () => {
    dbMock.query.courses.findFirst.mockResolvedValue(null);

    await expect(service.delete(99)).rejects.toThrow(
      'Mata kuliah tidak ditemukan',
    );
  });

  it('getById maps classes and enrollment counts', async () => {
    dbMock.query.courses.findFirst.mockResolvedValue({
      id: 1,
      nama: 'Algoritma',
      kode: 'IF101',
      sks: 3,
      classes: [
        {
          id: 10,
          namaKelas: 'A',
          kapasitas: 30,
          dosen: { nama: 'Dr. Dosen' },
          schedules: [{ hari: 1, jamMulai: '08:00', jamSelesai: '10:00' }],
        },
        {
          id: 11,
          namaKelas: 'B',
          kapasitas: 25,
          dosen: null,
          schedules: [{ hari: 2, jamMulai: '10:00', jamSelesai: '12:00' }],
        },
      ],
    });

    dbMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest
          .fn()
          .mockResolvedValueOnce([{ count: '12' }])
          .mockResolvedValueOnce([{ count: '0' }]),
      }),
    });

    await expect(service.getById(1)).resolves.toEqual({
      id: 1,
      nama: 'Algoritma',
      kode: 'IF101',
      sks: 3,
      classes: [
        {
          id: 10,
          namaKelas: 'A',
          kapasitas: 30,
          namaDosen: 'Dr. Dosen',
          terisi: 12,
          schedules: [{ hari: 1, jamMulai: '08:00', jamSelesai: '10:00' }],
        },
        {
          id: 11,
          namaKelas: 'B',
          kapasitas: 25,
          namaDosen: 'Staf Pengajar',
          terisi: 0,
          schedules: [{ hari: 2, jamMulai: '10:00', jamSelesai: '12:00' }],
        },
      ],
    });
  });
});