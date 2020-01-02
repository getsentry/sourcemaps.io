export interface SourceMap {
  version: number;
  file: string;
  names: Array<string>;
  sources: Array<string>;
  sourceRoot: string;
  mappings: string;
}
