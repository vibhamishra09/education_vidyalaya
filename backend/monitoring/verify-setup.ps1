# Monitoring Setup Verification Script
# Run this after starting your backend to verify everything is working

Write-Host "`n🔍 Webyalaya Monitoring - Setup Verification`n" -ForegroundColor Cyan

# Check if backend is running
Write-Host "1️⃣ Checking Backend..." -ForegroundColor Yellow
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Backend is running on port 3001" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend is NOT running on port 3001" -ForegroundColor Red
    Write-Host "   💡 Start it with: pnpm start:dev" -ForegroundColor Yellow
}

# Check metrics endpoint
Write-Host "`n2️⃣ Checking Metrics Endpoint..." -ForegroundColor Yellow
try {
    $metrics = Invoke-WebRequest -Uri "http://localhost:3001/metrics" -UseBasicParsing -TimeoutSec 5
    if ($metrics.Content -match "http_request_duration_seconds") {
        Write-Host "   ✅ Metrics endpoint working with histogram" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Metrics endpoint exists but histogram not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Metrics endpoint not accessible" -ForegroundColor Red
}

# Check Prometheus
Write-Host "`n3️⃣ Checking Prometheus..." -ForegroundColor Yellow
try {
    $prom = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Prometheus is running on port 9090" -ForegroundColor Green
    Write-Host "   🔗 Access at: http://localhost:9090" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Prometheus is NOT running" -ForegroundColor Red
    Write-Host "   💡 Start it with: docker-compose -f docker-compose.monitoring.yml up -d" -ForegroundColor Yellow
}

# Check Grafana
Write-Host "`n4️⃣ Checking Grafana..." -ForegroundColor Yellow
try {
    $grafana = Invoke-WebRequest -Uri "http://localhost:3002/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Grafana is running on port 3002" -ForegroundColor Green
    Write-Host "   🔗 Access at: http://localhost:3002 (admin/admin)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Grafana is NOT running" -ForegroundColor Red
    Write-Host "   💡 Start it with: docker-compose -f docker-compose.monitoring.yml up -d" -ForegroundColor Yellow
}

# Check Prometheus targets
Write-Host "`n5️⃣ Checking Prometheus Targets..." -ForegroundColor Yellow
try {
    $targets = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/targets" -UseBasicParsing -TimeoutSec 5
    $nestjsTarget = $targets.data.activeTargets | Where-Object { $_.job -eq "nestjs-backend" }
    
    if ($nestjsTarget -and $nestjsTarget.health -eq "up") {
        Write-Host "   ✅ Prometheus is successfully scraping NestJS backend" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Prometheus target is DOWN or not configured" -ForegroundColor Yellow
        Write-Host "   💡 Check prometheus.yml configuration" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check Prometheus targets" -ForegroundColor Yellow
}

# Check if metrics are being collected
Write-Host "`n6️⃣ Checking Metric Collection..." -ForegroundColor Yellow
try {
    $query = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/query?query=http_request_duration_seconds_count" -UseBasicParsing -TimeoutSec 5
    
    if ($query.data.result.Count -gt 0) {
        Write-Host "   ✅ Metrics are being collected ($($query.data.result.Count) endpoints tracked)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No metrics collected yet - make some API requests" -ForegroundColor Yellow
        Write-Host "   💡 Try: curl http://localhost:3000/" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not query metrics" -ForegroundColor Yellow
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Write-Host "`n✅ Next Steps:" -ForegroundColor Green
Write-Host "   1. Open Grafana: http://localhost:3002 (admin/admin)" -ForegroundColor White
Write-Host "   2. Import dashboard: monitoring/grafana/dashboards/api-health-dashboard.json" -ForegroundColor White
Write-Host "   3. Setup email contact point (see QUICKSTART.md)" -ForegroundColor White
Write-Host "   4. Create alert rule (see GRAFANA_SETUP_GUIDE.md)" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "   • monitoring/README.md - Overview" -ForegroundColor White
Write-Host "   • monitoring/QUICKSTART.md - 5-minute setup" -ForegroundColor White
Write-Host "   • monitoring/GRAFANA_SETUP_GUIDE.md - Detailed guide" -ForegroundColor White

Write-Host "`n🎯 Generate Traffic (to see metrics):" -ForegroundColor Yellow
Write-Host "   curl http://localhost:3001/" -ForegroundColor White
Write-Host "   curl http://localhost:3001/health" -ForegroundColor White
Write-Host "   curl http://localhost:3001/api/users" -ForegroundColor White

Write-Host ""
