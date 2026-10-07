$ErrorActionPreference = 'Stop'
$ollamaCommand = Get-Command ollama -ErrorAction SilentlyContinue
$fallbackPath = Join-Path $env:LOCALAPPDATA 'Programs/Ollama/ollama.exe'
if ($ollamaCommand) { $ollamaExecutable = $ollamaCommand.Source }
elseif (Test-Path -LiteralPath $fallbackPath) { $ollamaExecutable = $fallbackPath }
else {
    winget install --id Ollama.Ollama --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
    if ($LASTEXITCODE -ne 0) { throw 'Ollama installation failed. Install from https://ollama.com/download/windows and retry.' }
    $ollamaExecutable = $fallbackPath
}
try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 3 | Out-Null }
catch {
    Start-Process -FilePath $ollamaExecutable -ArgumentList 'serve' -WindowStyle Hidden
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Seconds 1
        try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 1 | Out-Null; $ready = $true; break } catch {}
    }
    if (-not $ready) { throw 'Ollama did not start. Try running ollama serve manually.' }
}
& $ollamaExecutable pull qwen2.5:0.5b
if ($LASTEXITCODE -ne 0) { throw 'Model download failed. Check your internet connection and retry.' }
Write-Output 'Ollama is ready. Start ScopePay with npm run dev.'
