# AI Visual Production

A practical Skills library for Claude Code and other AI coding agents: image analysis, visual reference analysis, prompt engineering, product and furniture photography, lighting, camera composition, material rendering, image editing, product preservation, and quality control.

## Install all skills in Claude Code

Run this command from your project directory:

```bash
npx skills add ijs69/ai-visual-production --skill '*' -a claude-code -y
```

## Install only the main skill

```bash
npx skills add ijs69/ai-visual-production --skill ai-visual-production -a claude-code -y
```

## Skills

- `ai-visual-production` — main art-direction system, workflows, references, and routing.
- `image-analysis` — structured inspection of source images.
- `reference-analysis` — role-based analysis of multiple references.
- `prompt-engineering` — precise generation and editing prompts.
- `product-photography` — commercial product and furniture photography.
- `lighting-design` — coherent studio and product lighting.
- `camera-composition` — viewpoint, perspective, framing and crop.
- `material-rendering` — faithful textures and surface behavior.
- `image-editing` — controlled editing of existing images.
- `product-preservation` — protection of product identity and construction.
- `quality-control` — visual fidelity and artifact review.

The main skill includes a mandatory production workflow and links the specialist skills. Its `WORKFLOWS.md` and `REFERENCES.md` provide repeatable processes, prompt structure, and quality checklists.

## Core rule

When editing an existing product image, preserve the product's geometry, proportions, construction, materials, and recognizable details unless the user explicitly requests a change.

This repository contains instructions and workflows, not an image-generation engine. Actual generation or editing depends on the tools available to the agent.

## Generate and edit images directly from Claude Code

The repository also includes a local OpenAI Images MCP server. It exposes `generate_image` and `edit_image`, returns image previews to Claude, and saves output files in the active project's `generated-images/` folder.

Follow [MCP-SETUP.md](MCP-SETUP.md) to install it. This integration calls the OpenAI Images API using your own API key; API usage is billed separately from ChatGPT and it is not a bridge to an existing ChatGPT conversation.

