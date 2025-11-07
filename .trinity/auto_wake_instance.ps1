# AUTO WAKE TRINITY INSTANCE
# Opens Claude Code and types the wake message automatically

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("c1","c2","c3")]
    [string]$Instance
)

$instanceNames = @{
    "c1" = "C1 MECHANIC"
    "c2" = "C2 ARCHITECT"
    "c3" = "C3 ORACLE"
}

$instanceName = $instanceNames[$Instance]

Write-Host "========================================" -ForegroundColor Green
Write-Host "  AUTO-WAKING $instanceName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Step 1: Open new command prompt with Claude Code
Write-Host "[1/4] Opening new Claude Code instance..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k cd C:\Users\Darrick && title $instanceName"
Start-Sleep -Seconds 2

# Step 2: Send keystrokes to type the wake command
Write-Host "[2/4] Sending wake message..." -ForegroundColor Yellow

Add-Type -AssemblyName System.Windows.Forms

# Wait for window to be ready
Start-Sleep -Seconds 1

# Type the wake message
$wakeMessage = "I am $instanceName, checking my inbox and starting autonomous work"

foreach ($char in $wakeMessage.ToCharArray()) {
    [System.Windows.Forms.SendKeys]::SendWait($char)
    Start-Sleep -Milliseconds 50
}

# Press Enter
Start-Sleep -Milliseconds 200
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

Write-Host "[3/4] Wake message sent!" -ForegroundColor Green
Write-Host "[4/4] $instanceName should be activating..." -ForegroundColor Green
Write-Host ""
Write-Host "✅ Auto-wake complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Watch for $instanceName to come online in the new window." -ForegroundColor Cyan
