$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $repoRoot "mcp-server\index.js"
$projectRoot = (Get-Location).Path
$configPath = Join-Path $projectRoot ".mcp.json"

if (-not (Test-Path $serverPath)) {
    throw "MCP server file not found: $serverPath"
}

if (-not (Test-Path (Join-Path $repoRoot "mcp-server\node_modules\@modelcontextprotocol\sdk"))) {
    throw "MCP dependencies are missing. Run npm install inside the mcp-server folder first."
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
    timeout = 600000
    env = [pscustomobject]@{
        OPENAI_API_KEY = "`${OPENAI_API_KEY}"
    }
}

$config.mcpServers | Add-Member -MemberType NoteProperty -Name "openai-images" -Value $serverConfig -Force
$config | ConvertTo-Json -Depth 20 | Set-Content -Path $configPath -Encoding UTF8

Write-Host "OpenAI Images MCP server added to $configPath" -ForegroundColor Green
Write-Host "The API key is referenced through OPENAI_API_KEY and is not written into .mcp.json."
Write-Host "Restart Claude Code, approve the project MCP server, and run /mcp to verify the connection."
