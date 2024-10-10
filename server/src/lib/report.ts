export default class Report {
  warnings: Error[];
  errors: Error[];
  sources: string[];

  url?: string;
  sourceMap?: string;

  constructor(report: Partial<Report> = {}) {
    this.warnings = report.warnings || [];
    this.errors = report.errors || [];
    this.sources = report.sources || [];

    this.url = report.url;
    this.sourceMap = report.sourceMap;
  }

  pushError(...errors: Error[]) {
    this.errors.push(...errors);
    return this;
  }

  pushWarning(...warnings: Error[]) {
    this.warnings.push(...warnings);
    return this;
  }

  pushSource(...sources: string[]) {
    this.sources.push(...sources);
    return this;
  }

  concat(report: Report) {
    const copy = new Report(this);
    copy.errors = copy.errors.concat(report.errors);
    copy.warnings = copy.warnings.concat(report.warnings);
    copy.sources = copy.sources.concat(report.sources);
    copy.sourceMap = report.sourceMap || copy.sourceMap;
    copy.url = report.url || copy.url;
    return copy;
  }

  size() {
    return this.errors.length + this.warnings.length;
  }
}
