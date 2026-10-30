import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_URL = "https://api.openai.com/v1/images";
const DEFAULT_MODEL = "gpt-image-2.5-sunburst";
const ALLOWED_MODELS = [
  "gpt-image-2.5-sunburst",
  "gpt-image-2.5-flare"
];
const QUALITY_VALUES = ["auto", "low", "medium", "high", "xhigh", "max"];
const FORMAT_MIME = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp"
};

const projectRoot = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const outputDir = path.join(projectRoot, "generated-images");

const server = new McpServer({
  name: "openai-images",
  version: "1.0.1"
});

function getApiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add your OpenAI API key to the environment, restart Claude Code, and try again."
    );
  }
  return key.trim();
}

function cleanFilename(value, extension, index, total, timestamp) {
  const raw = typeof value === "string" && value.trim()
    ? path.basename(value.trim())
    : "ai-visual";
  const stem = raw.replace(/\.[^.]+$/, "")
    .replace(/[<>:"\/\\|?*\x00-\x1F]/g, "-")
    .replace(/\.+$/g, "")
    .slice(0, 90) || "ai-visual";
  const suffix = total > 1 ? `-${index + 1}` : "";
  return `${stem}-${timestamp}${suffix}.${extension}`;
}

function resolveProjectFile(filePath) {
  const resolved = path.resolve(projectRoot, filePath);
  const relative = path.relative(projectRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      "For safety, input images must be inside the current Claude Code project. Copy the image into the project folder and retry."
    );
  }
  return resolved;
}

async function loadInputImage(filePath) {
  const resolved = resolveProjectFile(filePath);
  const info = await stat(resolved);
  if (!info.isFile()) throw new Error(`Not a file: ${filePath}`);
  if (info.size > 50 * 1024 * 1024) {
    throw new Error(`Input image exceeds 50 MB: ${filePath}`);
  }

  const extension = path.extname(resolved).toLowerCase();
  const mime = extension === ".png" ? "image/png"
    : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg"
    : extension === ".webp" ? "image/webp"
    : null;

  if (!mime) {
    throw new Error(`Unsupported image type: ${filePath}. Use PNG, JPG, or WebP.`);
  }

  return {
    path: resolved,
    name: path.basename(resolved),
    mime,
    bytes: await readFile(resolved)
  };
}

function buildPayload(options) {
  const payload = {
    model: options.model || DEFAULT_MODEL,
    prompt: options.prompt,
    size: options.size || "auto",
    quality: options.quality || "high",
    output_format: options.output_format || "png",
    n: options.n || 1
  };
  if (options.background) payload.background = options.background;
  return payload;
}

function appendOptions(form, options) {
  const payload = buildPayload(options);
  for (const [key, value] of Object.entries(payload)) {
    form.append(key, String(value));
  }
}

async function callImagesApi(endpoint, body) {
  const isForm = body instanceof FormData;
  const headers = {
    Authorization: `Bearer ${getApiKey()}`
  };
  if (!isForm) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: "POST",
    headers,
    body: isForm ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(10 * 60 * 1000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI API returned HTTP ${response.status}`;
    throw new Error(message);
  }
  if (!Array.isArray(payload.data) || payload.data.length === 0) {
    throw new Error("The image API returned no image data.");
  }
  return payload.data;
}

async function saveAndReturnImages(items, options, operation) {
  await mkdir(outputDir, { recursive: true });
  const extension = options.output_format || "png";
  const content = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.b64_json) {
      throw new Error("The API response did not include base64 image data.");
    }

    const filename = cleanFilename(options.filename, extension, i, items.length, timestamp);
    const filePath = path.join(outputDir, filename);
    const bytes = Buffer.from(item.b64_json, "base64");
    await writeFile(filePath, bytes);

    content.push({
      type: "text",
      text: `${operation} image saved: ${filePath}${item.revised_prompt ? `\nRevised prompt: ${item.revised_prompt}` : ""}`
    });
    content.push({
      type: "image",
      data: item.b64_json,
      mimeType: FORMAT_MIME[extension]
    });
  }

  return { content };
}

function withErrorHandling(handler) {
  return async (args) => {
    try {
      return await handler(args);
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: error instanceof Error ? error.message : String(error)
        }]
      };
    }
  };
}

const commonOptions = {
  prompt: z.string().min(1).max(32000).describe("Detailed image generation or editing prompt."),
  model: z.enum(ALLOWED_MODELS).optional().describe("GPT Image model. Defaults to gpt-image-2.5-sunburst."),
  size: z.string().optional().describe("Image dimensions such as auto, 1024x1024, 1536x1024, or 1024x1536. GPT Image 2.5 also supports custom dimensions within API limits."),
  quality: z.enum(QUALITY_VALUES).optional().describe("Quality: low, medium, high, xhigh, max, or auto. Defaults to high."),
  output_format: z.enum(["png", "jpeg", "webp"]).optional().describe("Output format. Defaults to png."),
  background: z.enum(["auto", "opaque", "transparent"]).optional().describe("Background mode. Transparent requires PNG or WebP."),
  n: z.number().int().min(1).max(4).optional().describe("Number of images to generate, from 1 to 4."),
  filename: z.string().optional().describe("Optional output filename stem. Files are saved in generated-images/. A timestamp is added to avoid overwriting earlier results.")
};

server.tool(
  "generate_image",
  "Generate a new image with OpenAI GPT Image. Saves the result in the project's generated-images folder and returns an image preview. Use after analyzing the brief and preparing a precise production prompt.",
  commonOptions,
  withErrorHandling(async (args) => {
    const payload = buildPayload(args);
    const data = await callImagesApi("generations", payload);
    return saveAndReturnImages(data, args, "Generated");
  })
);

server.tool(
  "edit_image",
  "Edit one or more existing images with OpenAI GPT Image. The first image is the primary source; additional images act as visual references. Preserve product geometry, construction, materials, colors, and recognizable details unless the prompt explicitly requests a change. Saves the result in generated-images/ and returns a preview.",
  {
    ...commonOptions,
    image_paths: z.array(z.string().min(1)).min(1).max(16)
      .describe("Paths to source/reference images inside the current project. The first image is the base image."),
    mask_path: z.string().optional()
      .describe("Optional PNG mask inside the current project. It must meet the OpenAI Images API mask requirements and match the base image dimensions.")
  },
  withErrorHandling(async (args) => {
    const form = new FormData();
    appendOptions(form, args);

    for (const imagePath of args.image_paths) {
      const input = await loadInputImage(imagePath);
      form.append(
        "image[]",
        new Blob([input.bytes], { type: input.mime }),
        input.name
      );
    }

    if (args.mask_path) {
      const mask = await loadInputImage(args.mask_path);
      if (mask.mime !== "image/png") {
        throw new Error("Mask file must be a PNG.");
      }
      form.append("mask", new Blob([mask.bytes], { type: mask.mime }), mask.name);
    }

    const data = await callImagesApi("edits", form);
    return saveAndReturnImages(data, args, "Edited");
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("OpenAI Images MCP server connected.");
