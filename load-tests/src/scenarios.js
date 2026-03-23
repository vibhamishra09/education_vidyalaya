import { TestUser } from './user.js';
import { config } from './config.js';

export class ScenarioRunner {
  constructor(metrics, generateToken) {
    this.metrics = metrics;
    this.generateToken = generateToken;
    this.users = [];
  }

  async runStudyRoomScenario() {
    console.log('Running Study Room Load Test Scenario...');
    
    const sessionId = config.studyRoomId;
    const sessionType = config.sessionType;

    if (!sessionId) {
      throw new Error('STUDY_ROOM_ID is required for study room scenario');
    }

    // Generate user IDs
    const userIds = config.testUserIds || 
      Array.from({ length: config.totalUsers }, (_, i) => `test-user-${i + 1}`);

    // Create users
    console.log(`Creating ${userIds.length} test users...`);
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const token = await this.generateToken(userId);
      this.users.push(new TestUser(userId, token, this.metrics));
    }

    // Ramp up connections
    console.log(`Ramping up ${userIds.length} connections over ${config.rampUpTime} seconds...`);
    const rampUpDelay = (config.rampUpTime * 1000) / userIds.length;

    for (let i = 0; i < this.users.length; i++) {
      const user = this.users[i];
      
      setTimeout(async () => {
        try {
          await user.connect();
          await user.joinSession(sessionId, sessionType);
          console.log(`User ${i + 1}/${this.users.length} connected and joined`);
        } catch (error) {
          console.error(`Failed to connect user ${i + 1}:`, error.message);
        }
      }, i * rampUpDelay);
    }

    // Wait for ramp up
    await new Promise(resolve => setTimeout(resolve, config.rampUpTime * 1000 + 2000));

    // Run test for specified duration
    console.log(`Running test for ${config.testDuration} seconds...`);
    const testStartTime = Date.now();
    const testEndTime = testStartTime + (config.testDuration * 1000);

    // Simulate periodic permission checks
    const permissionCheckInterval = setInterval(() => {
      this.users.forEach(user => {
        if (user.joined) {
          user.checkPermission(sessionId, 'chat');
        }
      });
    }, 10000); // Every 10 seconds

    // Wait for test duration
    while (Date.now() < testEndTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    clearInterval(permissionCheckInterval);

    // Cleanup
    console.log('Disconnecting all users...');
    await this.disconnectAll();
  }

  async runChatHeavyScenario() {
    console.log('Running Chat Heavy Load Test Scenario...');
    
    const sessionId = config.studyRoomId;
    const sessionType = config.sessionType;
    const channelId = config.chatChannelId;

    if (!sessionId) {
      throw new Error('STUDY_ROOM_ID is required');
    }
    if (!channelId) {
      throw new Error('CHAT_CHANNEL_ID is required for chat-heavy scenario');
    }

    // Generate user IDs
    const userIds = config.testUserIds || 
      Array.from({ length: config.totalUsers }, (_, i) => `test-user-${i + 1}`);

    // Create and connect users
    console.log(`Creating and connecting ${userIds.length} users...`);
    const rampUpDelay = (config.rampUpTime * 1000) / userIds.length;

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const token = await this.generateToken(userId);
      const user = new TestUser(userId, token, this.metrics);
      this.users.push(user);

      setTimeout(async () => {
        try {
          await user.connect();
          await user.joinSession(sessionId, sessionType);
          // Join chat channel
          await user.joinChannel(channelId);
          // Start sending messages every 2-5 seconds
          const messageInterval = 2000 + Math.random() * 3000;
          user.startChatActivity(channelId, messageInterval);
          console.log(`User ${i + 1}/${userIds.length} connected and started chatting`);
        } catch (error) {
          console.error(`Failed to connect user ${i + 1}:`, error.message);
        }
      }, i * rampUpDelay);
    }

    // Wait for ramp up
    await new Promise(resolve => setTimeout(resolve, config.rampUpTime * 1000 + 2000));

    // Run test
    console.log(`Running chat-heavy test for ${config.testDuration} seconds...`);
    await new Promise(resolve => setTimeout(resolve, config.testDuration * 1000));

    // Cleanup
    console.log('Stopping chat activity and disconnecting...');
    await this.disconnectAll();
  }

  async runPermissionsScenario() {
    console.log('Running Permissions Load Test Scenario...');
    
    const sessionId = config.studyRoomId;
    const sessionType = config.sessionType;

    if (!sessionId) {
      throw new Error('STUDY_ROOM_ID is required');
    }

    // Generate user IDs
    const userIds = config.testUserIds || 
      Array.from({ length: config.totalUsers }, (_, i) => `test-user-${i + 1}`);

    // Create and connect users
    console.log(`Creating and connecting ${userIds.length} users...`);
    const rampUpDelay = (config.rampUpTime * 1000) / userIds.length;

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const token = await this.generateToken(userId);
      const user = new TestUser(userId, token, this.metrics);
      this.users.push(user);

      setTimeout(async () => {
        try {
          await user.connect();
          await user.joinSession(sessionId, sessionType);
          console.log(`User ${i + 1}/${userIds.length} connected`);
        } catch (error) {
          console.error(`Failed to connect user ${i + 1}:`, error.message);
        }
      }, i * rampUpDelay);
    }

    // Wait for ramp up
    await new Promise(resolve => setTimeout(resolve, config.rampUpTime * 1000 + 2000));

    // Simulate frequent permission checks
    console.log(`Running permissions test for ${config.testDuration} seconds...`);
    const permissionTypes = ['audio', 'video', 'chat'];
    
    const permissionCheckInterval = setInterval(() => {
      this.users.forEach(user => {
        if (user.joined) {
          const type = permissionTypes[Math.floor(Math.random() * permissionTypes.length)];
          user.checkPermission(sessionId, type);
        }
      });
    }, 2000); // Every 2 seconds

    // Run test
    await new Promise(resolve => setTimeout(resolve, config.testDuration * 1000));

    clearInterval(permissionCheckInterval);

    // Cleanup
    await this.disconnectAll();
  }

  async disconnectAll() {
    const disconnectPromises = this.users.map(user => {
      return new Promise(resolve => {
        user.disconnect();
        setTimeout(resolve, 100);
      });
    });
    await Promise.all(disconnectPromises);
    this.users = [];
  }
}
