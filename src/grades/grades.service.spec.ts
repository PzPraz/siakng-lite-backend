import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { GradesService } from './grades.service';
import { DRIZZLE } from 'src/database/database.module';

describe('GradesService', () => {
  let service: GradesService;

  const txMock = {
    insert: jest.fn(),
  };

  const dbMock = {
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
    query: {
      grades: {
        findMany: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    dbMock.transaction.mockImplementation(async (callback) => callback(txMock));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradesService,
        {
          provide: DRIZZLE,
          useValue: dbMock,
        },
      ],
    }).compile();

    service = module.get<GradesService>(GradesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createComponent rejects duplicate names in payload', async () => {
    await expect(
      service.createComponent({
        classId: 1,
        components: [
          { componentName: 'UTS', weight: 50 },
          { componentName: 'uts', weight: 50 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('createComponent stores a new component when valid', async () => {
    dbMock.select
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

    dbMock.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([
          { id: 1, classId: 1, componentName: 'UTS', weight: 50 },
        ]),
      }),
    });

    await expect(
      service.createComponent({
        classId: 1,
        components: [{ componentName: 'UTS', weight: 50 }],
      }),
    ).resolves.toEqual([
      { id: 1, classId: 1, componentName: 'UTS', weight: 50 },
    ]);
  });

  it('editComponent throws when component does not exist', async () => {
    dbMock.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(
      service.editComponent(99, {
        classId: 1,
        components: [{ componentName: 'UTS', weight: 50 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deleteComponent throws when nothing is deleted', async () => {
    dbMock.delete.mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([]),
      }),
    });

    await expect(service.deleteComponent(1)).rejects.toThrow(
      'Gagal menghapus data nilai komponen',
    );
  });

  it('getGradeComponents throws when data is not found', async () => {
    dbMock.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    await expect(service.getGradeComponents(1)).rejects.toThrow(
      'Gagal mengambil data nilai komponen',
    );
  });

  it('gradeStudent rejects invalid score values', async () => {
    await expect(
      service.gradeStudent(1, [{ componentId: 10, value: 120 }]),
    ).rejects.toThrow(BadRequestException);
  });

  it('gradeStudent stores grades in a transaction', async () => {
    txMock.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoUpdate: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { id: 1, studentId: 1, componentId: 10, value: '88' },
          ]),
        }),
      }),
    });

    await expect(
      service.gradeStudent(1, [{ componentId: 10, value: 88 }]),
    ).resolves.toEqual([
      { id: 1, studentId: 1, componentId: 10, value: '88' },
    ]);
  });

  it('getStudentGradeByClass blocks mahasiswa from viewing other students', async () => {
    await expect(
      service.getStudentGradeByClass(
        2,
        1,
        { id: 1, npm: '123', nama: 'Mahasiswa', role: 'MAHASISWA' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('getStudentGradeByClass filters by class and publication status for mahasiswa', async () => {
    dbMock.query.grades.findMany.mockResolvedValue([
      {
        id: 1,
        value: '80',
        component: { classId: 1, isPublished: true },
      },
      {
        id: 2,
        value: '90',
        component: { classId: 1, isPublished: false },
      },
      {
        id: 3,
        value: '70',
        component: { classId: 2, isPublished: true },
      },
    ]);

    await expect(
      service.getStudentGradeByClass(
        1,
        1,
        { id: 1, npm: '123', nama: 'Mahasiswa', role: 'MAHASISWA' },
      ),
    ).resolves.toEqual([
      {
        id: 1,
        value: '80',
        component: { classId: 1, isPublished: true },
      },
    ]);
  });

  it('getStudentGradeByClass returns all class grades for dosen', async () => {
    dbMock.query.grades.findMany.mockResolvedValue([
      {
        id: 1,
        value: '80',
        component: { classId: 1, isPublished: true },
      },
      {
        id: 2,
        value: '90',
        component: { classId: 1, isPublished: false },
      },
    ]);

    await expect(
      service.getStudentGradeByClass(
        1,
        1,
        { id: 9, npm: '999', nama: 'Dosen', role: 'DOSEN' },
      ),
    ).resolves.toEqual([
      {
        id: 1,
        value: '80',
        component: { classId: 1, isPublished: true },
      },
      {
        id: 2,
        value: '90',
        component: { classId: 1, isPublished: false },
      },
    ]);
  });

  it('setPublishStatus returns update result', async () => {
    dbMock.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 1, isPublished: true }]),
      }),
    });

    await expect(service.setPublishStatus(1, true)).resolves.toEqual([
      { id: 1, isPublished: true },
    ]);
  });
});