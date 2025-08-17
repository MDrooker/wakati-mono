/**
 * Global registry for Inngest functions
 * This solves the issue of multiple InngestService instances
 * by providing a central place to store all functions
 */

export class GlobalInngestFunctionsRegistry {
  private static functions: any[] = [];

  static registerFunction(fn: any): void {
    this.functions.push(fn);
  }

  static getFunctions(): any[] {
    return [...this.functions]; // Return a copy to prevent external modifications
  }

  static clear(): void {
    this.functions = [];
  }
}
