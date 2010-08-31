goog.provide('xyzon.AxisScale');

var ScaleMode = {
    HORIZONTAL: 1,
    VERTICAL:   2
};

/**
 * Abstract Class
 */
xyzon.AxisScale = function(thick, scaleMode, unit) {
    this.markColor = "#333";
    this.thickness = thick;
    this.length = 1;
    this.scaleMode = scaleMode || ScaleMode.HORIZONTAL;
    this.unit = unit || "";
    this.textClassName = "_canvas_text_";

    var self = this;

    // Init Container
    this.innerContainer = goog.dom.createDom('div', {
        style: goog.style.toStyleAttribute({
            position: 'absolute',
            'z-index': 100,
            'background-color': '#FF7F00'
        })
    });
    goog.dom.appendChild(document.body,
                         this.innerContainer);
    // Init Canvas
    this.canvas = goog.dom.createDom('canvas', {
        width: 10,
        height: 10
    });
    goog.dom.appendChild(this.innerContainer,
                         this.canvas);
    this.ctx = this.getContext(this.canvas);
};

xyzon.AxisScale.prototype.remove = function() {
    if (this.innerContainer) {
        goog.dom.removeNode(this.canvas);
        goog.dom.removeNode(this.ctx);
        goog.dom.removeNode(this.innerContainer);
    }
};

xyzon.AxisScale.prototype.getWidth = function() {
    return (this.scaleMode == ScaleMode.HORIZONTAL)
        ? this.length
        : this.thickness;
};

xyzon.AxisScale.prototype.getHeight = function() {
    return (this.scaleMode == ScaleMode.HORIZONTAL)
        ? this.thickness
        : this.length;
};

xyzon.AxisScale.prototype.setLength = function(value) {
    this.length = value;
    goog.style.setSize(this.innerContainer,
                       this.getWidth(),
                       this.getHeight());
    goog.dom.setProperties(this.canvas, {
        width: this.getWidth(),
        height: this.getHeight()
    });
    this.update_();
};

xyzon.AxisScale.prototype.setPosition = function(x, y) {
    goog.style.setPosition(this.innerContainer, x, y);
};

xyzon.AxisScale.prototype.isHorizontal = function() {
    return (this.scaleMode == ScaleMode.HORIZONTAL);
};

xyzon.AxisScale.prototype.hv = function(hValue, vValue) {
    return this.isHorizontal()
        ? hValue
        : vValue;
};

xyzon.AxisScale.prototype.getScaleLength = function() {
    return this.hv(
        this.getWidth(),
        this.getHeight());
};

xyzon.AxisScale.prototype.getContext = function(canvasElem) {
    if (typeof(G_vmlCanvasManager) != 'undefined') { // IE
        canvasElem = G_vmlCanvasManager.initElement(canvasElem);
    }
    return canvasElem.getContext('2d');
};

xyzon.AxisScale.prototype.appendText = function(text, pos, offset) {
    if (pos < 0) return;
    if (pos > this.getScaleLength()) return;

    var span = goog.dom.createDom('span', {
        'class': this.textClassName,
        'style': goog.style.toStyleAttribute({
            position: "absolute",
            'font-size': 13,
            color: '#333'
        })
    }, text + this.unit);
    goog.style.setPosition(span,
                           this.hv(pos,    offset),
                           this.hv(offset, pos));
    goog.dom.appendChild(this.innerContainer, span);
};

xyzon.AxisScale.prototype.removeAllTexts = function() {
    $(this.innerContainer).find(
        "span." + this.textClassName
    ).remove();
};

xyzon.AxisScale.prototype.setRange = function(range) {
    this.range = range;
    this.update_();
};

xyzon.AxisScale.prototype.update_ = function() {
    if (!this.range) return;
    this.ctx.clearRect(0, 0, this.getWidth(), this.getHeight());
    this.removeAllTexts();
    var labeledNumberTable = {};

    var num100000Marks = this.drawMarks(this.range,
                                        100000,
                                        5,
                                        18,
                                        true,
                                        labeledNumberTable);
    if (num100000Marks <= 4) {
        var num10000Marks = this.drawMarks(this.range,
                                           10000,
                                           3,
                                           14,
                                           (num100000Marks <= 1),
                                           labeledNumberTable);
        if (num10000Marks <= 4) {
            var num1000Marks = this.drawMarks(this.range,
                                              1000,
                                              1,
                                              8,
                                              (num10000Marks <= 1),
                                              labeledNumberTable);
            if (num1000Marks <= 4) {
                var num100Marks = this.drawMarks(this.range,
                                                 100,
                                                 1,
                                                 8,
                                                 (num1000Marks <= 1),
                                                 labeledNumberTable);
                if (num100Marks <= 4) {
                    this.drawMarks(this.range,
                                   10,
                                   1,
                                   8,
                                   (num100Marks <= 1),
                                   labeledNumberTable);
                }
            }
        }
    }
};

xyzon.AxisScale.prototype.drawMarks = function(range, unit,
                                               lineWidth,
                                               lineLength,
                                               labelIsShown,
                                               labeledNumberTable) {
    if (range.getDifference() < 1) {
        return 0;
    }
    var interval = unit * this.getScaleLength() / range.getDifference();
    var rightScaleValue = Math.floor(range.last / unit) * unit;
    var rightOffset = interval * (range.last - rightScaleValue) / unit;
    var count = 0;
    while (true) {
        if (count > 100) {
            $.log('Too many!');
            break;
        }
        
        var pos = this.getScaleLength() - rightOffset - interval * count;
        if (pos < 0) break;

        this.drawMark(pos, lineWidth, lineLength);
        //if (labelIsShown) {// TODO: 判定を距離に変える
        if (interval > 40) {
            var value = rightScaleValue - unit * count;
            if (!labeledNumberTable[value]) {
                this.appendText(value.toString(),
                                pos - 3,
                                lineLength);
                labeledNumberTable[value] = true;
            }
        }
        count++;
    }
    return count;
};

xyzon.AxisScale.prototype.drawMark = function(pos, lineWidth, lineLength) {
    if (this.scaleMode == ScaleMode.HORIZONTAL) {
        this.drawLine(
            pos, 0,
            pos, lineLength,
            lineWidth,
            lineLength);
    } else {
        this.drawLine(
            0, pos,
            lineLength, pos,
            lineWidth,
            lineLength);
    }
};

xyzon.AxisScale.prototype.drawLine = function(x1, y1, x2, y2,
                                              lineWidth, lineLength) {
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
};
