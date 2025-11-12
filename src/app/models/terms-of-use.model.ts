/**
 * Terms of Use Model
 * Manages version-controlled terms of use documents per country
 */

export interface TermsOfUse {
  id: string;                 // Firestore document ID
  version: string;            // Version number (e.g., "1.0", "2.0")
  country: string;            // Country code (BR, AR, US, etc.)
  effectiveDate: Date;        // Date when this version becomes effective
  createdAt: Date;            // When this document was created
  text: string;               // Full text of terms (HTML or markdown)
  summary?: string;           // Optional short summary
  language: string;           // Language code (pt-BR, es-AR, en-US, etc.)
  isActive: boolean;          // Whether this version is currently active
}

/**
 * Helper function to create a unique ID for terms documents
 * Format: {country}_{version} (e.g., "BR_1.0", "AR_2.1")
 */
export function createTermsId(country: string, version: string): string {
  return `${country}_${version}`;
}

/**
 * Helper function to check if user needs to accept new terms
 * Returns true if there's a newer version than what user has accepted
 */
export function needsTermsUpdate(
  userAcceptedVersions: { version: string; country: string; acceptedAt: Date }[],
  latestTerms: TermsOfUse
): boolean {
  // Find user's acceptance for this country
  const userAcceptance = userAcceptedVersions.find(
    acceptance => acceptance.country === latestTerms.country
  );

  // If user never accepted terms for this country, they need to accept
  if (!userAcceptance) {
    return true;
  }

  // Compare version numbers (simple string comparison works for semantic versioning)
  // For more complex versioning, consider using semver library
  return compareVersions(latestTerms.version, userAcceptance.version) > 0;
}

/**
 * Compare two version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}
