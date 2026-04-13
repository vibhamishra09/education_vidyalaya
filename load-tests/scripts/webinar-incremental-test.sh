#!/bin/bash

# Configuration
LIVEKIT_URL="wss://livekit.webyalaya.com"
LIVEKIT_API_KEY="APICbNVRampiaJd"
LIVEKIT_API_SECRET="sarHMlUiLbBjfwbesFnRGAZeuqsDv3dcfQeaIr9EDwhH"
LK_PATH="/opt/homebrew/bin/lk"
IFSTAT_PATH="/opt/homebrew/bin/ifstat"

# Thresholds
CRITICAL_CPU=90.0
CRITICAL_BW_OUT=1000.0 # Mbps (Azure D4s v5 limit is around 1250 Mbps)
CRITICAL_PPS_OUT=45000 # Observed bottleneck from study room tests was ~40k
RAMP_INTERVAL=120      # 2 minutes between adding new webinar rooms

TELEMETRY_LOG="logs/webinar_telemetry.csv"

echo "🧹 Cleaning up previous load tests..."
pkill -9 -f "lk load-test" 2>/dev/null || true
sleep 2

echo "🎥 Starting Incremental Webinar Load Test"
echo "Scenario: 1 Host + 10 Panelists (Pub) + 89 Listeners (Sub) per room"
echo "Thresholds: CPU > $CRITICAL_CPU%, BW_Out > $CRITICAL_BW_OUT Mbps, PPS_Out > $CRITICAL_PPS_OUT"
mkdir -p logs

# Cleanup on exit
trap "echo '🛑 TEST STOPPED. Cleaning up...'; pkill -9 -f 'lk load-test'; exit 0" SIGINT SIGTERM EXIT

# Header
echo "Timestamp,CPU_Usage,Net_In_Mbps,Net_Out_Mbps,PPS_In,PPS_Out,Active_Webinars,Total_Participants,Total_Subscriptions,Status" > "$TELEMETRY_LOG"

export LIVEKIT_URL
export LIVEKIT_API_KEY
export LIVEKIT_API_SECRET

# 1. Telemetry & Watchdog Loop
(
    last_rooms=0
    while true; do
        TIMESTAMP=$(date +"%H:%M:%S")
        
        # Capture CPU (macOS top)
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
        PPS_OUT=$(echo $PPS_STATS | awk '{awk_val=$4; print awk_val}' | tr -d '[:space:]' | sed 's/^$/0/')
        
        # Active Load
        ACTIVE_WEBINARS=$(ps aux | grep "lk load-test" | grep -v grep | grep -c "webinar" | tr -d '[:space:]' | sed 's/^$/0/')
        TOTAL_PARTS=$((ACTIVE_WEBINARS * 100))
        # Subscription math: (89 subs * 11 pub) + (11 pub * 10 other pub) = 979 + 110 = 1089 per room
        TOTAL_SUBS=$((ACTIVE_WEBINARS * 1089))
        
        # Check Quality Errors in logs
        ERROR_STR=$(grep -i "slow\|loss\|drop" logs/webinar-*.log | head -n 1)
        STATUS="STABLE"
        if [ -n "$ERROR_STR" ]; then
            STATUS="DEGRADED"
        fi

        # Write to Telemetry
        printf "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n" \
            "$TIMESTAMP" "$CPU" "$NET_IN_MBPS" "$NET_OUT_MBPS" \
            "$PPS_IN" "$PPS_OUT" "$ACTIVE_WEBINARS" "$TOTAL_PARTS" "$TOTAL_SUBS" "$STATUS" >> "$TELEMETRY_LOG"

        # Display progress
        if [ "$ACTIVE_WEBINARS" -ne "$last_rooms" ]; then
            echo "[$(date +%T)] 📈 Ramp Up: $ACTIVE_WEBINARS Webinars ($TOTAL_PARTS users) active. Outbound: $NET_OUT_MBPS Mbps, $PPS_OUT PPS."
            last_rooms=$ACTIVE_WEBINARS
        fi

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
        if [ "$PPS_OUT" -gt "$CRITICAL_PPS_OUT" ]; then
            echo "🚨 REASON: PPS BOTTLE NECK ($PPS_OUT). Aborting."
            kill -INT $$
            exit 0
        fi
        
        sleep 10
    done
) &
WATCHDOG_PID=$!

# 2. Sequential Webinar Ramp-Up
# We test up to 10 webinars (1000 users) if possible
for i in $(seq 1 10); do
    WEBINAR_ID="webinar-$i-$(date +%s)"
    echo "🚀 Launching Webinar Room $i..."
    
    # Each Room: 11 Publishers (Host+Panelists), 89 Subscribers
    # We add 1 for "screen share" simulation -> 12 video publishers
    $LK_PATH load-test \
        --room "$WEBINAR_ID" \
        --video-publishers 12 \
        --audio-publishers 11 \
        --subscribers 88 \
        --video-resolution medium \
        --video-codec h264 \
        --duration "60m" \
        --num-per-second 2 \
        --yes > "logs/$WEBINAR_ID.log" 2>&1 &
    
    # Wait for the room to fully populate and stabilize
    sleep "$RAMP_INTERVAL"
done

echo "🏁 Max Webinar Target Reached or Watchdog Triggered."
wait
