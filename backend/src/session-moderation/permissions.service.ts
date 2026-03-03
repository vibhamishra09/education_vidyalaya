import { Injectable } from '@nestjs/common';
import { MessageAudienceType } from '../generated/prisma/client';
import { redisClient } from '../redis/redis.provider';
import { LoggerService } from '../common/logger';

/**
 * Redis-based permissions service for session moderation
 * 
 * Redis Data Structure:
 * - Global Room Settings: room:{sessionId}:settings (Hash)
 *   Fields: lockAudio (string "true"/"false"), lockVideo, chatDisabled, hideParticipantList
 * 
 * - Individual Overrides: room:{sessionId}:permissions:{userId} (Hash)
 *   Fields: canAudio, canVideo, canChat, canChatEveryone, canChatHost, canChatUser (string "true"/"false")
 */

export interface RoomSettings {
  lockAudio: boolean;
  lockVideo: boolean;
  chatDisabled: boolean;
  hideParticipantList: boolean;
}

export interface UserPermissions {
  canAudio: boolean;
  canVideo: boolean;
  canChat: boolean;
  canChatEveryone: boolean;
  canChatHost: boolean;
  canChatUser: boolean;
}

export interface ComputedPermissions {
  allowAudio: boolean;
  allowVideo: boolean;
  allowChat: boolean;
  allowChatEveryone: boolean;
  allowChatHost: boolean;
  allowChatUser: boolean;
  allowParticipantList: boolean;
}

export interface FlashQuestion {
  id: string;
  text: string;
  duration?: number;      // seconds (0 = manual dismiss)
  position?: 'top' | 'center' | 'bottom';
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  bgColor?: string;
}

