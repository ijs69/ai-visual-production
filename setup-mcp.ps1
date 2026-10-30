$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $repoRoot "mcp-server\index.js"
$projectRoot = (Get-Location).Path
$configPath = Join-Path $projectRoot ".mcp.json"

if (-not (Test-Path $serverPath)) {
    throw "MCP server file not found: $serverPath"
}

if (Test-Path $configPath) {
    $config = Get-Content -Raw -Path $configPath | ConvertFrom-Json
} else {
    $config = [pscustomobject]@{}
}

if (-not $config.PSObject.Properties["mcpServers"]) {
    $config | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value ([pscustomobject]@{})
}

$serverConfig = [pscustomobject]@{
    command = "node"
    args = @($serverPath)
    env = [pscustomobject]@{
        OPENAI_API_KEY = "${OPENAI_API_KEY}"
    }
}

$config.mcpServers | Add-Member -MemberType NoteProperty -Name "openai-images" -Value $serverConfig -Force
$config | ConvertTo-Json -Depth 20 | Set-Content -Path $configPath -Encoding UTF8

Write-Host "OpenAI Images MCP server added to $configPath" -ForegroundColor Green
Write-Host "Make sure OPENAI_API_KEY is set in your Windows user environment, then restart Claude Code."
