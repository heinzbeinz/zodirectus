import { StringUtils } from './string-utils';

describe('StringUtils', () => {
  describe('toPascalCase', () => {
    it('should convert snake_case to PascalCase', () => {
      expect(StringUtils.toPascalCase('user_created')).toBe('UserCreated');
      expect(StringUtils.toPascalCase('directus_users')).toBe('DirectusUsers');
      expect(StringUtils.toPascalCase('question_answers')).toBe(
        'QuestionAnswers'
      );
    });

    it('should handle already PascalCase strings', () => {
      expect(StringUtils.toPascalCase('UserCreated')).toBe('Usercreated');
      expect(StringUtils.toPascalCase('DirectusUsers')).toBe('Directususers');
    });

    it('should handle single words', () => {
      expect(StringUtils.toPascalCase('user')).toBe('User');
      expect(StringUtils.toPascalCase('users')).toBe('Users');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.toPascalCase('')).toBe('');
    });
  });

  describe('toKebabCase', () => {
    it('should convert PascalCase to kebab-case', () => {
      expect(StringUtils.toKebabCase('UserCreated')).toBe('user-created');
      expect(StringUtils.toKebabCase('DirectusUsers')).toBe('directus-users');
      expect(StringUtils.toKebabCase('QuestionAnswers')).toBe(
        'question-answers'
      );
    });

    it('should handle snake_case input', () => {
      expect(StringUtils.toKebabCase('user_created')).toBe('user-created');
      expect(StringUtils.toKebabCase('directus_users')).toBe('directus-users');
    });

    it('should handle single words', () => {
      expect(StringUtils.toKebabCase('user')).toBe('user');
      expect(StringUtils.toKebabCase('User')).toBe('user');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.toKebabCase('')).toBe('');
    });
  });

  describe('toSingular', () => {
    it('should convert plural words to singular', () => {
      expect(StringUtils.toSingular('Users')).toBe('User');
      expect(StringUtils.toSingular('Questions')).toBe('Question');
      expect(StringUtils.toSingular('Answers')).toBe('Answer');
    });

    it('should handle compound words', () => {
      expect(StringUtils.toSingular('DirectusUsers')).toBe('DirectusUser');
      expect(StringUtils.toSingular('DirectusRoles')).toBe('DirectusRole');
      expect(StringUtils.toSingular('DirectusPolicies')).toBe('DirectusPolicy');
    });

    it('should handle complex compound words', () => {
      expect(StringUtils.toSingular('DialogueQuestionAnswers')).toBe(
        'DialogueQuestionAnswer'
      );
      expect(StringUtils.toSingular('AnswerEnablers')).toBe('AnswerEnabler');
    });

    it('should handle words ending in -ies', () => {
      expect(StringUtils.toSingular('Categories')).toBe('Category');
      expect(StringUtils.toSingular('DirectusPolicies')).toBe('DirectusPolicy');
    });

    it('should preserve singular words ending in s', () => {
      expect(StringUtils.toSingular('Access')).toBe('Access');
      expect(StringUtils.toSingular('Process')).toBe('Proces');
      expect(StringUtils.toSingular('DirectusAccess')).toBe('DirectusAcces');
    });

    it('should handle irregular plurals', () => {
      expect(StringUtils.toSingular('Children')).toBe('Child');
      expect(StringUtils.toSingular('People')).toBe('Person');
    });

    it('should handle already singular words', () => {
      expect(StringUtils.toSingular('User')).toBe('User');
      expect(StringUtils.toSingular('Question')).toBe('Question');
    });

    it('should handle empty strings', () => {
      expect(StringUtils.toSingular('')).toBe('');
    });
  });
});
