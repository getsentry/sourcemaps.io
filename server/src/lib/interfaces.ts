// See: https://github.com/mozilla/source-map#new-sourcemapconsumerrawsourcemap
export interface SourceMap {
  version: number;
  file: string;
  names: Array<string>;
  sources: Array<string>;
  sourceRoot: string;
  mappings: string;
}

// See: https://github.com/mozilla/source-map#sourcemapconsumerprototypeeachmappingcallback-context-order
export interface SourceMapping {
  source: string;
  name: string;
  originalLine: number;
  originalColumn: number;
  generatedLine: number;
  generatedColumn: number;
}

export interface ContextMapping {
  originalContext: Array<[number, string]>; // Array of line number/source code tuples, e.g. [1, "const x = 1;"]
  generatedContext: string;
  originalLine: number;
  originalColumn: number;
  generatedLine: number;
  generatedColumn: number;
}