# WebSocket Load Testing for Study Rooms

This directory contains load testing tools to verify that your WebSocket implementation can handle high concurrent loads, specifically testing scenarios where 100+ users join a study room and interact simultaneously.

## Overview

The load testing suite simulates multiple users connecting to your WebSocket server, joining study rooms, and performing various interactions such as:
- Joining sessions
- Sending chat messages
- Checking permissions
- Receiving real-time updates

## Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** (as per project preference)
3. A running backend server with WebSocket support
4. (Optional) Clerk authentication setup for realistic token generation

## Installation

```bash
cd load-tests
pnpm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:
```env
# WebSocket Server URL
WS_URL=http://localhost:3001

# Test Configuration
TOTAL_USERS=100
RAMP_UP_TIME=10        # Seconds to ramp up all connections
TEST_DURATION=60       # How long to run the test

# Study Room Configuration
STUDY_ROOM_ID=your-study-room-id-here
SESSION_TYPE=studyRoom

# Clerk Authentication (optional, for real tokens)
CLERK_SECRET_KEY=your-clerk-secret-key
CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key

# Test User IDs (optional, comma-separated)
# If not provided, will generate test-user-1, test-user-2, etc.
TEST_USER_IDS=user1,user2,user3

# Chat Channel ID (for chat-heavy scenario)
CHAT_CHANNEL_ID=your-chat-channel-id-here
```

## Usage

### Basic Study Room Load Test
Simulates 100 users joining a study room and staying connected:
```bash
pnpm test:study-room
```

### Chat Heavy Scenario
Simulates users sending frequent chat messages:
```bash
pnpm test:chat-heavy
```

### Permissions Scenario
Simulates frequent permission checks:
```bash
pnpm test:permissions
```

### Run All Scenarios
Runs all scenarios sequentially:
```bash
pnpm test:all
```

### Custom Configuration
You can override configuration via command line or environment variables:
```bash
TOTAL_USERS=200 TEST_DURATION=120 pnpm test
```

## Test Scenarios

### 1. Study Room Scenario (`study-room`)
- Connects N users to the WebSocket server
- Each user joins a study room session
- Users stay connected for the test duration
- Periodically checks permissions
- Measures connection success rate, latency, and stability

### 2. Chat Heavy Scenario (`chat-heavy`)
- Connects N users
- Each user joins the session
- Users send chat messages every 2-5 seconds
- Tests message throughput and delivery
- Measures message send latency and error rates

### 3. Permissions Scenario (`permissions`)
- Connects N users
- Each user joins the session
- Users frequently check permissions (audio, video, chat)
- Tests permission system under load
- Measures permission check latency

## Metrics Collected

The test suite collects and reports:

### Connection Metrics
- Total connection attempts
- Successful connections
- Failed connections
- Disconnections
- Connection success rate

### Event Metrics
- Events sent (by type)
- Events received (by type)
- Event errors (by type)
- Total event counts

### Latency Metrics
- Join session latency (min, max, avg, P95, P99)
- Message send latency
- Permission check latency
- Update permissions latency

### Health Score
A composite health score (0-100) based on:
- Connection success rate (40 points)
- Error rate (30 points)
- Latency performance (30 points)

## Understanding Results

### Healthy System (Score: 90-100)
- ✅ High connection success rate (>95%)
- ✅ Low error rate (<1%)
- ✅ Reasonable latency (<1s for most operations)
- ✅ System can handle the load gracefully

### Degraded System (Score: 70-89)
- ⚠️ Some connection failures (5-15%)
- ⚠️ Moderate error rate (1-5%)
- ⚠️ Increased latency (1-3s)
- ⚠️ System is under stress but functional

### Unhealthy System (Score: <70)
- ❌ High connection failure rate (>15%)
- ❌ High error rate (>5%)
- ❌ High latency (>3s)
- ❌ System cannot handle the load

## Troubleshooting

### Connection Failures
If you see high connection failure rates:
1. Check that your backend server is running
2. Verify `WS_URL` is correct
3. Check server logs for errors
4. Verify authentication tokens are valid
5. Check server resource limits (CPU, memory, connections)

### High Latency
If latency is high:
1. Check server CPU and memory usage
2. Verify database query performance
3. Check Redis connection pool
4. Review WebSocket gateway implementation
5. Consider horizontal scaling

### Authentication Errors
If you see authentication errors:
1. Verify Clerk configuration (if using)
2. Check token generation logic
3. Ensure test users exist in Clerk (if using real auth)
4. Consider using mock tokens for testing

## Best Practices

1. **Start Small**: Begin with 10-20 users and gradually increase
2. **Monitor Resources**: Watch CPU, memory, and network usage during tests
3. **Test Incrementally**: Test each scenario individually before running all
4. **Use Production-like Data**: Use realistic study room IDs and user IDs
5. **Monitor Server Logs**: Keep an eye on backend logs during testing
6. **Test During Off-peak**: Run load tests during low-traffic periods initially

## Integration with CI/CD

You can integrate these tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Load Tests
  run: |
    cd load-tests
    pnpm install
    pnpm test:study-room
  env:
    WS_URL: ${{ secrets.TEST_WS_URL }}
    STUDY_ROOM_ID: ${{ secrets.TEST_STUDY_ROOM_ID }}
    TOTAL_USERS: 50
    TEST_DURATION: 30
```

## Limitations

- Current implementation uses mock tokens if Clerk is not configured
- Chat gateway testing requires separate connection (not fully implemented)
- Does not test video/audio streaming (only WebSocket events)
- Single-threaded execution (may be slow for very large user counts)

## Future Enhancements

- [ ] Multi-threaded/worker-based execution for larger scale
- [ ] Real-time metrics dashboard
- [ ] Integration with monitoring tools (Prometheus, Grafana)
- [ ] Support for testing video/audio streams
- [ ] Custom scenario builder
- [ ] Load testing API for programmatic access

## Support

For issues or questions:
1. Check server logs for errors
2. Review the test output for specific error messages
3. Verify your configuration matches your setup
4. Check the main project documentation
