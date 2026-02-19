import 'reflect-metadata';
import { StudyRoomRecurrenceMode } from './dto/study-room.dto';
import { buildStudyRoomOccurrences } from './recurrence.util';

describe('buildStudyRoomOccurrences', () => {
  it('generates daily occurrences with interval', () => {
    const occurrences = buildStudyRoomOccurrences({
      startDate: '2026-03-01',
      time: '10:00',
      timezone: 'UTC',
      recurrence: {
        mode: StudyRoomRecurrenceMode.DAILY,
        interval: 2,
        repeatUntil: '2026-03-07',
      },
    });

    expect(occurrences.map((o) => o.localDate)).toEqual([
      '2026-03-01',
      '2026-03-03',
      '2026-03-05',
      '2026-03-07',
    ]);
  });

  it('generates weekly occurrences for selected weekdays', () => {
    const occurrences = buildStudyRoomOccurrences({
      startDate: '2026-03-02', // Monday
      time: '10:00',
      timezone: 'UTC',
      recurrence: {
        mode: StudyRoomRecurrenceMode.WEEKLY,
        interval: 1,
        weekdays: [1, 3],
        repeatUntil: '2026-03-13',
      },
    });

    expect(occurrences.map((o) => o.localDate)).toEqual([
      '2026-03-02',
      '2026-03-04',
      '2026-03-09',
      '2026-03-11',
    ]);
  });

  it('deduplicates custom dates and includes start date', () => {
    const occurrences = buildStudyRoomOccurrences({
      startDate: '2026-03-10',
      time: '10:00',
      timezone: 'UTC',
      recurrence: {
        mode: StudyRoomRecurrenceMode.CUSTOM_DATES,
        customDates: ['2026-03-11', '2026-03-11', '2026-03-20'],
        repeatUntil: '2026-03-25',
      },
    });

    expect(occurrences.map((o) => o.localDate)).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-20',
    ]);
  });

  it('rejects recurrence beyond one year', () => {
    expect(() =>
      buildStudyRoomOccurrences({
        startDate: '2026-01-01',
        time: '10:00',
        timezone: 'UTC',
        recurrence: {
          mode: StudyRoomRecurrenceMode.DAILY,
          interval: 1,
          repeatUntil: '2027-02-01',
        },
      }),
    ).toThrow('one year');
  });
});
