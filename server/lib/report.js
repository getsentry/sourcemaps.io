class Report {
  constructor(report = {}) {
    this.warnings = report.warnings || [];
    this.errors = report.errors || [];
    this.sources = report.sources || [];

    this.url = report.url;
    this.sourceMap = report.sourceMap;
  }

  pushError(...errors) {
    this.errors.push(...errors);
    return this;
  }

  pushWarning(...warnings) {
    this.warnings.push(...warnings);
    return this;
  }

  pushSource(...sources) {
    this.sources.push(...sources);
    return this;
  }

  concat(report) {
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

module.exports = Report;
