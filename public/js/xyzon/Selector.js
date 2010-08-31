goog.provide('xyzon.Selector');

goog.require('goog.style');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('xyzon.Rect');

xyzon.Selector = function() {
    this.frame = this.createFrame()
    goog.dom.appendChild(document.body, this.frame);
};

xyzon.Selector.prototype.setLimitRect = function(left, top, width, height) {
    this.limitLeft = left;
    this.limitTop = top;
    this.limitRight = left + width;
    this.limitBottom = top + height;
};

xyzon.Selector.prototype.show = function() {
    goog.style.showElement(this.frame, true);
};

xyzon.Selector.prototype.hide = function() {
    goog.style.showElement(this.frame, false);
};

xyzon.Selector.prototype.createFrame = function() {
    var opacity = 0.3;
    var div = goog.dom.createDom('div', {
        style: goog.style.toStyleAttribute({
            position: "absolute",
            left: 0,
            top: 0,
            border: "1px solid #3333FF",
            'background-color': "#CCCCFF",
            filter: "alpha(opacity=" + (opacity*100) + ")", //IE
            '-moz-opacity': opacity, //FF
            opacity: opacity, // CSS3
            cursor: "crosshair",
            'z-index': 10000
        })
    });
    goog.style.setUnselectable(div, true);
    goog.events.listen(
        div,
        goog.events.EventType.MOUSEMOVE,
        function(event) {
            goog.events.Event.preventDefault(event);
        });
    return div;
};

xyzon.Selector.prototype.start = function(x, y) {
    this.startX = x;
    this.startY = y;
    goog.style.setPosition(this.frame, x, y);
    goog.style.setSize(this.frame, 0, 0);
};

xyzon.Selector.prototype.resizeTo = function(x, y) {
    if (x < this.limitLeft)   x = this.limitLeft;
    if (x > this.limitRight)  x = this.limitRight;
    if (y < this.limitTop)    y = this.limitTop;
    if (y > this.limitBottom) y = this.limitBottom;
    var newX = this.startX;
    var newY = this.startY;
    var newWidth = x - this.startX;
    var newHeight = y - this.startY;
    if (newWidth < 0) {
        newX = x;
        newWidth = Math.abs(newWidth);
    }
    if (newHeight < 0) {
        newY = y;
        newHeight = Math.abs(newHeight);
    }
    goog.style.setPosition(this.frame, newX, newY);
    goog.style.setSize(this.frame, newWidth, newHeight);
};

xyzon.Selector.prototype.getPageRect = function() {
    //var offset = this.frame.offset();
    //var offset = goog.style.getPageOffset(this.frame);
    var rect = goog.style.getBounds(this.frame);
    return new xyzon.Rect(
        rect.left,
        rect.top,
        rect.width,
        rect.height
    );
};

xyzon.Selector.prototype.getRelativeRect = function() {
    //var offset = this.frame.offset();
    //var offset = goog.style.getPageOffset(this.frame);
    var rect = goog.style.getBounds(this.frame);
    return new xyzon.Rect(
        rect.left - this.limitLeft,
        rect.top - this.limitTop,
        rect.width,
        rect.height
    );
};
