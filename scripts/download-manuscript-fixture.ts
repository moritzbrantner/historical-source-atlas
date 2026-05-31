import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type DownloadedManuscriptPage = {
  sourceSlug: string;
  manifestId: string;
  canvasId: string;
  canvasLabel: string;
  width: number;
  height: number;
  provider: string | null;
  rights: string | null;
  attribution: string | null;
  sourceImageUrl: string;
  localImageUrl: string;
  downloadedAt: string;
  sha256: string;
};

export type ParsedIiifCanvas = {
  canvasId: string;
  label: string;
  width: number;
  height: number;
  imageId: string;
  imageServiceId: string | null;
};

export type ParsedIiifManifest = {
  manifestId: string;
  provider: string | null;
  rights: string | null;
  attribution: string | null;
  canvases: ParsedIiifCanvas[];
};

type CliOptions = {
  canvasIndexes: number[];
  canvasLabels: string[];
  dryRun: boolean;
  force: boolean;
  manifestUrl: string;
  maxWidth: number;
  outCache: string;
  outPublic: string;
  sourceSlug: string;
};

export function parseIiifManifest(manifest: unknown): ParsedIiifManifest {
  if (!isRecord(manifest)) {
    throw new Error('Expected IIIF Presentation v2 or v3 manifest');
  }

  if (Array.isArray(manifest.items)) {
    return parseIiifV3Manifest(manifest);
  }

  if (
    Array.isArray(manifest.sequences) &&
    isRecord(manifest.sequences[0]) &&
    Array.isArray(manifest.sequences[0].canvases)
  ) {
    return parseIiifV2Manifest(manifest);
  }

  throw new Error('Expected IIIF Presentation v2 or v3 manifest');
}

export function selectIiifCanvases({
  canvasIndexes,
  canvasLabels,
  manifest,
}: {
  canvasIndexes: number[];
  canvasLabels: string[];
  manifest: ParsedIiifManifest;
}) {
  const selectedCanvases: ParsedIiifCanvas[] = [];

  for (const requestedLabel of canvasLabels) {
    const normalizedRequestedLabel = normalizeLabel(requestedLabel);
    const matches = manifest.canvases.filter(
      (canvas) => normalizeLabel(canvas.label) === normalizedRequestedLabel,
    );

    if (matches.length > 1) {
      throw new Error(
        `Canvas label "${requestedLabel}" matched ${matches.length} canvases`,
      );
    }

    if (matches.length === 0) {
      const nearestLabels = findNearestLabels(
        normalizedRequestedLabel,
        manifest.canvases.map((canvas) => canvas.label),
      );
      throw new Error(
        [
          `Canvas label "${requestedLabel}" was not found.`,
          nearestLabels.length
            ? `Nearest available labels: ${nearestLabels.join(', ')}`
            : 'No canvas labels are available.',
        ].join(' '),
      );
    }

    selectedCanvases.push(matches[0]!);
  }

  for (const canvasIndex of canvasIndexes) {
    const canvas = manifest.canvases[canvasIndex];

    if (!canvas) {
      throw new Error(
        `Canvas index ${canvasIndex} was not found. Available indexes: 0-${Math.max(
          manifest.canvases.length - 1,
          0,
        )}`,
      );
    }

    selectedCanvases.push(canvas);
  }

  const uniqueCanvasesById = new Map<string, ParsedIiifCanvas>();

  for (const canvas of selectedCanvases) {
    uniqueCanvasesById.set(canvas.canvasId, canvas);
  }

  return Array.from(uniqueCanvasesById.values());
}

export function buildIiifImageUrl(canvas: ParsedIiifCanvas, maxWidth: number) {
  const baseImageUrl =
    canvas.imageServiceId ?? stripIiifImageUrl(canvas.imageId);

  return `${baseImageUrl.replace(/\/$/, '')}/full/${maxWidth},/0/default.jpg`;
}

