/** Generate test user data. */

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  bio?: string;
  location?: string;
  school?: string;
  skillsIHave: string[];
  skillsIWant: string[];
}

const SKILLS = ['JavaScript', 'Python', 'React', 'TypeScript', 'Design', 'Math', 'English', 'Spanish'];

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const id = Date.now();
  return {
    email: `e2e+${id}@webyalaya.test`,
    password: 'TestPass123!',
    displayName: `Test User ${id}`,
    bio: 'E2E test user bio',
    location: 'Test City',
    school: 'Test University',
    skillsIHave: ['JavaScript', 'React'],
    skillsIWant: ['Python', 'Design'],
    ...overrides,
  };
}

/** Use for the pre-created onboarded test user in .env.test */
export function getOnboardedUser(): Pick<TestUser, 'email' | 'password'> {
  return {
    email: process.env.TEST_USER_EMAIL ?? 'test@webyalaya.test',
    password: process.env.TEST_USER_PASSWORD ?? 'TestPass123!',
  };
}

export function getSecondUser(): Pick<TestUser, 'email' | 'password'> {
  return {
    email: process.env.TEST_USER_2_EMAIL ?? 'peer@webyalaya.test',
    password: process.env.TEST_USER_2_PASSWORD ?? 'TestPass123!',
  };
}
