goog.provide('xyzon.Rect');

xyzon.Rect = function(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
};

xyzon.Rect.prototype.getLeft = function() {
    return this.x;
};

xyzon.Rect.prototype.getTop = function() {
    return this.y;
};

xyzon.Rect.prototype.getRight = function() {
    return this.x + this.width;
};

xyzon.Rect.prototype.getBottom = function() {
    return this.y + this.height;
};