export function normalizeLabel(label: string) {
  return label.trim().replace(/\s+/g, ' ');
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const manifestResponse = await fetch(options.manifestUrl);

  if (!manifestResponse.ok) {
    throw new Error(
      `Failed to fetch manifest ${options.manifestUrl}: ${manifestResponse.status} ${manifestResponse.statusText}`,
    );
  }

  const manifest = parseIiifManifest(await manifestResponse.json());
  const selectedCanvases = selectIiifCanvases({
    canvasIndexes: options.canvasIndexes,
    canvasLabels: options.canvasLabels,
    manifest,
  });

  if (selectedCanvases.length === 0) {
    throw new Error(
      'Select at least one canvas with --canvas-label or --canvas-index',
    );
  }

  const pages = selectedCanvases.map((canvas) => ({
    canvas,
    localImagePath: path.join(
      options.outPublic,
      options.sourceSlug,
      `${slugifyCanvasLabel(canvas.label)}.jpg`,
    ),
    sourceImageUrl: buildIiifImageUrl(canvas, options.maxWidth),
  }));

  if (options.dryRun) {
    for (const page of pages) {
      console.log(
        `${page.canvas.label}\n  canvas: ${page.canvas.canvasId}\n  image: ${page.sourceImageUrl}\n  target: ${page.localImagePath}`,
      );
    }
    return;
  }

  await mkdir(path.join(options.outPublic, options.sourceSlug), {
    recursive: true,
  });
  await mkdir(path.join(options.outCache, options.sourceSlug), {
    recursive: true,
  });

  const downloadedAt = new Date().toISOString();
  const downloadedPages: DownloadedManuscriptPage[] = [];

  for (const page of pages) {
    const bytes =
      existsSync(page.localImagePath) && !options.force
        ? await readFile(page.localImagePath)
        : await downloadImage(page.sourceImageUrl, page.localImagePath);

    downloadedPages.push({
      attribution: manifest.attribution,
      canvasId: page.canvas.canvasId,
      canvasLabel: page.canvas.label,
      downloadedAt,
      height: page.canvas.height,
      localImageUrl: `/${path
        .join(
          options.outPublic.replace(/^public[\\/]/, ''),
          options.sourceSlug,
          `${slugifyCanvasLabel(page.canvas.label)}.jpg`,
        )
        .replace(/\\/g, '/')}`,
      manifestId: manifest.manifestId,
      provider: manifest.provider,
      rights: manifest.rights,
      sha256: sha256(bytes),
      sourceImageUrl: page.sourceImageUrl,
      sourceSlug: options.sourceSlug,
      width: page.canvas.width,
    });
  }

  await writeFile(
    path.join(options.outCache, options.sourceSlug, 'pages.json'),
    `${JSON.stringify(downloadedPages, null, 2)}\n`,
  );
}

function parseCliOptions(args: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    canvasIndexes: [],
    canvasLabels: [],
    dryRun: false,
    force: false,
    maxWidth: 1600,
    outCache: '.generated/manuscripts',
    outPublic: 'public/atlas-manuscripts',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = () => {
      const value = args[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }

      index += 1;
      return value;
    };

    switch (arg) {
      case '--source':
        options.sourceSlug = nextValue();
        break;
      case '--manifest':
        options.manifestUrl = nextValue();
        break;
      case '--canvas-label':
        options.canvasLabels?.push(nextValue());
        break;
      case '--canvas-index':
        options.canvasIndexes?.push(parseNonNegativeInteger(nextValue(), arg));
        break;
      case '--max-width':
        options.maxWidth = parseNonNegativeInteger(nextValue(), arg);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--out-public':
        options.outPublic = nextValue();
        break;
      case '--out-cache':
        options.outCache = nextValue();
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.sourceSlug) {
    throw new Error('Missing required --source <slug>');
  }

  if (!options.manifestUrl) {
    throw new Error('Missing required --manifest <url>');
  }

  return options as CliOptions;
}

function parseNonNegativeInteger(value: string, optionName: string) {
  const parsedValue = Number.parseInt(value, 10);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 0 ||
    String(parsedValue) !== value
  ) {
    throw new Error(`${optionName} must be a non-negative integer`);
  }

  return parsedValue;
}

