# sync.ps1  —  CSV/JSON 同期ツール ラッパー（日本語パス対応）
# 使用方法（このファイルがある tools/ ディレクトリで実行）:
#   powershell -ExecutionPolicy Bypass -File sync.ps1 json-to-csv
#   powershell -ExecutionPolicy Bypass -File sync.ps1 csv-to-json

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('json-to-csv','csv-to-json')]
    [string]$Command
)

# prototype/ のルートパス（このスクリプトの 1 つ上）
$protoRoot = Split-Path -Parent (Split-Path -Parent (Resolve-Path $MyInvocation.MyCommand.Path))
$scriptSrc = Join-Path $protoRoot "tools\sync_csv_json.js"

# 一時ディレクトリ（ASCII パス）にスクリプトをコピーして実行
$tmpDir = Join-Path $env:TEMP ("mct_sync_" + [System.IO.Path]::GetRandomFileName().Replace('.',''))
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

try {
    $tmpScript = Join-Path $tmpDir "sync.js"
    Copy-Item $scriptSrc $tmpScript

    Write-Host ">> node sync.js $Command ..."
    $result = & node $tmpScript $Command $protoRoot 2>&1
    Write-Host $result

    if ($LASTEXITCODE -ne 0) {
        Write-Error "同期に失敗しました（exit code: $LASTEXITCODE）"
        exit $LASTEXITCODE
    }
} finally {
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
}
