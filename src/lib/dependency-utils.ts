import { GeneratedSchema } from '../types';
import { StringUtils } from './string-utils';

/**
 * Utilities for handling dependency graphs and circular dependencies
 */
export class DependencyUtils {
  /**
   * Build a dependency graph from generated schemas
   */
  static buildDependencyGraph(
    results: GeneratedSchema[]
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const result of results) {
      const currentCollectionName = StringUtils.toSingular(
        StringUtils.toPascalCase(result.collectionName)
      );
      const dependencies = new Set<string>();

      // Extract dependencies from schema
      if (result.schema) {
        const schemaMatches = result.schema.match(/Drx[A-Z][a-zA-Z]*Schema/g);
        if (schemaMatches) {
          schemaMatches.forEach(match => {
            const singularName = match.replace('Drx', '').replace('Schema', '');
            // Skip Create, Update, Get schemas
            if (
              !singularName.endsWith('Create') &&
              !singularName.endsWith('Update') &&
              !singularName.endsWith('Get') &&
              singularName !== currentCollectionName
            ) {
              dependencies.add(singularName);
            }
          });
        }
      }

      // Extract dependencies from type
      if (result.type) {
        const typeMatches = result.type.match(/Drs[A-Z][a-zA-Z]*/g);
        if (typeMatches) {
          typeMatches.forEach(match => {
            const singularName = match.replace('Drs', '');
            // Skip Create, Update, Get types
            if (
              !singularName.endsWith('Create') &&
              !singularName.endsWith('Update') &&
              !singularName.endsWith('Get') &&
              singularName !== currentCollectionName
            ) {
              dependencies.add(singularName);
            }
          });
        }
      }

      if (dependencies.size > 0) {
        graph.set(currentCollectionName, dependencies);
      }
    }

    return graph;
  }

  /**
   * Detect circular dependencies in a dependency graph
   */
  static detectCircularDependencies(
    graph: Map<string, Set<string>>
  ): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps = new Set<string[]>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // Complete the cycle
          circularDeps.add(cycle);
        }
      }

      recursionStack.delete(node);
      path.pop();
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return Array.from(circularDeps);
  }

  /**
   * Check if there's a circular dependency between two collections
   */
  static isCircularDependency(
    collectionA: string,
    collectionB: string,
    circularDeps: string[][]
  ): boolean {
    return circularDeps.some(
      cycle => cycle.includes(collectionA) && cycle.includes(collectionB)
    );
  }
}
