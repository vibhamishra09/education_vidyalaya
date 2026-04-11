#!/bin/bash

# Configuration
LIVEKIT_URL="wss://livekit.webyalaya.com"
LIVEKIT_API_KEY="APICbNVRampiaJd"
LIVEKIT_API_SECRET="sarHMlUiLbBjfwbesFnRGAZeuqsDv3dcfQeaIr9EDwhH"
LK_PATH="/opt/homebrew/bin/lk"
IFSTAT_PATH="/opt/homebrew/bin/ifstat"

# Thresholds
CRITICAL_CPU=85.0
CRITICAL_BW_OUT=850.0 # Mbps
RAMP_INTERVAL=60 # Seconds between adding rooms

TELEMETRY_LOG="logs/ramp_telemetry.csv"

echo "🧹 Baseline Cleanup..."
pkill -9 -f "lk load-test" 2>/dev/null || true
pkill -9 -f ramp-stress-test.sh 2>/dev/null || true
sleep 2

echo "📈 Starting Progressive Ramp Test - Capacity Discovery"
echo "Thresholds: CPU>$CRITICAL_CPU%, BW_Out>$CRITICAL_BW_OUT Mbps"
mkdir -p logs

# Cleanup on exit
# Note: kill 0 will kill the whole process group including the telemetry loop
trap "echo '🛑 STOP CONDITION HIT. Terminating all bots and saving final state...'; pkill -9 -f 'lk load-test'; exit 0" SIGINT SIGTERM EXIT

# Header
echo "Timestamp,CPU_Usage,Net_In_Mbps,Net_Out_Mbps,PPS_In,PPS_Out,Active_Rooms,Total_Participants,Total_Tracks,Status" > "$TELEMETRY_LOG"

export LIVEKIT_URL
export LIVEKIT_API_KEY
export LIVEKIT_API_SECRET

# 1. Start Telemetry & Watchdog Loop
(
    last_rooms=0
    while true; do
        TIMESTAMP=$(date +"%H:%M:%S")
        
        # Capture CPU
        CPU=$(top -l 1 | grep "CPU usage" | head -n 1 | awk '{print $3}' | tr -d '%' | tr -d '[:space:]' | sed 's/^$/0/')
        
        # Mbps capture
        NET_STATS=$($IFSTAT_PATH -i en0 1 1 | tail -n 1)
        NET_IN=$(echo $NET_STATS | awk '{print $1}')
        NET_OUT=$(echo $NET_STATS | awk '{print $2}')
        NET_IN_MBPS=$(echo "scale=2; $NET_IN * 8 / 1024" | bc | tr -d '[:space:]' | sed 's/^$/0/')
        NET_OUT_MBPS=$(echo "scale=2; $NET_OUT * 8 / 1024" | bc | tr -d '[:space:]' | sed 's/^$/0/')

        # PPS capture
        PPS_STATS=$(netstat -I en0 -w 1 | head -n 3 | tail -n 1)
        PPS_IN=$(echo $PPS_STATS | awk '{print $1}' | tr -d '[:space:]' | sed 's/^$/0/')
        PPS_OUT=$(echo $PPS_STATS | awk '{print $4}' | tr -d '[:space:]' | sed 's/^$/0/')
        
        # Active Load
        ACTIVE_ROOMS=$(ps aux | grep "lk load-test" | grep -v grep | grep -c "room" | tr -d '[:space:]' | sed 's/^$/0/')
        TOTAL_PARTS=$((ACTIVE_ROOMS * 20)) # 10 Pub + 10 Sub
        TOTAL_TRACKS=$((ACTIVE_ROOMS * 20)) # (Estimate)
        
        # Check Quality Errors
        ERROR_STR=$(grep -i "slow\|loss\|drop" logs/ramp-*.log | head -n 1)
        STATUS="STABLE"
        if [ -n "$ERROR_STR" ]; then
            STATUS="DEGRADED_QUALITY"
        fi

        # Write to Telemetry
        printf "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n" \
            "$TIMESTAMP" "$CPU" "$NET_IN_MBPS" "$NET_OUT_MBPS" \
            "$PPS_IN" "$PPS_OUT" "$ACTIVE_ROOMS" "$TOTAL_PARTS" "$TOTAL_TRACKS" "$STATUS" >> "$TELEMETRY_LOG"

        # WATCHDOG: Stop if thresholds hit
        if (( $(echo "$CPU > $CRITICAL_CPU" | bc -l) )); then
            echo "🚨 REASON: CPU EXCEEDED ($CPU%). Aborting."
            kill -INT $$
            exit 0
        fi
        if (( $(echo "$NET_OUT_MBPS > $CRITICAL_BW_OUT" | bc -l) )); then
            echo "🚨 REASON: BANDWIDTH EXCEEDED ($NET_OUT_MBPS Mbps). Aborting."
            kill -INT $$
            exit 0
        fi
        if [ "$STATUS" = "DEGRADED_QUALITY" ]; then
            echo "🚨 REASON: QUALITY DEGRADATION DETECTED. Aborting."
            kill -INT $$
            exit 0
        fi
        
        if [ "$ACTIVE_ROOMS" -ne "$last_rooms" ]; then
            echo "[$(date +%T)] 📈 Ramp Up: $ACTIVE_ROOMS Rooms active. Current Outbound: $NET_OUT_MBPS Mbps, $PPS_OUT PPS."
            last_rooms=$ACTIVE_ROOMS
        fi

        sleep 5
    done
) &
WATCHDOG_PID=$!

# 2. Sequential Ramp-Up
for i in $(seq 1 30); do
    ROOM_NAME="ramp-$i-$(date +%s)"
    
    # Each Room = 10 Publishers + 10 Subscribers (forced high bitrate)
    $LK_PATH load-test \
        --room "$ROOM_NAME" \
        --video-publishers 10 \
        --audio-publishers 10 \
        --subscribers 10 \
        --video-resolution high \
        --video-codec h264 \
        --duration "30m" \
        --num-per-second 1 \
        --yes > "logs/$ROOM_NAME.log" 2>&1 &
    
    # Wait for interval while watchdog monitors
    # (Sleep in increments to allow faster stop if threshold hit)
    for s in $(seq 1 $RAMP_INTERVAL); do
        sleep 1
    done
done

echo "🏁 Max Ramp Target Completed."
wait
