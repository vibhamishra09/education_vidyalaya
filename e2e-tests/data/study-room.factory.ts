import { StudyRoomData } from '../pages/study-room/create-room.page';

export function createStudyRoomData(overrides: Partial<StudyRoomData> = {}): StudyRoomData {
  const id = Date.now();
  return {
    name: `E2E Test Room ${id}`,
    description: 'Automated test study room',
    maxParticipants: 5,
    skill: 'JavaScript',
    isPrivate: false,
    ...overrides,
  };
}
