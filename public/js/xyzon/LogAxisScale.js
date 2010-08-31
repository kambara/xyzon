goog.provide('xyzon.LogAxisScale');
goog.require('xyzon.AxisScale');

xyzon.LogAxisScale = function(thick, scaleMode, unit) {
    goog.base(this, thick, scaleMode, unit);
}
goog.inherits(xyzon.LogAxisScale, xyzon.AxisScale);

xyzon.LogAxisScale.prototype.getLogPos = function(value, range) {
    return(
        (Math.log(value) - range.getLogFirst())
            * this.getScaleLength()
            / range.getLogDifference());
};

xyzon.LogAxisScale.prototype.update_ = function() {
    if (!this.range) return;
    this.ctx.clearRect(0, 0, this.getWidth(), this.getHeight());
    this.removeAllTexts();

    var prevPos = 0;
    for (var i=0; i<=6; i++) { // 1000000まで
        var value = Math.pow(10, i);
        var pos = this.getLogPos(value, this.range);
        if (pos > this.getScaleLength()) return;
        if (pos < -1000) return;
        
        this.drawMark(pos, 3, 14);
        this.appendText(value.toString(),
                        pos - 10,
                        14 + 3);
        prevPos = pos;

        for (var j=2; j<=9; j++) { // ラベル用
            var value2 = value * j;
            var pos2 = this.getLogPos(value2, this.range);
            if (pos2 > this.getScaleLength()) return;
            if (pos2 - prevPos < 5) break;
            this.drawMark(pos2, 1, 8);
            if (pos2 - prevPos > 15) {
                this.appendText(value2.toString(),
                                pos2 - 10,
                                8 + 3);
            }
            prevPos = pos2;
        }
    }
};
