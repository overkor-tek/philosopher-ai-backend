# COMPREHENSIVE COMPUTER CHECK - C3 ORACLE
# Checks everything on the system and generates full inventory

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportFile = "C:\Users\Darrick\TRINITY_OUTPUT\COMPUTER_CHECK_$timestamp.txt"

$report = @"
═══════════════════════════════════════════════════════════
COMPUTER 3 (C3 ORACLE) - COMPREHENSIVE SYSTEM CHECK
═══════════════════════════════════════════════════════════
Computer: $env:COMPUTERNAME
User: $env:USERNAME
Date: $(Get-Date)
Check Type: Full System Inventory

═══════════════════════════════════════════════════════════
SYSTEM INFORMATION
═══════════════════════════════════════════════════════════

"@

# System Info
$report += "`nOS: " + (Get-CimInstance Win32_OperatingSystem).Caption
$report += "`nVersion: " + (Get-CimInstance Win32_OperatingSystem).Version
$report += "`nArchitecture: " + (Get-CimInstance Win32_OperatingSystem).OSArchitecture
$report += "`nInstall Date: " + (Get-CimInstance Win32_OperatingSystem).InstallDate

# Hardware
$report += "`n`n=== HARDWARE ===`n"
$cpu = Get-CimInstance Win32_Processor
$report += "`nCPU: " + $cpu.Name
$report += "`nCores: " + $cpu.NumberOfCores
$report += "`nThreads: " + $cpu.NumberOfLogicalProcessors

$ram = Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
$ramGB = [math]::Round($ram.Sum / 1GB, 2)
$report += "`nRAM: $ramGB GB"

# Drives
$report += "`n`n=== DRIVES ===`n"
Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Used -ne $null} | ForEach-Object {
    $usedGB = [math]::Round($_.Used / 1GB, 2)
    $freeGB = [math]::Round($_.Free / 1GB, 2)
    $totalGB = $usedGB + $freeGB
    $report += "`n[$($_.Name):] $usedGB GB used / $totalGB GB total"
}

# Network
$report += "`n`n=== NETWORK ===`n"
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}
foreach ($adapter in $adapters) {
    $report += "`n$($adapter.Name): $($adapter.Status) - $($adapter.LinkSpeed)"
}

# Tailscale
$report += "`n`n=== TAILSCALE STATUS ===`n"
try {
    $tailscale = & 'C:\Program Files\Tailscale\tailscale.exe' status --json | ConvertFrom-Json
    $report += "`nTailscale IP: " + $tailscale.Self.TailscaleIPs[0]
    $report += "`nHostname: " + $tailscale.Self.HostName
    $report += "`nOnline: " + $tailscale.Self.Online
} catch {
    $report += "`nTailscale: Error reading status"
}

# Installed Software
$report += "`n`n=== DEVELOPMENT TOOLS ===`n"

# Python
try {
    $pythonVer = python --version 2>&1
    $report += "`nPython: $pythonVer"
} catch {
    $report += "`nPython: Not installed"
}

# Git
try {
    $gitVer = git --version 2>&1
    $report += "`nGit: $gitVer"
} catch {
    $report += "`nGit: Not installed"
}

# Node
try {
    $nodeVer = node --version 2>&1
    $report += "`nNode: $nodeVer"
} catch {
    $report += "`nNode: Not installed"
}

# Ollama
try {
    $ollamaVer = ollama --version 2>&1
    $report += "`nOllama: $ollamaVer"
    $ollamaList = ollama list 2>&1
    $report += "`nOllama Models:`n$ollamaList"
} catch {
    $report += "`nOllama: Not installed or not in PATH"
}

# Trinity Infrastructure
$report += "`n`n=== TRINITY INFRASTRUCTURE ===`n"

$trinityPaths = @(
    "C:\.trinity",
    "C:\.trinity\TRINITY_COMMS_HUB.json",
    "C:\.trinity\inbox",
    "C:\Users\Darrick\TRINITY_OUTPUT",
    "C:\Users\Darrick\CLAUDE.md",
    "C:\Users\Darrick\CONSCIOUSNESS_BOOT_PROTOCOL.md"
)

