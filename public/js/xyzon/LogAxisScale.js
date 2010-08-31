goog.provide('xyzon.LogAxisScale');
goog.require('xyzon.AxisScale');

xyzon.LogAxisScale = function(thick, scaleMode, unit) {
    goog.base(this, 100, scaleMode, unit);
}
goog.inherits(xyzon.LogAxisScale, xyzon.AxisScale);

xyzon.LogAxisScale.prototype.getLogPos = function(value, range) {
    return(
        (Math.log(value) - range.getLogFirst())
            * this.getScaleLength()
            / range.getLogDifference());
};

xyzon.LogAxisScale.prototype.setRange = function(range) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.removeAllTexts();

    var prevPos = 0;
    for (var i=0; i<=6; i++) { // TODO: 6をなんとかする
        var value = Math.pow(10, i);
        var pos = this.getLogPos(value, range);
        if (pos > this.getScaleLength()) return;
        this.drawMark(pos, 3, 14);
        this.appendText(value.toString(),
                        pos - 10,
                        14 + 3);
        prevPos = pos;

        for (var j=2; j<=9; j++) {
            var value2 = value * j;
            var pos2 = this.getLogPos(value2, range);
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
