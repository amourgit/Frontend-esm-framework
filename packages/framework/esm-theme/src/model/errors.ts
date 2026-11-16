/** Document de thème refusé : la liste des problèmes est portée par `errors`. */
export class ThemeValidationError extends Error {
  readonly errors: string[];
  constructor(message: string, errors: string[]) {
    super(`${message}\n  ${errors.join('\n  ')}`);
    this.name = 'ThemeValidationError';
    this.errors = errors;
  }
}
