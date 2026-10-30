# Connect OpenAI image generation to Claude Code

This integration adds two MCP tools to Claude Code using OpenAI GPT Image 2.5:
- `generate_image` — create new images.
- `edit_image` — edit a local image using a prompt and optional visual references.

It calls the OpenAI Images API. It does **not** send requests to an existing ChatGPT conversation or use the built-in image tool in this chat.

## Requirements

- Claude Code.
- Node.js 20 or newer.
- An OpenAI API key with API billing enabled.

Create an API key at https://platform.openai.com/api-keys. Keep it private. ChatGPT subscriptions and API billing are separate.

## Windows setup (PowerShell)

Run these commands from the root of the project where you use Claude Code.

### 1. Clone this repository inside the project

```powershell
git clone https://github.com/ijs69/ai-visual-production.git .ai-visual-production
```

If the folder already exists, update it instead:

```powershell
git -C .ai-visual-production pull
```

### 2. Install the MCP server dependencies

```powershell
cd .ai-visual-production\mcp-server
npm install
cd ..\..
```

### 3. Add your API key to Windows

Run this once, replacing the example with your own key:

```powershell
setx OPENAI_API_KEY "YOUR_OPENAI_API_KEY"
```

Close the terminal and open a new one so Windows exposes the new environment variable to Claude Code. Never paste the key into GitHub, source files, `.mcp.json`, or this chat.

### 4. Register the MCP server

From the project root, run:

```powershell
.\.ai-visual-production\setup-mcp.ps1
```

The script adds the `openai-images` server to the project's `.mcp.json`. It preserves other MCP server entries if the file already exists.

### 5. Restart Claude Code and approve the server

Start Claude Code from the project root. Approve the project MCP server when Claude Code asks, then run:

```text
/mcp
```

Check that `openai-images` is connected and exposes `generate_image` and `edit_image`.

## Use it

Ask Claude Code naturally:
- "Generate a studio product photo of this sofa, vertical 4:5."
- "Edit this image: replace the background with a clean blue studio backdrop and preserve the sofa exactly."
- "Create a close-up image of the upholstery texture from this reference."

Claude should analyze the image and prepare the production prompt using the AI Visual Production skill, then call the appropriate MCP tool. Generated files are saved to the project's `generated-images/` folder and returned to Claude as image previews.

## Default model and parameters

- Default model: `gpt-image-2.5-sunburst` (recommended for fidelity and detailed edits).
- Default quality: `high`.
- Default format: PNG.
- Supported models: `gpt-image-2.5-sunburst` and `gpt-image-2.5-flare`.
- The API controls accepted sizes, output quality and cost. See https://developers.openai.com/api/docs/guides/image-generation.

## Troubleshooting

- Missing key: confirm `OPENAI_API_KEY` is set, open a new terminal, and restart Claude Code.
- Server not connected: run `npm install` again in `.ai-visual-production\mcp-server`, check Node.js with `node --version`, and inspect `/mcp`.
- Billing or access error: check the API organization, available credits, and model access in the OpenAI platform.
