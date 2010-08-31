goog.provide('xyzon.Range');

xyzon.Range = function(first, last) {
    this.first = first;
    this.last = last;
};

xyzon.Range.prototype.getDifference = function() {
    return this.last - this.first;
};

xyzon.Range.prototype.getLogFirst = function() {
    return Math.log(this.first);
};

xyzon.Range.prototype.getLogLast = function() {
    return Math.log(this.last);
};

xyzon.Range.prototype.getLogDifference = function() {
    return this.getLogLast() - this.getLogFirst();
};

xyzon.Range.prototype.toString = function() {
    return this.first + " " + this.last;
};
