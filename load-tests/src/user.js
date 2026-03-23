import { io } from 'socket.io-client';
import { config } from './config.js';

export class TestUser {
  constructor(userId, token, metrics) {
    this.userId = userId;
    this.token = token;
    this.metrics = metrics;
    this.socket = null;
    this.connected = false;
    this.joined = false;
    this.messageInterval = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      this.socket = io(config.wsUrl, {
        transports: ['websocket'],
        auth: { token: this.token },
        reconnection: false,
        timeout: 10000,
      });

      let settled = false;

      this.socket.on('connect', () => {
        this.connected = true;

        // The backend runs async auth in handleConnection. If the token is
        // invalid it calls client.disconnect() within ~1-2s of connecting.
        // Wait 2s before declaring the connection a success so we can catch
        // that immediate kick and report it as an auth failure rather than a
        // later "join session timeout".
        const authTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            const latency = Date.now() - startTime;
            this.metrics.recordConnection(true);
            this.metrics.recordLatency('connection', latency);
            resolve();
          }
        }, 2000);

        this.socket.once('disconnect', (reason) => {
          clearTimeout(authTimer);
          if (!settled) {
            settled = true;
            this.connected = false;
            this.metrics.recordConnection(false);
            this.metrics.recordError('connect', { message: `Auth rejected by server (${reason})` });
            reject(new Error(`Auth rejected by server — check TEST_AUTH_TOKEN in .env (${reason})`));
          }
        });
      });

      this.socket.on('connect_error', (error) => {
        if (!settled) {
          settled = true;
          this.metrics.recordConnection(false);
          this.metrics.recordError('connect', error);
          reject(error);
        }
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.joined = false;
        this.metrics.recordDisconnection();
      });

      // Listen for common events
      this.socket.on('sync-permissions', (data) => {
        this.metrics.recordEventReceived('sync-permissions');
      });

      this.socket.on('moderation-joined', (data) => {
        this.metrics.recordEventReceived('moderation-joined');
      });

      this.socket.on('permissions-updated', (data) => {
        this.metrics.recordEventReceived('permissions-updated');
      });

      this.socket.on('room-settings-updated', (data) => {
        this.metrics.recordEventReceived('room-settings-updated');
      });

      this.socket.on('moderation-error', (error) => {
        this.metrics.recordError('moderation-error', error);
      });

      this.socket.on('error', (error) => {
        this.metrics.recordError('socket-error', error);
      });

      // Chat gateway events
      this.socket.on('authenticated', () => {
        this.metrics.recordEventReceived('authenticated');
      });

      this.socket.on('joined:channel', (data) => {
        this.metrics.recordEventReceived('joined:channel');
      });

      this.socket.on('message:new', (message) => {
        this.metrics.recordEventReceived('message:new');
      });
    });
  }

  async joinSession(sessionId, sessionType) {
    if (!this.connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // The backend emits 'moderation-joined' on success — it does NOT use
      // Socket.IO ack callbacks. Listen for the event instead.
      const onJoined = (data) => {
        if (data.sessionId === sessionId) {
          cleanup();
          const latency = Date.now() - startTime;
          this.metrics.recordLatency('joinSession', latency);
          this.joined = true;
          resolve();
        }
      };

      const onError = (error) => {
        cleanup();
        this.metrics.recordError('join-session', error);
        reject(new Error(error.message || 'Join session error'));
      };

      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        this.socket.off('moderation-joined', onJoined);
        this.socket.off('moderation-error', onError);
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new Error('Join session timeout (no moderation-joined event received)'));
      }, 10000);

      this.socket.on('moderation-joined', onJoined);
      this.socket.on('moderation-error', onError);

      // No ack callback — backend doesn't support it
      this.socket.emit('join-session', { sessionId, sessionType });
      this.metrics.recordEventSent('join-session');
    });
  }

  async joinChannel(channelId) {
    if (!this.connected) {
      return;
    }

    return new Promise((resolve) => {
      this.socket.emit('join:channel', { channelId }, (response) => {
        this.metrics.recordEventSent('join:channel');
        if (response && response.error) {
          this.metrics.recordError('join:channel', response.error);
        }
        resolve();
      });
      
      // Also listen for confirmation
      const onJoined = (data) => {
        if (data.channelId === channelId) {
          this.socket.off('joined:channel', onJoined);
          resolve();
        }
      };
      this.socket.on('joined:channel', onJoined);
    });
  }

  async sendMessage(channelId, content) {
    if (!this.connected) {
      return;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Note: Chat gateway is on the same server (default namespace)
      // Make sure to join the channel first using joinChannel()
      this.socket.emit('message:send', {
        channelId,
        content,
        audienceType: 'EVERYONE',
      }, (response) => {
        const latency = Date.now() - startTime;
        this.metrics.recordLatency('messageSend', latency);
        this.metrics.recordEventSent('message:send');
        
        if (response && response.error) {
          this.metrics.recordError('message:send', response.error);
        }
        resolve();
      });
    });
  }

  async checkPermission(sessionId, type) {
    if (!this.connected || !this.joined) {
      return;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      
      this.socket.emit('check-permission', { sessionId, type }, (response) => {
        const latency = Date.now() - startTime;
        this.metrics.recordLatency('permissionCheck', latency);
        this.metrics.recordEventSent('check-permission');
        
        if (response && response.error) {
          this.metrics.recordError('check-permission', response.error);
        }
        resolve();
      });
    });
  }

  startChatActivity(channelId, intervalMs = 5000) {
    if (this.messageInterval) {
      return;
    }

    this.messageInterval = setInterval(() => {
      if (this.connected && this.joined) {
        const messages = [
          'Hello everyone!',
          'How is everyone doing?',
          'This is a test message',
          'Great session!',
          'Thanks for the help!',
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.sendMessage(channelId, randomMessage);
      }
    }, intervalMs);
  }

  stopChatActivity() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
      this.messageInterval = null;
    }
  }

  disconnect() {
    this.stopChatActivity();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.joined = false;
  }
}
