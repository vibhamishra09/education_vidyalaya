#!/bin/bash

# Configuration
LIVEKIT_URL="wss://livekit.webyalaya.com"
LIVEKIT_API_KEY="APICbNVRampiaJd"
LIVEKIT_API_SECRET="sarHMlUiLbBjfwbesFnRGAZeuqsDv3dcfQeaIr9EDwhH"
NUM_ROOMS=8
PARTICIPANTS_PER_ROOM=11
DURATION="15m"
TELEMETRY_LOG="logs/performance_telemetry.csv"

# Verify tools
LK_PATH="/opt/homebrew/bin/lk"
IFSTAT_PATH="/opt/homebrew/bin/ifstat"

echo "🧹 FINAL Emergency Cleanup..."
pkill -f livekit-stress-test.sh 2>/dev/null || true
pkill -f "lk load-test" 2>/dev/null || true
sleep 2

echo "🚀 Starting High-Fidelity Endurance Test (15 Minutes) - TRACED"
mkdir -p logs

# Cleanup on exit
trap "echo '🛑 Terminating all bots...'; pkill -f 'lk load-test'; kill 0" EXIT SIGINT SIGTERM

# Fresh Header
echo "Timestamp,CPU_Usage,Net_In_Mbps,Net_Out_Mbps,PPS_In,PPS_Out,Active_Rooms,Total_Participants,Total_Tracks" > "$TELEMETRY_LOG"

export LIVEKIT_URL
export LIVEKIT_API_KEY
export LIVEKIT_API_SECRET

# 1. Start Telemetry Loop
(
    while true; do
        TIMESTAMP=$(date +"%H:%M:%S")
        CPU=$(top -l 1 | grep "CPU usage" | head -n 1 | awk '{print $3}' | tr -d '%' | tr -d '[:space:]')
        
        # Mbps capture
        NET_STATS=$($IFSTAT_PATH -i en0 1 1 | tail -n 1)
        NET_IN=$(echo $NET_STATS | awk '{print $1}')
        NET_OUT=$(echo $NET_STATS | awk '{print $2}')
        NET_IN_MBPS=$(echo "scale=2; $NET_IN * 8 / 1024" | bc | tr -d '[:space:]')
        NET_OUT_MBPS=$(echo "scale=2; $NET_OUT * 8 / 1024" | bc | tr -d '[:space:]')

        # PPS capture
        PPS_STATS=$(netstat -I en0 -w 1 | head -n 3 | tail -n 1)
        PPS_IN=$(echo $PPS_STATS | awk '{print $1}' | tr -d '[:space:]' | sed 's/^$/0/')
        PPS_OUT=$(echo $PPS_STATS | awk '{print $4}' | tr -d '[:space:]' | sed 's/^$/0/')
        
        # Local Tracking
        ACTIVE_ROOMS=$(ps aux | grep "lk load-test" | grep -v grep | grep -c "room" | tr -d '[:space:]')
        TOTAL_PARTS=$((ACTIVE_ROOMS * 21))
        TOTAL_TRACKS=$((ACTIVE_ROOMS * PARTICIPANTS_PER_ROOM * 2))
        
        # Write to CSV - Using %s for all to avoid integer casting errors
        printf "%s,%s,%s,%s,%s,%s,%s,%s,%s\n" \
            "$TIMESTAMP" "$CPU" "$NET_IN_MBPS" "$NET_OUT_MBPS" \
            "$PPS_IN" "$PPS_OUT" "$ACTIVE_ROOMS" "$TOTAL_PARTS" "$TOTAL_TRACKS" >> "$TELEMETRY_LOG"
        
        sleep 10
    done
) &
MONITOR_PID=$!

# 2. Launch Rooms
for i in $(seq 1 $NUM_ROOMS); do
    ROOM_NAME="stress-$i-$(date +%s)"
    echo "🏃 Launching Room: $ROOM_NAME (21 participants total)"
    
    $LK_PATH load-test \
        --room "$ROOM_NAME" \
        --video-publishers "$PARTICIPANTS_PER_ROOM" \
        --audio-publishers "$PARTICIPANTS_PER_ROOM" \
        --subscribers 10 \
        --video-resolution high \
        --video-codec h264 \
        --duration "$DURATION" \
        --num-per-second 1 \
        --yes > "logs/$ROOM_NAME.log" 2>&1 &
    
    sleep 5
done

echo "⏳ Industrial simulation baseline established."
wait
