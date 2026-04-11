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

### Running an Endurance Run
1.  Ensure your backend is running (`pnpm start:dev`).
2.  Run the orchestration script:
    ```bash
    chmod +x scripts/livekit-stress-test.sh
    ./scripts/livekit-stress-test.sh
    ```
3.  Observe result in **stress-room-1** via your local frontend.
4.  Analyze results in `logs/performance_telemetry.csv`.

---

## 📊 Metrics Target Thresholds
| Metric | Healthy | Critical |
| :--- | :--- | :--- |
| **CPU Usage** | < 40% | > 80% |
| **Outbound Mbps** | < 500Mbps | > 2Gbps |
| **WebRTC RTT** | < 150ms | > 500ms |
| **Packet Loss** | < 1% | > 5% |

## Support
For issues or questions regarding load testing results, analyze the JSON logs generated in the `logs/` directory.
the main project documentation
