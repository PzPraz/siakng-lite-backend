type ScheduleSlot = {
  hari: number;
  jamMulai: string;
  jamSelesai: string;
};

export function isScheduleOverlap(a: ScheduleSlot, b: ScheduleSlot): boolean {
  return a.hari === b.hari && a.jamMulai < b.jamSelesai && a.jamSelesai > b.jamMulai;
}

export function findOverlappingPair<T extends ScheduleSlot>(
  schedules: T[],
  shouldCompare: (a: T, b: T) => boolean = () => true,
): [T, T] | null {
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i];
      const b = schedules[j];

      if (!shouldCompare(a, b)) {
        continue;
      }

      if (isScheduleOverlap(a, b)) {
        return [a, b];
      }
    }
  }

  return null;
}