async function downloadImage(sourceImageUrl: string, localImagePath: string) {
  const response = await fetch(sourceImageUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download image ${sourceImageUrl}: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(
      `Expected image content-type for ${sourceImageUrl}; received ${contentType || 'unknown'}`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const temporaryPath = `${localImagePath}.tmp`;

  try {
    await writeFile(temporaryPath, bytes);
    await rename(temporaryPath, localImagePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return bytes;
}

function parseIiifV3Manifest(manifest: Record<string, unknown>) {
  const metadata = readMetadata(manifest.metadata);

  return {
    attribution: localizedText(getNested(manifest.requiredStatement, 'value')),
    canvases: asArray(manifest.items).flatMap(parseIiifV3Canvas),
    manifestId: stringValue(manifest.id) ?? stringValue(manifest['@id']) ?? '',
    provider:
      localizedText(getNested(asArray(manifest.provider)[0], 'label')) ??
      metadata.get('Digitised by') ??
      metadata.get('Provider') ??
      null,
    rights:
      stringValue(manifest.rights) ??
      metadata.get('Usage terms') ??
      metadata.get('Rights') ??
      null,
  } satisfies ParsedIiifManifest;
}

function parseIiifV2Manifest(manifest: Record<string, unknown>) {
  return {
    attribution: localizedText(manifest.attribution),
    canvases: asArray(
      getNested(asArray(manifest.sequences)[0], 'canvases'),
    ).flatMap(parseIiifV2Canvas),
    manifestId: stringValue(manifest['@id']) ?? stringValue(manifest.id) ?? '',
    provider: localizedText(manifest.provider),
    rights: stringValue(manifest.license) ?? localizedText(manifest.rights),
  } satisfies ParsedIiifManifest;
}

function parseIiifV3Canvas(canvas: unknown): ParsedIiifCanvas[] {
  if (!isRecord(canvas)) {
    return [];
  }

  const body = asArray(
    getNested(asArray(getNested(asArray(canvas.items)[0], 'items'))[0], 'body'),
  ).find((candidate) => isRecord(candidate));

  if (!isRecord(body)) {
    return [];
  }

  return [canvasFromRecords(canvas, body)];
}

function parseIiifV2Canvas(canvas: unknown): ParsedIiifCanvas[] {
  if (!isRecord(canvas)) {
    return [];
  }

  const resource = getNested(asArray(canvas.images)[0], 'resource');

  if (!isRecord(resource)) {
    return [];
  }

  return [canvasFromRecords(canvas, resource)];
}

function canvasFromRecords(
  canvas: Record<string, unknown>,
  image: Record<string, unknown>,
): ParsedIiifCanvas {
  const canvasId = stringValue(canvas.id) ?? stringValue(canvas['@id']) ?? '';
  const imageId = stringValue(image.id) ?? stringValue(image['@id']) ?? '';

  return {
    canvasId,
    height: numberValue(canvas.height) ?? numberValue(image.height) ?? 0,
    imageId,
    imageServiceId: selectImageServiceId(image.service),
    label: localizedText(canvas.label) ?? canvasId,
    width: numberValue(canvas.width) ?? numberValue(image.width) ?? 0,
  };
}

function selectImageServiceId(serviceValue: unknown) {
  const services = asArray(serviceValue).filter(isRecord);
  const service =
    services.find((candidate) =>
      String(candidate.type ?? candidate['@type'] ?? '').includes(
        'ImageService3',
      ),
    ) ??
    services.find((candidate) =>
      String(candidate.type ?? candidate['@type'] ?? '').includes(
        'ImageService2',
      ),
    ) ??
    services[0];

  if (!service) {
    return null;
  }

  return stringValue(service.id) ?? stringValue(service['@id']);
}

function readMetadata(metadataValue: unknown) {
  const metadata = new Map<string, string>();

  for (const entry of asArray(metadataValue)) {
    if (!isRecord(entry)) {
      continue;
    }

    const label = localizedText(entry.label);
    const value = localizedText(entry.value);

    if (label && value) {
      metadata.set(label, value);
    }
  }

  return metadata;
}

function localizedText(value: unknown): string | null {
  if (typeof value === 'string') {
    return normalizeLabel(value);
  }

  if (Array.isArray(value)) {
    return normalizeLabel(value.map(localizedText).filter(Boolean).join(' '));
  }

  if (isRecord(value)) {
    const preferredValue = value.en ?? Object.values(value)[0];
    return localizedText(preferredValue);
  }

  return null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNested(value: unknown, key: string) {
  return isRecord(value) ? value[key] : undefined;
}

function stripIiifImageUrl(imageId: string) {
  const match = imageId.match(/^(.*)\/full\/[^/]+\/[^/]+\/[^/]+$/);
  return match?.[1] ?? imageId;
}

function slugifyCanvasLabel(label: string) {
  const slug = normalizeLabel(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'canvas';
}

function sha256(bytes: Buffer | Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

function findNearestLabels(requestedLabel: string, availableLabels: string[]) {
  return availableLabels
    .map((label) => ({
      distance: levenshteinDistance(requestedLabel, normalizeLabel(label)),
      label,
    }))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 5)
    .map((entry) => entry.label);
}

function levenshteinDistance(first: string, second: string) {
  const distances = Array.from({ length: first.length + 1 }, (_, index) => [
    index,
  ]);

  for (let column = 1; column <= second.length; column += 1) {
    distances[0]![column] = column;
  }

  for (let row = 1; row <= first.length; row += 1) {
    for (let column = 1; column <= second.length; column += 1) {
      const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1;
      distances[row]![column] = Math.min(
        distances[row - 1]![column]! + 1,
        distances[row]![column - 1]! + 1,
        distances[row - 1]![column - 1]! + substitutionCost,
      );
    }
  }

  return distances[first.length]![second.length]!;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
