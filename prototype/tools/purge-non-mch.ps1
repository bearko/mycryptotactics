# purge-non-mch.ps1 — wrapper for purge-non-mch-cards.js (handles Japanese paths)
$protoRoot = Split-Path -Parent (Split-Path -Parent (Resolve-Path $MyInvocation.MyCommand.Path))
$scriptSrc = Join-Path $protoRoot "tools\purge-non-mch-cards.js"
$tmpDir = Join-Path $env:TEMP ("mct_purge_" + [System.IO.Path]::GetRandomFileName().Replace('.',''))
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
try {
    $tmpScript = Join-Path $tmpDir "purge.js"
    Copy-Item $scriptSrc $tmpScript
    & node $tmpScript --root $protoRoot
    if ($LASTEXITCODE -ne 0) { Write-Error "Purge failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE }
} finally {
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
}