@Injectable()
export class PermissionsService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(PermissionsService.name);
  }
  
  // TTL for room permissions (24 hours - should be longer than any session)
  private readonly PERMISSIONS_TTL = 24 * 60 * 60;

  /**
   * Get the Redis key for room settings
   */
  private getRoomSettingsKey(sessionId: string): string {
    return `room:${sessionId}:settings`;
  }

  /**
   * Get the Redis key for user permissions
   */
  private getUserPermissionsKey(sessionId: string, userId: string): string {
    return `room:${sessionId}:permissions:${userId}`;
  }

  /**
   * Get global room settings from Redis
   */
  async getRoomSettings(sessionId: string): Promise<RoomSettings> {
    try {
      const key = this.getRoomSettingsKey(sessionId);
      const settings = await redisClient.hGetAll(key);
      
      // Default values if not set
      return {
        lockAudio: settings.lockAudio === 'true',
        lockVideo: settings.lockVideo === 'true',
        chatDisabled: settings.chatDisabled === 'true',
        hideParticipantList: settings.hideParticipantList === 'true',
      };
    } catch (error) {
      this.logger.error(`Error getting room settings for ${sessionId}:`, error);
      // Return defaults on error
      return {
        lockAudio: false,
        lockVideo: false,
        chatDisabled: false,
        hideParticipantList: false,
      };
    }
  }

  /**
   * Set global room settings in Redis
   */
  async setRoomSettings(sessionId: string, settings: Partial<RoomSettings>): Promise<void> {
    try {
      const key = this.getRoomSettingsKey(sessionId);
      const updates: Record<string, string> = {};
      
      if (settings.lockAudio !== undefined) {
        updates.lockAudio = settings.lockAudio.toString();
      }
      if (settings.lockVideo !== undefined) {
        updates.lockVideo = settings.lockVideo.toString();
      }
      if (settings.chatDisabled !== undefined) {
        updates.chatDisabled = settings.chatDisabled.toString();
      }
      if (settings.hideParticipantList !== undefined) {
        updates.hideParticipantList = settings.hideParticipantList.toString();
      }
      
      if (Object.keys(updates).length > 0) {
        await redisClient.hSet(key, updates);
        await redisClient.expire(key, this.PERMISSIONS_TTL);
      }
      
      this.logger.debug(`Room settings updated for ${sessionId}:`, updates);
    } catch (error) {
      this.logger.error(`Error setting room settings for ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get individual user permissions (overrides) from Redis
   * Returns null if no override exists
   */
  async getUserPermissions(sessionId: string, userId: string): Promise<Partial<UserPermissions> | null> {
    try {
      const key = this.getUserPermissionsKey(sessionId, userId);
      const permissions = await redisClient.hGetAll(key);
      
      if (Object.keys(permissions).length === 0) {
        return null; // No override set
      }
      
      const result: Partial<UserPermissions> = {};
      if (permissions.canAudio !== undefined) {
        result.canAudio = permissions.canAudio === 'true';
      }
      if (permissions.canVideo !== undefined) {
        result.canVideo = permissions.canVideo === 'true';
      }
      if (permissions.canChat !== undefined) {
        result.canChat = permissions.canChat === 'true';
      }
      if (permissions.canChatEveryone !== undefined) {
        result.canChatEveryone = permissions.canChatEveryone === 'true';
      }
      if (permissions.canChatHost !== undefined) {
        result.canChatHost = permissions.canChatHost === 'true';
      }
      if (permissions.canChatUser !== undefined) {
        result.canChatUser = permissions.canChatUser === 'true';
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting user permissions for ${sessionId}/${userId}:`, error);
      return null;
    }
  }

  /**
   * Set individual user permissions (overrides) in Redis
   */
  async setUserPermissions(sessionId: string, userId: string, permissions: Partial<UserPermissions>): Promise<void> {
    try {
      const key = this.getUserPermissionsKey(sessionId, userId);
      const updates: Record<string, string> = {};
      
      if (permissions.canAudio !== undefined) {
        updates.canAudio = permissions.canAudio.toString();
      }
      if (permissions.canVideo !== undefined) {
        updates.canVideo = permissions.canVideo.toString();
      }
      if (permissions.canChat !== undefined) {
        updates.canChat = permissions.canChat.toString();
      }
      if (permissions.canChatEveryone !== undefined) {
        updates.canChatEveryone = permissions.canChatEveryone.toString();
      }
      if (permissions.canChatHost !== undefined) {
        updates.canChatHost = permissions.canChatHost.toString();
      }
      if (permissions.canChatUser !== undefined) {
        updates.canChatUser = permissions.canChatUser.toString();
      }
      
      if (Object.keys(updates).length > 0) {
        await redisClient.hSet(key, updates);
        await redisClient.expire(key, this.PERMISSIONS_TTL);
      }
      
      this.logger.debug(`User permissions updated for ${sessionId}/${userId}:`, updates);
    } catch (error) {
      this.logger.error(`Error setting user permissions for ${sessionId}/${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clear user-specific permissions (reset to global defaults)
   */
  async clearUserPermissions(sessionId: string, userId: string): Promise<void> {
    try {
      const key = this.getUserPermissionsKey(sessionId, userId);
      await redisClient.del(key);
      this.logger.debug(`User permissions cleared for ${sessionId}/${userId}`);
    } catch (error) {
      this.logger.error(`Error clearing user permissions for ${sessionId}/${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get computed permissions for a user (combining global settings with user overrides)
   * Logic:
   * - If user is the host, always return full permissions (host is never restricted)
   * - If user has an override, use that
   * - Otherwise, fall back to global room settings
   * - Global lockAudio=true means user canAudio=false (unless overridden to canAudio=true)
   */
  async getComputedPermissions(sessionId: string, userId: string, isHost: boolean = false): Promise<ComputedPermissions> {
    try {
      // Host is NEVER restricted by room settings or individual locks
      if (isHost) {
        return {
          allowAudio: true,
          allowVideo: true,
          allowChat: true,
          allowChatEveryone: true,
          allowChatHost: true,
          allowChatUser: true,
          allowParticipantList: true,
        };
      }
      
      const [roomSettings, userOverrides] = await Promise.all([
        this.getRoomSettings(sessionId),
        this.getUserPermissions(sessionId, userId),
      ]);
      
      // Compute effective permissions
      // Priority: User override > Global setting
      // Note: lockAudio=true means audio is NOT allowed (inverted logic)
      const allowChat =
        userOverrides?.canChat !== undefined
          ? userOverrides.canChat
          : !roomSettings.chatDisabled;

      return {
        allowAudio: userOverrides?.canAudio !== undefined 
          ? userOverrides.canAudio 
          : !roomSettings.lockAudio,
        allowVideo: userOverrides?.canVideo !== undefined 
          ? userOverrides.canVideo 
          : !roomSettings.lockVideo,
        allowChat,
        allowChatEveryone: allowChat && (userOverrides?.canChatEveryone ?? true),
        allowChatHost: allowChat && (userOverrides?.canChatHost ?? true),
        allowChatUser: allowChat && (userOverrides?.canChatUser ?? true),
        allowParticipantList: !roomSettings.hideParticipantList,
      };
    } catch (error) {
      this.logger.error(`Error computing permissions for ${sessionId}/${userId}:`, error);
      // Return all allowed on error (fail open for better UX)
      return {
        allowAudio: true,
        allowVideo: true,
        allowChat: true,
        allowChatEveryone: true,
        allowChatHost: true,
        allowChatUser: true,
        allowParticipantList: true,
      };
    }
  }

  /**
   * Check if a specific permission is allowed for a user
   * Host is always allowed all permissions
   */
  async hasPermission(sessionId: string, userId: string, type: 'audio' | 'video' | 'chat', isHost: boolean = false): Promise<boolean> {
    // Host is NEVER restricted
    if (isHost) {
      return true;
    }
    
    const computed = await this.getComputedPermissions(sessionId, userId, false);
    switch (type) {
      case 'audio':
        return computed.allowAudio;
      case 'video':
        return computed.allowVideo;
      case 'chat':
        return computed.allowChat;
    }
  }

  async hasAudiencePermission(
    sessionId: string,
    userId: string,
    audienceType: MessageAudienceType,
    isHost: boolean = false,
  ): Promise<boolean> {
    const computed = await this.getComputedPermissions(sessionId, userId, isHost);
    if (!computed.allowChat) {
      return false;
    }

    switch (audienceType) {
      case MessageAudienceType.EVERYONE:
        return computed.allowChatEveryone;
      case MessageAudienceType.HOST:
        return computed.allowChatHost;
      case MessageAudienceType.USER:
        return computed.allowChatUser;
      default:
        return computed.allowChat;
    }
  }

  // ─── Flash Message / Question List ──────────────────────────────────────

  private getFlashQuestionsKey(sessionId: string, hostId: string): string {
    return `flash:${sessionId}:host:${hostId}:questions`;
  }

  /**
   * Persist a host's question list to Redis.
   */
  async setFlashQuestions(sessionId: string, hostId: string, questions: FlashQuestion[]): Promise<void> {
    try {
      const key = this.getFlashQuestionsKey(sessionId, hostId);
      await redisClient.set(key, JSON.stringify(questions), { EX: this.PERMISSIONS_TTL });
      this.logger.debug(`Flash questions saved for ${sessionId}/${hostId}: ${questions.length} items`);
    } catch (error) {
      this.logger.error(`Error saving flash questions for ${sessionId}/${hostId}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a host's question list from Redis. Returns [] if nothing stored.
   */
  async getFlashQuestions(sessionId: string, hostId: string): Promise<FlashQuestion[]> {
    try {
      const key = this.getFlashQuestionsKey(sessionId, hostId);
      const raw = await redisClient.get(key);
      if (!raw) return [];
      return JSON.parse(raw) as FlashQuestion[];
    } catch (error) {
      this.logger.error(`Error getting flash questions for ${sessionId}/${hostId}:`, error);
      return [];
    }
  }

  /**
   * Clean up all permissions for a session (call when session ends)
   */
  async cleanupSession(sessionId: string): Promise<void> {
    try {
      // Get all keys matching this session (permissions + flash messages)
      const roomPattern = `room:${sessionId}:*`;
      const flashPattern = `flash:${sessionId}:*`;
      const [roomKeys, flashKeys] = await Promise.all([
        redisClient.keys(roomPattern),
        redisClient.keys(flashPattern),
      ]);
      const allKeys = [...roomKeys, ...flashKeys];

      if (allKeys.length > 0) {
        await redisClient.del(allKeys);
        this.logger.debug(`Cleaned up ${allKeys.length} keys for session ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up session ${sessionId}:`, error);
    }
  }
}
