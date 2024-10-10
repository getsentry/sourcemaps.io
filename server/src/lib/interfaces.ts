import Report from './report';

export interface ReportCallback {
  (report: Report): void;
}

export interface ContextMapping {
  originalContext: Array<[number, string]>; // Array of line number/source code tuples, e.g. [1, "const x = 1;"]
  generatedContext: string;
  originalLine: number;
  originalColumn: number;
  generatedLine: number;
  generatedColumn: number;
}
