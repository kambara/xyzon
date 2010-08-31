goog.provide('xyzon.Point');

xyzon.Point = function(x, y) {
    this.x = x;
    this.y = y;
};

xyzon.Point.prototype.subtract = function(p) {
    return new Point(this.x - p.x,
                     this.y - p.y);
};
