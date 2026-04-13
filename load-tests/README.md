# Webyalaya Load & Endurance Testing Suite

This directory contains advanced tools for verifying Webyalaya’s infrastructure under high-concurrency conditions, specifically focused on WebSocket stability and LiveKit SFU media throughput.

## 🚀 Testing Tiers

### 1. Traditional WebSocket Stress (pnpm)
Tests the signaling and chat layers by simulating hundreds of concurrent WebSocket connections.
*   **Command**: `pnpm test:study-room`
*   **Metric**: Health Score (0-100), latency, and error rates.

### 2. LiveKit SFU Media Stress (lk CLI)
Simulates high-fidelity media publishers (720p 30fps) to test SFU egress and bandwidth limits.
*   **Manual Run**: `lk load-test --video-publishers 11 --audio-publishers 11 --duration 2m --room test-room`
*   **Tool**: Official [LiveKit CLI](https://docs.livekit.io/realtime/cli/).

### 3. Integrated Endurance Testing (Shell Script)
Orchestrates a 15-minute, multi-room stress test with high-fidelity telemetry logging.
*   **Command**: `./scripts/livekit-stress-test.sh`
*   **Telemetry**: Outputs `logs/performance_telemetry.csv` containing:
    *   **CPU Usage**: Real-time server load.
    *   **Network (Mbps)**: Inbound/Outbound throughput tracking.
    *   **Concurrency**: Active room counts and total participants.

### 4. Browser-Based WebRTC Metrics (Puppeteer)
Uses headless browsers to collect deep WebRTC statistics directly from the RTC PeerConnection.
*   **Script**: `src/concurrency-test.js`
*   **Metrics**: Round-Trip Time (RTT), NACK rates, and Jitter/Packet Loss.

### 5. Incremental Webinar Stress (Shell Script)
Specifically tests large-scale "Hub and Spoke" scenarios like 100-person webinars.
*   **Command**: `./scripts/webinar-incremental-test.sh`
*   **Scenario**: 1 Host + 10 Panelists (Video/Audio) + 89 Participants (Listeners).
*   **Telemetry**: Outputs `logs/webinar_telemetry.csv` with a focus on **PPS (Packets Per Second)**.

---

## 🛡️ Infrastructure Guardrails
The platform implements hard limits in the backend (`StudyRoomsService`) to ensure stability:
*   **Room Limit**: Hard block at **12 concurrent ongoing rooms**. (Soft warning at 10).
*   **Participant Limit**: Global hard cap of **12 participants per room**.
*   **Telemetry**: Diagnostic logs are automatically synced to `/api/meetings/:id/logs` upon connectivity drops or quality changes.

---

## 🛠️ Usage & Setup

### Prerequisites
1.  **LiveKit CLI**: `brew install livekit-cli` (on Mac)
2.  **ifstat**: `brew install ifstat` (for network telemetry)
3.  **bc**: `brew install bc` (for mathematical conversions in scripts)

### Installation
```bash
cd load-tests
pnpm install
```

### Running a Webinar Stress Test
1.  Run the webinar-specific orchestration script:
    ```bash
    chmod +x scripts/webinar-incremental-test.sh
    ./scripts/webinar-incremental-test.sh
    ```
2.  This script will add 100 subscribers every 2 minutes until the server threshold is hit.
3.  Analyze results in `logs/webinar_telemetry.csv`.

---

## 📊 Performance Benchmarks & Limits
Based on Azure D4s v5 (4 vCPU, 16 GB RAM) hardware:

| Scenario | Max Concurrency | Limiting Factor | Status |
| :--- | :--- | :--- | :--- |
| **Study Rooms** (20 users/room) | **30 Rooms** (~600 users) | PPS (~40k) | Stable |
| **Webinars** (100 users/room) | **3 Rooms** (~300 users) | PPS (~40k) | Hard Limit |
| **Global Load** | ~600 Concurrent Users | PPS (Packets/Sec) | Throttled |

### Metrics Target Thresholds
| Metric | Healthy | Critical |
| :--- | :--- | :--- |
| **CPU Usage** | < 40% | > 80% |
| **Outbound Mbps** | < 500Mbps | > 2Gbps |
| **WebRTC RTT** | < 150ms | > 500ms |
| **Packet Loss** | < 1% | > 5% |

## Support
For issues or questions regarding load testing results, analyze the JSON logs generated in the `logs/` directory.
the main project documentation
