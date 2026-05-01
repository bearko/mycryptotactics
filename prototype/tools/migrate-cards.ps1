# migrate-cards.ps1 — wrapper for migrate-cards-to-spec006.js (handles Japanese paths)
# Usage:
#   powershell -ExecutionPolicy Bypass -File migrate-cards.ps1            # dry-run
#   powershell -ExecutionPolicy Bypass -File migrate-cards.ps1 -Apply     # in-place
param(
    [switch]$Apply
)

$protoRoot = Split-Path -Parent (Split-Path -Parent (Resolve-Path $MyInvocation.MyCommand.Path))
$scriptSrc = Join-Path $protoRoot "tools\migrate-cards-to-spec006.js"

# Copy script to ASCII tmp path then run with --root pointing back to original tree
$tmpDir = Join-Path $env:TEMP ("mct_mig_" + [System.IO.Path]::GetRandomFileName().Replace('.',''))
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

try {
    $tmpScript = Join-Path $tmpDir "migrate.js"
    Copy-Item $scriptSrc $tmpScript

    $applyArg = if ($Apply) { '--apply' } else { '' }
    Write-Host ">> node migrate.js --root '$protoRoot' $applyArg ..."
    & node $tmpScript --root $protoRoot $applyArg
    if ($LASTEXITCODE -ne 0) { Write-Error "Migration failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE }
} finally {
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
}
