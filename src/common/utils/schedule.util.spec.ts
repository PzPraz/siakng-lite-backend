import { findOverlappingPair, isScheduleOverlap } from './schedule.util';

type TestSchedule = {
  classId: number;
  hari: number;
  jamMulai: string;
  jamSelesai: string;
};

describe('schedule.util', () => {
  describe('isScheduleOverlap', () => {
    it('returns true when schedules overlap on the same day', () => {
      const a = {
        hari: 1,
        jamMulai: '08:00',
        jamSelesai: '10:00',
      };

      const b = {
        hari: 1,
        jamMulai: '09:30',
        jamSelesai: '11:00',
      };

      expect(isScheduleOverlap(a, b)).toBe(true);
    });

    it('returns false when schedules are on different days', () => {
      const a = {
        hari: 1,
        jamMulai: '08:00',
        jamSelesai: '10:00',
      };

      const b = {
        hari: 2,
        jamMulai: '09:00',
        jamSelesai: '11:00',
      };

      expect(isScheduleOverlap(a, b)).toBe(false);
    });

    it('returns false when schedules only touch at the boundary', () => {
      const a = {
        hari: 1,
        jamMulai: '08:00',
        jamSelesai: '10:00',
      };

      const b = {
        hari: 1,
        jamMulai: '10:00',
        jamSelesai: '11:00',
      };

      expect(isScheduleOverlap(a, b)).toBe(false);
    });
  });

  describe('findOverlappingPair', () => {
    it('returns the first overlapping pair in the list', () => {
      const schedules: TestSchedule[] = [
        { classId: 1, hari: 1, jamMulai: '08:00', jamSelesai: '09:00' },
        { classId: 2, hari: 1, jamMulai: '08:30', jamSelesai: '09:30' },
        { classId: 3, hari: 1, jamMulai: '08:45', jamSelesai: '09:15' },
      ];

      const result = findOverlappingPair(schedules);

      expect(result).toEqual([schedules[0], schedules[1]]);
    });

    it('returns null when there is no overlap', () => {
      const schedules: TestSchedule[] = [
        { classId: 1, hari: 1, jamMulai: '08:00', jamSelesai: '09:00' },
        { classId: 2, hari: 1, jamMulai: '09:00', jamSelesai: '10:00' },
        { classId: 3, hari: 2, jamMulai: '08:00', jamSelesai: '09:00' },
      ];

      expect(findOverlappingPair(schedules)).toBeNull();
    });

    it('respects the shouldCompare predicate', () => {
      const schedules: TestSchedule[] = [
        { classId: 1, hari: 1, jamMulai: '08:00', jamSelesai: '10:00' },
        { classId: 1, hari: 1, jamMulai: '09:00', jamSelesai: '11:00' },
        { classId: 2, hari: 1, jamMulai: '09:00', jamSelesai: '11:00' },
      ];

      const result = findOverlappingPair(
        schedules,
        (a, b) => a.classId !== b.classId,
      );

      expect(result).toEqual([schedules[0], schedules[2]]);
    });
  });
});