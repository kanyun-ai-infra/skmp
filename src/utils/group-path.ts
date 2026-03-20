/**
 * Group path utilities — normalization, slug generation, and validation.
 *
 * Shared by the `group` and `publish` CLI commands.
 */

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const MAX_GROUP_DEPTH = 3;
const MAX_SEGMENT_LENGTH = 64;

/**
 * Normalize a group path for API usage.
 *
 * Rules from spec §13.2:
 * - Strip leading/trailing slashes and whitespace
 * - Collapse consecutive slashes
 * - Lowercase
 */
export function normalizeGroupPath(raw: string): string {
  return raw
    .trim()
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '')
    .toLowerCase();
}

/**
 * Generate a URL-safe slug from a human-readable name.
 *
 * Spec §13.4:
 * - Lowercase, trim, replace spaces/underscores with hyphens
 * - Strip non-alphanumeric characters (except hyphens)
 * - Collapse consecutive hyphens, strip leading/trailing hyphens
 * - Truncate to MAX_SEGMENT_LENGTH characters
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SEGMENT_LENGTH);
}

/**
 * Validate a normalized group path.
 *
 * Spec §13.2:
 * - Segment slug must match SLUG_REGEX
 * - Segment length <= 64
 * - Max depth <= 3
 */
export function validateGroupPath(path: string): { valid: true } | { valid: false; error: string } {
  if (!path) {
    return { valid: false, error: 'Group path cannot be empty' };
  }

  const segments = path.split('/');
  if (segments.length > MAX_GROUP_DEPTH) {
    return {
      valid: false,
      error: `Group path depth cannot exceed ${MAX_GROUP_DEPTH} segments`,
    };
  }

  for (const segment of segments) {
    if (segment.length > MAX_SEGMENT_LENGTH) {
      return {
        valid: false,
        error: `Group path segment "${segment}" exceeds ${MAX_SEGMENT_LENGTH} characters`,
      };
    }
    if (!SLUG_REGEX.test(segment)) {
      return {
        valid: false,
        error: `Invalid group path segment "${segment}". Segments must match ${SLUG_REGEX}`,
      };
    }
  }

  return { valid: true };
}
