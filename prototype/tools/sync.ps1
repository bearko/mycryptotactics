# sync.ps1 -- CSV/JSON sync wrapper (handles Japanese paths)
# Usage:
#   powershell -ExecutionPolicy Bypass -File sync.ps1 json-to-csv
#   powershell -ExecutionPolicy Bypass -File sync.ps1 csv-to-json

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('json-to-csv','csv-to-json')]
    [string]$Command
)

# prototype/ root path (one level above tools/)
$protoRoot = Split-Path -Parent (Split-Path -Parent (Resolve-Path $MyInvocation.MyCommand.Path))
$scriptSrc = Join-Path $protoRoot "tools\sync_csv_json.js"

# Copy script to temp ASCII path then run (avoids Node.js Japanese-path crash)
$tmpDir = Join-Path $env:TEMP ("mct_sync_" + [System.IO.Path]::GetRandomFileName().Replace('.',''))
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

try {
    $tmpScript = Join-Path $tmpDir "sync.js"
    Copy-Item $scriptSrc $tmpScript

    Write-Host ">> node sync.js $Command ..."
    $result = & node $tmpScript $Command $protoRoot 2>&1
    Write-Host $result

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Sync failed (exit code: $LASTEXITCODE)"
        exit $LASTEXITCODE
    }
} finally {
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
}
