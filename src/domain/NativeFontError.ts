export class NativeFontError extends Error {
  constructor(
    public readonly code: string,
    public readonly fontName: string,
    public readonly missingCharacters: string[] = [],
    cause?: unknown,
  ) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "NativeFontError";
  }
}
