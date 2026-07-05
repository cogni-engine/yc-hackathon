import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const SUPABASE_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || 'generated-images';
const SUPABASE_STORAGE_PREFIX =
  process.env.SUPABASE_STORAGE_PREFIX || 'ai-images';

const DEFAULT_ASPECT_RATIO = '16:9';
const DEFAULT_IMAGE_SIZE = '1K';
const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4']);
const ALLOWED_IMAGE_SIZES = new Set(['512', '1K', '2K', '4K']);

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

interface GeneratedImageContent {
  data?: string;
  uri?: string;
  mime_type?: string;
}

export interface GenerateAndStoreImageOptions {
  apiKey?: string;
  prompt: string;
  context?: string;
  selection?: string;
  aspectRatio?: string;
  imageSize?: string;
}

export interface StoredGeneratedImage {
  src: string;
  alt: string;
  mimeType: string;
}

function sanitizeSvgText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function extensionForMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType.toLowerCase()] ?? 'bin';
}

function encodeObjectPath(objectPath: string): string {
  return objectPath
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

function normalizeAspectRatio(value: string | undefined): string {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return DEFAULT_ASPECT_RATIO;
  if (normalized === 'square') return '1:1';
  if (normalized === 'landscape') return '16:9';
  if (normalized === 'portrait') return '3:4';
  return ALLOWED_ASPECT_RATIOS.has(normalized)
    ? normalized
    : DEFAULT_ASPECT_RATIO;
}

function normalizeImageSize(value: string | undefined): string {
  const normalized = (value || '').trim().toLowerCase();
  const aliases: Record<string, string> = {
    standard: '1K',
    medium: '1K',
    hd: '2K',
    large: '2K',
    small: '512',
    '512': '512',
    '1k': '1K',
    '1024': '1K',
    '2k': '2K',
    '2048': '2K',
    '4k': '4K',
    '4096': '4K',
  };
  const mapped = aliases[normalized] ?? value?.trim();
  return mapped && ALLOWED_IMAGE_SIZES.has(mapped) ? mapped : DEFAULT_IMAGE_SIZE;
}

function getSupabaseConfig(): {
  url: string;
  key: string;
  bucket: string;
} {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).replace(/\/+$/, '');
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    throw new Error(
      'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return {
    url,
    key,
    bucket: SUPABASE_STORAGE_BUCKET,
  };
}

async function saveGeneratedImage(
  bytes: Buffer,
  mimeType: string
): Promise<string> {
  const { url, key, bucket } = getSupabaseConfig();
  const extension = extensionForMimeType(mimeType);
  const objectPath = `${SUPABASE_STORAGE_PREFIX}/${randomUUID()}.${extension}`;
  const encodedObjectPath = encodeObjectPath(objectPath);
  const uploadUrl = `${url}/storage/v1/object/${encodeURIComponent(
    bucket
  )}/${encodedObjectPath}`;
  const bodyBytes = Uint8Array.from(bytes);

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': mimeType,
      'Cache-Control': '31536000',
      'x-upsert': 'false',
    },
    body: bodyBytes,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data?.message || data?.error || detail;
    } catch {
      detail = await res.text();
    }
    throw new Error(`Supabase Storage upload failed: ${detail}`);
  }

  return `${url}/storage/v1/object/public/${encodeURIComponent(
    bucket
  )}/${encodedObjectPath}`;
}

async function createMockImage(prompt: string): Promise<StoredGeneratedImage> {
  const label = sanitizeSvgText(prompt.slice(0, 96) || 'Generated image');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="56" y="56" width="1168" height="608" rx="28" fill="#e0f2fe" stroke="#0284c7" stroke-width="4"/>
  <text x="640" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" fill="#075985">AI image mock</text>
  <text x="640" y="396" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#0f172a">${label}</text>
</svg>`;
  const mimeType = 'image/svg+xml';
  const src = await saveGeneratedImage(Buffer.from(svg), mimeType);
  return { src, alt: prompt, mimeType };
}

function buildImagePrompt(
  prompt: string,
  context: string,
  selection: string
): string {
  return `Create one polished image for insertion into a collaborative document.

User image request:
${prompt}

Selected text, if relevant:
${selection || '(none)'}

Surrounding document context, if relevant:
${context || '(empty)'}

Requirements:
- Produce only the requested image.
- Avoid adding readable text inside the image unless the user explicitly asks for it.
- Match the document context when it is clearly relevant.
- Prefer a clean, presentation-ready composition.`;
}

function readGeneratedImage(interaction: unknown): GeneratedImageContent | null {
  if (!interaction || typeof interaction !== 'object') return null;
  const typed = interaction as {
    output_image?: unknown;
    outputs?: unknown;
  };
  const outputImage = typed.output_image;
  if (
    outputImage &&
    typeof outputImage === 'object' &&
    ('data' in outputImage || 'uri' in outputImage)
  ) {
    return outputImage as GeneratedImageContent;
  }

  if (Array.isArray(typed.outputs)) {
    const image = typed.outputs.find(
      output =>
        output &&
        typeof output === 'object' &&
        (output as { type?: unknown }).type === 'image' &&
        ('data' in output || 'uri' in output)
    );
    if (image) return image as GeneratedImageContent;
  }

  return null;
}

export async function generateAndStoreImage({
  apiKey,
  prompt,
  context = '',
  selection = '',
  aspectRatio,
  imageSize,
}: GenerateAndStoreImageOptions): Promise<StoredGeneratedImage> {
  if (process.env.AI_MOCK === '1') {
    return createMockImage(prompt);
  }

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set on the server.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const interaction = await ai.interactions.create({
    model: IMAGE_MODEL,
    input: buildImagePrompt(prompt, context, selection),
    response_modalities: ['image'],
    response_format: {
      type: 'image',
      mime_type: 'image/jpeg',
      aspect_ratio: normalizeAspectRatio(aspectRatio),
      image_size: normalizeImageSize(imageSize),
    },
  });

  const image = readGeneratedImage(interaction);
  if (!image) {
    throw new Error('Gemini did not return an image.');
  }

  if (image.uri) {
    return {
      src: image.uri,
      alt: prompt,
      mimeType: image.mime_type ?? 'image/jpeg',
    };
  }

  if (!image.data) {
    throw new Error('Gemini image response did not include image data.');
  }

  const mimeType = image.mime_type ?? 'image/jpeg';
  const src = await saveGeneratedImage(
    Buffer.from(image.data, 'base64'),
    mimeType
  );

  return {
    src,
    alt: prompt,
    mimeType,
  };
}
