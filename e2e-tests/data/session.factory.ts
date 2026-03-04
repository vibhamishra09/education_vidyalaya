export interface SessionRequestData {
  skill: string;
  message: string;
}

export function createSessionRequest(overrides: Partial<SessionRequestData> = {}): SessionRequestData {
  return {
    skill: 'JavaScript',
    message: 'Hi! I would love to learn more about this topic. Can we schedule a session?',
    ...overrides,
  };
}