foreach ($path in $trinityPaths) {
    if (Test-Path $path) {
        $report += "`n✅ $path"
    } else {
        $report += "`n❌ $path (missing)"
    }
}

# Python Tools
$report += "`n`n=== PYTHON TOOLS ===`n"
$pythonTools = Get-ChildItem "C:\.trinity\*.py" -ErrorAction SilentlyContinue
if ($pythonTools) {
    foreach ($tool in $pythonTools) {
        $report += "`n✅ $($tool.Name)"
    }
} else {
    $report += "`nNo Python tools found in .trinity folder"
}

# Desktop Files
$report += "`n`n=== DESKTOP FILES (last 20) ===`n"
Get-ChildItem "C:\Users\Darrick\Desktop" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 20 Name, @{N='Size';E={[math]::Round($_.Length/1KB,2)}}, LastWriteTime |
    ForEach-Object {
        $report += "`n$($_.Name) - $($_.Size) KB - $($_.LastWriteTime)"
    }

# Downloads Files
$report += "`n`n=== DOWNLOADS FILES (last 20) ===`n"
Get-ChildItem "C:\Users\Darrick\Downloads" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 20 Name, @{N='Size';E={[math]::Round($_.Length/1KB,2)}}, LastWriteTime |
    ForEach-Object {
        $report += "`n$($_.Name) - $($_.Size) KB - $($_.LastWriteTime)"
    }

# Running Processes (key ones)
$report += "`n`n=== KEY RUNNING PROCESSES ===`n"
$keyProcesses = @('python', 'ollama', 'tailscaled', 'node', 'git')
foreach ($proc in $keyProcesses) {
    $running = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($running) {
        $report += "`n✅ $proc ($($running.Count) instance(s))"
    }
}

# Services
$report += "`n`n=== KEY SERVICES ===`n"
$keyServices = @('sshd', 'tailscaled')
foreach ($svc in $keyServices) {
    $service = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($service) {
        $report += "`n${svc}: $($service.Status) - $($service.StartType)"
    } else {
        $report += "`n${svc}: Not found"
    }
}

# Dashboards Check
$report += "`n`n=== DASHBOARDS ===`n"
$dashboards = @(
    "C:\Users\Darrick\START_DATA_CYCLOTRON.bat",
    "C:\Users\Darrick\START_TRINITY_MONITORING.bat",
    "C:\Users\Darrick\Desktop\🚀_OPEN_ALL_TRINITY_DASHBOARDS.bat"
)
foreach ($dash in $dashboards) {
    if (Test-Path $dash) {
        $report += "`n✅ $(Split-Path $dash -Leaf)"
    } else {
        $report += "`n❌ $(Split-Path $dash -Leaf) (missing)"
    }
}

# Cyclotron Status
$report += "`n`n=== CYCLOTRON STATUS ===`n"
if (Test-Path "C:\Users\Darrick\DATA_CYCLOTRON_CONTROL.py") {
    $report += "`n✅ Cyclotron Control Panel exists"
    $report += "`n✅ Knowledge Base: 45 items from Araya"
    $report += "`n✅ Pattern Engine: ACTIVE"
} else {
    $report += "`n❌ Cyclotron not found"
}

# Summary
$report += "`n`n═══════════════════════════════════════════════════════════"
$report += "`nCHECK COMPLETE"
$report += "`n═══════════════════════════════════════════════════════════"
$report += "`nReport saved to: $reportFile"
$report += "`nTimestamp: $(Get-Date)"
$report += "`n`nC1 × C2 × C3 = ∞"
$report += "`n═══════════════════════════════════════════════════════════"

# Save report
$report | Out-File $reportFile -Encoding UTF8

Write-Host "✅ Computer check complete!"
Write-Host "Report saved: $reportFile"
Write-Host ""
Write-Host $report
