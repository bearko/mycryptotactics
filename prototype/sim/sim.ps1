# Wrapper for running the simulator in environments where Node.js v22 crashes
# on Japanese-character paths (Windows). Copies sim/ to %TEMP%\mct_sim_*\
# and forwards args. Same workaround as tools/sync.ps1.

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)
$ErrorActionPreference = 'Stop'

$SimDir   = $PSScriptRoot
$DataDir  = Join-Path $SimDir "..\data"
$tmpRoot  = Join-Path $env:TEMP ("mct_sim_" + [System.IO.Path]::GetRandomFileName())
$tmpSim   = Join-Path $tmpRoot "sim"
$tmpData  = Join-Path $tmpRoot "data"
New-Item -ItemType Directory -Path $tmpSim -Force | Out-Null
New-Item -ItemType Directory -Path $tmpData -Force | Out-Null

# Copy sim and data to ASCII path
Copy-Item -Path (Join-Path $SimDir "*") -Destination $tmpSim -Recurse -Force
Copy-Item -Path (Join-Path $DataDir "*.json") -Destination $tmpData -Force

# Translate --report=<relpath> args so the original-cwd-relative path is honored.
# We pass an absolute path through to Node so it doesn't get resolved against the temp cwd.
$origCwd = (Get-Location).Path
$translatedArgs = @()
$reportTargets = @()
foreach ($a in $Args) {
    if ($a -match '^--report=(.+)$') {
        $orig = $matches[1]
        $tmpPath = Join-Path $tmpRoot ("report_" + [System.IO.Path]::GetRandomFileName() + ".json")
        $absOrig = [System.IO.Path]::GetFullPath((Join-Path $origCwd $orig))
        $reportTargets += [pscustomobject]@{ Tmp = $tmpPath; Final = $absOrig }
        $translatedArgs += "--report=$tmpPath"
    } else {
        $translatedArgs += $a
    }
}

try {
    Push-Location $tmpRoot
    & node "sim/simulate.js" @translatedArgs
    $exitCode = $LASTEXITCODE
    Pop-Location

    foreach ($t in $reportTargets) {
        if (Test-Path $t.Tmp) {
            $finalDir = Split-Path -Parent $t.Final
            if (-not (Test-Path $finalDir)) { New-Item -ItemType Directory -Path $finalDir -Force | Out-Null }
            Copy-Item -Path $t.Tmp -Destination $t.Final -Force
            Write-Host "  -> report copied to $($t.Final)"
        }
    }
} finally {
    Remove-Item -Path $tmpRoot -Recurse -Force -ErrorAction SilentlyContinue
}

exit $exitCode
