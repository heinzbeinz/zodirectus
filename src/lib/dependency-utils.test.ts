import { DependencyUtils } from './dependency-utils';
import { GeneratedSchema } from '../types';

describe('DependencyUtils', () => {
  const createMockSchema = (
    collectionName: string,
    schema?: string,
    type?: string
  ): GeneratedSchema => ({
    collectionName,
    schema,
    type,
  });

  describe('buildDependencyGraph', () => {
    it('should build dependency graph correctly', () => {
      const results: GeneratedSchema[] = [
        createMockSchema(
          'users',
          'export const DrxUserSchema = z.object({ posts: DrxPostSchema.nullable().optional() });'
        ),
        createMockSchema(
          'posts',
          'export const DrxPostSchema = z.object({ author: DrxUserSchema.nullable().optional() });'
        ),
        createMockSchema(
          'comments',
          'export const DrxCommentSchema = z.object({ post: DrxPostSchema.nullable().optional() });'
        ),
      ];

      const graph = DependencyUtils.buildDependencyGraph(results);

      expect(graph.get('User')).toEqual(new Set(['Post']));
      expect(graph.get('Post')).toEqual(new Set(['User']));
      expect(graph.get('Comment')).toEqual(new Set(['Post']));
    });

    it('should handle schemas with no dependencies', () => {
      const results: GeneratedSchema[] = [
        createMockSchema(
          'users',
          'export const DrxUserSchema = z.object({ name: z.string() });'
        ),
      ];

      const graph = DependencyUtils.buildDependencyGraph(results);

      expect(graph.get('User')).toBeUndefined();
    });

    it('should handle empty results', () => {
      const results: GeneratedSchema[] = [];
      const graph = DependencyUtils.buildDependencyGraph(results);
      expect(graph.size).toBe(0);
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect circular dependencies', () => {
      const graph = new Map<string, Set<string>>();
      graph.set('User', new Set(['Post']));
      graph.set('Post', new Set(['User']));

      const circularDeps = DependencyUtils.detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(1);
      expect(circularDeps[0]).toEqual(['User', 'Post', 'User']);
    });

    it('should detect multiple circular dependencies', () => {
      const graph = new Map<string, Set<string>>();
      graph.set('User', new Set(['Post']));
      graph.set('Post', new Set(['User']));
      graph.set('Comment', new Set(['Post']));
      graph.set('Tag', new Set(['Comment']));
      graph.set('Post', new Set(['Tag'])); // This creates another cycle

      const circularDeps = DependencyUtils.detectCircularDependencies(graph);

      expect(circularDeps.length).toBeGreaterThan(0);
    });

    it('should handle graphs with no circular dependencies', () => {
      const graph = new Map<string, Set<string>>();
      graph.set('User', new Set(['Post']));
      graph.set('Post', new Set(['Comment']));
      graph.set('Comment', new Set());

      const circularDeps = DependencyUtils.detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(0);
    });

    it('should handle empty graph', () => {
      const graph = new Map<string, Set<string>>();
      const circularDeps = DependencyUtils.detectCircularDependencies(graph);

      expect(circularDeps).toHaveLength(0);
    });
  });

  describe('isCircularDependency', () => {
    it('should identify circular dependencies correctly', () => {
      const circularDeps = [
        ['User', 'Post', 'User'],
        ['Comment', 'Post', 'Comment'],
      ];

      expect(
        DependencyUtils.isCircularDependency('User', 'Post', circularDeps)
      ).toBe(true);
      expect(
        DependencyUtils.isCircularDependency('Post', 'User', circularDeps)
      ).toBe(true);
      expect(
        DependencyUtils.isCircularDependency('Comment', 'Post', circularDeps)
      ).toBe(true);
      expect(
        DependencyUtils.isCircularDependency('User', 'Comment', circularDeps)
      ).toBe(false);
    });

    it('should handle empty circular dependencies', () => {
      const circularDeps: string[][] = [];

      expect(
        DependencyUtils.isCircularDependency('User', 'Post', circularDeps)
      ).toBe(false);
    });
  });
});
