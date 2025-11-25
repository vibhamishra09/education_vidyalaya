import apiClient from '../api-client';

export interface UserAvailability {
  id: string;
  userId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlockedTimeSlot {
  id: string;
  userId: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: string;
  bufferTime: number; // Minutes between sessions
  minAdvanceTime: number; // Minimum minutes before booking
  maxFutureBooking: number; // Maximum days in future
}

export interface AvailabilityConflict {
  id: string;
  type: 'session' | 'blocked_slot' | 'availability';
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
  conflicts?: AvailabilityConflict[];
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface SetAvailabilityData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface SetMultipleAvailabilityData {
  availability: SetAvailabilityData[];
}

export interface CreateBlockedSlotData {
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  reason?: string;
}

export interface UpdatePreferencesData {
  bufferTime?: number;
  minAdvanceTime?: number;
  maxFutureBooking?: number;
}

/**
 * API client for availability management
 */
export const availabilityApi = {
  /**
   * Get current user's availability settings
   */
  async getMyAvailability(): Promise<{ availability: UserAvailability[] }> {
    const response = await apiClient.get('/api/availability');
    return response.data;
  },

  /**
   * Get specific user's availability settings
   */
  async getUserAvailability(userId: string): Promise<{ availability: UserAvailability[] }> {
    const response = await apiClient.get(`/api/availability/${userId}`);
    return response.data;
  },

  /**
   * Set availability for a specific day
   */
  async setDayAvailability(data: SetAvailabilityData): Promise<UserAvailability> {
    const response = await apiClient.post('/api/availability/day', data);
    return response.data;
  },

  /**
   * Set availability for multiple days at once
   */
  async setMultipleDaysAvailability(data: SetMultipleAvailabilityData): Promise<{ availability: UserAvailability[] }> {
    const response = await apiClient.post('/api/availability/bulk', data);
    return response.data;
  },

  /**
   * Update availability for a specific day
   */
  async updateDayAvailability(
    availabilityId: string,
    data: Partial<SetAvailabilityData>
  ): Promise<UserAvailability> {
    const response = await apiClient.patch(`/api/availability/${availabilityId}`, data);
    return response.data;
  },

  /**
   * Delete availability for a specific day
   */
  async deleteDayAvailability(availabilityId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/api/availability/${availabilityId}`);
    return response.data;
  },

  /**
   * Get all blocked time slots for current user
   */
  async getMyBlockedSlots(): Promise<{ blockedSlots: BlockedTimeSlot[] }> {
    const response = await apiClient.get('/api/availability/blocked/slots');
    return response.data;
  },

  /**
   * Get specific user's blocked time slots
   */
  async getUserBlockedSlots(userId: string): Promise<{ blockedSlots: BlockedTimeSlot[] }> {
    const response = await apiClient.get(`/api/availability/blocked/${userId}/slots`);
    return response.data;
  },

  /**
   * Create a blocked time slot
   */
  async createBlockedSlot(data: CreateBlockedSlotData): Promise<BlockedTimeSlot> {
    const response = await apiClient.post('/api/availability/blocked', data);
    return response.data;
  },

  /**
   * Delete a blocked time slot
   */
  async deleteBlockedSlot(blockedSlotId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/api/availability/blocked/${blockedSlotId}`);
    return response.data;
  },

  /**
   * Get current user's booking preferences
   */
  async getMyPreferences(): Promise<UserPreferences> {
    const response = await apiClient.get('/api/availability/preferences');
    return response.data;
  },

  /**
   * Update current user's booking preferences
   */
  async updatePreferences(data: UpdatePreferencesData): Promise<UserPreferences> {
    const response = await apiClient.patch('/api/availability/preferences', data);
    return response.data;
  },

  /**
   * Check if a specific time is available for a user
   */
  async checkAvailability(
    userId: string,
    startTime: string, // ISO date string
    duration: number // Minutes
  ): Promise<AvailabilityCheck> {
    const response = await apiClient.get(`/api/availability/check/${userId}`, {
      params: { startTime, duration },
    });
    return response.data;
  },

  /**
   * Get available slots for a specific date
   */
  async getAvailableSlots(
    userId: string,
    date: string, // YYYY-MM-DD
    duration: number = 60, // Minutes
    interval: number = 30 // Minutes
  ): Promise<{ availableSlots: AvailableSlot[] }> {
    const response = await apiClient.get(`/api/availability/slots/${userId}`, {
      params: { date, duration, interval },
    });
    return response.data;
  },
};
