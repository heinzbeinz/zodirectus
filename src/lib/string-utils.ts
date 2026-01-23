/**
 * String utility functions for naming conventions
 */
export class StringUtils {
  /**
   * Convert string to PascalCase
   */
  static toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert string to kebab-case
   */
  static toKebabCase(str: string): string {
    return (
      str
        // Handle camelCase: add hyphen before uppercase letters following lowercase
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        // Handle PascalCase: add hyphen before uppercase letters following other uppercase letters
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        // Replace underscores and spaces with hyphens
        .replace(/[\s_]+/g, '-')
        // Convert to lowercase
        .toLowerCase()
    );
  }

  /**
   * Convert plural word to singular using linguistic rules
   */
  static toSingular(word: string): string {
    // Handle empty or single character words
    if (!word || word.length <= 1) {
      return word;
    }

    const lowerWord = word.toLowerCase();

    // Irregular plurals that need special handling
    const irregularPlurals: Record<string, string> = {
      children: 'child',
      people: 'person',
      men: 'man',
      women: 'woman',
      feet: 'foot',
      teeth: 'tooth',
      mice: 'mouse',
      geese: 'goose',
      oxen: 'ox',
      data: 'datum',
      media: 'medium',
      criteria: 'criterion',
      phenomena: 'phenomenon',
      indices: 'index',
      vertices: 'vertex',
      matrices: 'matrix',
      analyses: 'analysis',
      bases: 'base',
      diagnoses: 'diagnosis',
      theses: 'thesis',
      crises: 'crisis',
      oases: 'oasis',
    };

    // Check for irregular plurals first
    if (irregularPlurals[lowerWord]) {
      return this.capitalizeFirst(irregularPlurals[lowerWord], word);
    }

    // Handle Directus compound words first (special case)
    if (word.startsWith('Directus') && word.length > 'Directus'.length) {
      // For compound words like "DirectusRevisions", preserve the compound structure
      if (word.endsWith('s') && !word.endsWith('ies')) {
        const lastPart = word.match(/Directus([A-Z][a-z]*s?)$/);
        if (lastPart) {
          const root = lastPart[1].slice(0, -1); // Remove the 's'
          return word.replace(/Directus([A-Z][a-z]*s?)$/, `Directus${root}`);
        }
      }
      // For compound words like "DirectusPolicies", handle -ies -> -y
      if (word.endsWith('ies')) {
        const lastPart = word.match(/Directus([A-Z][a-z]*ies)$/);
        if (lastPart) {
          const root = lastPart[1].slice(0, -3) + 'y'; // Convert -ies to -y
          return word.replace(/Directus([A-Z][a-z]*ies)$/, `Directus${root}`);
        }
      }
    }

    // Handle other compound words (like DialogueXxx, AnswerXxx, etc.)
    if (word.match(/^[A-Z][a-z]*[A-Z]/)) {
      // Split by capital letters to find word parts
      const parts = word.split(/(?=[A-Z])/);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];

        // For compound words ending in 's', preserve the compound structure
        if (word.endsWith('s') && !word.endsWith('ies')) {
          if (lastPart.endsWith('s') && lastPart.length > 1) {
            const root = lastPart.slice(0, -1); // Remove the 's'
            parts[parts.length - 1] = root;
            return parts.join('');
          }
        }
        // For compound words ending in 'ies', handle -ies -> -y
        if (word.endsWith('ies')) {
          if (lastPart.endsWith('ies') && lastPart.length > 3) {
            const root = lastPart.slice(0, -3) + 'y'; // Convert -ies to -y
            parts[parts.length - 1] = root;
            return parts.join('');
          }
        }
      }
    }

    // Regular plural rules
    // Words ending in -ies (e.g., categories -> category)
    if (lowerWord.endsWith('ies') && lowerWord.length > 4) {
      return this.capitalizeFirst(lowerWord.slice(0, -3) + 'y', word);
    }

    // Words ending in -ves (e.g., leaves -> leaf, wolves -> wolf)
    if (lowerWord.endsWith('ves') && lowerWord.length > 4) {
      // Check if it should be 'f' or 'fe'
      const withoutVes = lowerWord.slice(0, -3);
      if (
        [
          'leaf',
          'wolf',
          'shelf',
          'calf',
          'half',
          'self',
          'knife',
          'life',
          'wife',
        ].includes(withoutVes + 'f')
      ) {
        return this.capitalizeFirst(withoutVes + 'f', word);
      }
      if (
        ['leaf', 'wolf', 'shelf', 'calf', 'half', 'self'].includes(withoutVes)
      ) {
        return this.capitalizeFirst(withoutVes, word);
      }
    }

    // Words ending in -es (but not -ies, -ves already handled)
    if (
      lowerWord.endsWith('es') &&
      !lowerWord.endsWith('ies') &&
      !lowerWord.endsWith('ves') &&
      lowerWord.length > 3
    ) {
      // Check if it's a valid -es plural (e.g., boxes -> box, classes -> class)
      const withoutEs = lowerWord.slice(0, -2);
      const lastChar = withoutEs.slice(-1);

      // Words ending in -s, -sh, -ch, -x, -z typically add -es
      if (
        ['s', 'sh', 'ch', 'x', 'z'].includes(lastChar) ||
        withoutEs.endsWith('ss') ||
        withoutEs.endsWith('ch') ||
        withoutEs.endsWith('sh')
      ) {
        return this.capitalizeFirst(withoutEs, word);
      }
    }

    // Words ending in -s (simple case)
    if (lowerWord.endsWith('s') && lowerWord.length > 2) {
      // Don't remove 's' if it's part of the root word
      const withoutS = lowerWord.slice(0, -1);

      // Avoid removing 's' from words that end with 's' in singular form
      // (e.g., "glass", "class", "mass", "pass", "grass", "gas", "bus", "access")
      const singularEndsWithS = [
        'glas',
        'clas',
        'mas',
        'pas',
        'gras',
        'ga',
        'bu',
        'acces',
      ];
      if (singularEndsWithS.some(ending => withoutS.endsWith(ending))) {
        return word; // Keep as is
      }

      return this.capitalizeFirst(withoutS, word);
    }

    // If no rules apply, return the original word
    return word;
  }

  /**
   * Capitalize the first letter while preserving the original casing pattern
   */
  private static capitalizeFirst(singular: string, original: string): string {
    if (original === original.toUpperCase()) {
      return singular.toUpperCase();
    }

    // For compound words like "DirectusRevision", preserve the original capitalization pattern
    if (original[0] === original[0].toUpperCase()) {
      // Try to reconstruct the compound word capitalization
      // Look for common patterns in the original word
      const originalLower = original.toLowerCase();
      const singularLower = singular.toLowerCase();

      // If the singular word contains the original word structure, try to preserve it
      if (singularLower.includes('directus')) {
        // For Directus compound words, capitalize each part
        return singularLower
          .replace('directus', 'Directus')
          .replace(/([a-z])([A-Z])/g, '$1$2'); // Preserve existing capitals
      }

      // Default: just capitalize the first letter
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    }
    return singular;
  }
}
