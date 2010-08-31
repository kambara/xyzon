goog.provide('xyzon.XYGraphArea');

goog.require('goog.dom');
goog.require('goog.style');
goog.require('goog.math.Size');
goog.require('xyzon.Range');
goog.require('xyzon.Selector');
goog.require('xyzon.AxisScale');
goog.require('xyzon.LogAxisScale');

xyzon.XYGraphArea = function(container, xIsLog, yIsLog) {
    // Todo: containerは不要
    this.xMaxAxisRange = new xyzon.Range(0, 0);
    this.yMaxAxisRange = new xyzon.Range(0, 0);
    this.xCurrentAxisRange = new xyzon.Range(0, 0);
    this.yCurrentAxisRange = new xyzon.Range(0, 0);
    this.xAxisIsLogScale = xIsLog || false;
    this.yAxisIsLogScale = yIsLog || false;
    this.rangeHistories = [];
    this.graphItems = [];

    // ItemContainer
    this.itemContainer = this.createItemContainer().get(0);
    goog.dom.appendChild(document.body, this.itemContainer);

    // AxisScale
    this.xAxisScale = this.xAxisIsLogScale
        ? new xyzon.LogAxisScale(34, ScaleMode.HORIZONTAL, "円")
        : new xyzon.AxisScale(34, ScaleMode.HORIZONTAL, "円");
    this.yAxisScale = this.yAxisIsLogScale
        ? new xyzon.LogAxisScale(100, ScaleMode.VERTICAL, "位")
        : new xyzon.AxisScale(100, ScaleMode.VERTICAL, "位");

    // Selector
    this.selector = new xyzon.Selector();
    this.selector.hide();

    // Resize
    var self = this;
    goog.events.listen(
        window,
        goog.events.EventType.RESIZE,
        function(evt) {
            self.onWindowResize();
        });
    this.onWindowResize();
};

xyzon.XYGraphArea.prototype.onWindowResize = function() {
    var viewportSize = goog.dom.getViewportSize();
    var header = goog.dom.getElement('header');
    var headerSize = goog.style.getSize(header);
    var xMenuBox = goog.dom.getElement('x-menu-box');
    var xMenuBoxSize = goog.style.getSize(xMenuBox);
    var yMenuBox = goog.dom.getElement('y-menu-box');
    var yMenuBoxSize = goog.style.getSize(yMenuBox);

    this.width  = viewportSize.width - xMenuBoxSize.width - 100;
    this.height = viewportSize.height - headerSize.height - 34;
    
    // Resize ItemContainer
    goog.style.setSize(this.itemContainer,
                       this.width,
                       this.height);
    goog.style.setPosition(this.itemContainer,
                           xMenuBoxSize.width,
                           headerSize.height);

    // itemContainer 再描画
    this.adjustGraphItems();

    // Resize AxisScale
    var rect = goog.style.getBounds(this.itemContainer);
    this.xAxisScale.setPosition(rect.left,
                                rect.top + rect.height);
    this.yAxisScale.setPosition(rect.left + rect.width,
                                rect.top);
    this.xAxisScale.setLength(rect.width);
    this.yAxisScale.setLength(rect.height);

    // Selector Limit
    this.selector.setLimitRect(rect.left,
                               rect.top,
                               rect.width,
                               rect.height);

    // Move Axis Label
    goog.style.setPosition(yMenuBox,
                           viewportSize.width - yMenuBoxSize.width,
                           rect.top - yMenuBoxSize.height);
};

xyzon.XYGraphArea.prototype.createItemContainer = function() {
    var self = this;
    var div = $("<div/>").unselectable().css({
        border: "1px solid #555",
        "background-color": "#FFF",
        //position: "relative",
        position: 'absolute',
        cursor: "crosshair",
        overflow: "hidden",
        "float": "left"
    }).mousedown(function(event) {
        self.onMousedown(event);
    });

    $("body").mousedown(function() {
        self.removeAllDetail();
    }).mousemove(function(event) {
        self.onMousemove(event);
    }).mouseup(function(event) {
        self.onMouseup(event);
    });
    return div;
};

xyzon.XYGraphArea.prototype.onMousedown = function(event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.dragging) return;
    if (this.isAnyDetailShowing()) {
        this.removeAllDetail();
        return;
    }
    
    this.dragging = true;
    this.selector.start(event.pageX,
                        event.pageY);
    this.selector.show();
    $.each(this.graphItems, function(i, item) {
        item.inactivateTip();
    });
};

xyzon.XYGraphArea.prototype.isAnyDetailShowing = function() {
    return $.any(this.graphItems,
                 function(i, item) {
                     return item.isDetailShowing();
                 });
};

xyzon.XYGraphArea.prototype.removeAllDetail = function() {
    $.each(this.graphItems, function(i, item) {
        item.removeDetail();
    });
};

xyzon.XYGraphArea.prototype.onMousemove = function(event) {
    event.preventDefault();
    if (!this.dragging) return;
    this.selector.resizeTo(event.pageX,
                           event.pageY);
};

xyzon.XYGraphArea.prototype.onMouseup = function(event) {
    if (!this.dragging) return;
    this.dragging = false;
    this.selector.resizeTo(event.pageX,
                           event.pageY);
    var rect = this.selector.getRelativeRect();
    this.selector.hide();
    
    if (rect.width < 3 && rect.height < 3) {
        this.zoomOut();
    } else {
        this.zoomIn(
            new xyzon.Range(
                this.calcXValue(rect.getLeft()),
                this.calcXValue(rect.getRight())),
            new xyzon.Range(
                this.calcYValue(rect.getTop()),
                this.calcYValue(rect.getBottom())));
    }
    $.each(this.graphItems, function(i, item) {
        item.activateTip();
    });
};

xyzon.XYGraphArea.prototype.setLocationHash = function(xRange, yRange) {
    var params = [];
    $.each({
        x1: xRange ? xRange.first : null,
        x2: xRange ? xRange.last  : null,
        y1: yRange ? yRange.first : null,
        y2: yRange ? yRange.last  : null
    }, function(key, value) {
        if (value) {
            params.push(key + "=" + value);
        }
    });
    var url = location.href.split("#")[0];
    location.href = url + "#" + params.join("&");
};

xyzon.XYGraphArea.prototype.zoomIn = function(xRange, yRange) {
    this.rangeHistories.push({
        xAxisRange: this.xCurrentAxisRange,
        yAxisRange: this.yCurrentAxisRange
    });
    this.setCurrentAxisRange(xRange, yRange);
    //this.setLocationHash(xRange, yRange);
};

xyzon.XYGraphArea.prototype.zoomOut = function() {
    if (this.rangeHistories.length == 0) return;
    var ranges = this.rangeHistories.pop();
    if (this.rangeHistories.length == 0) {
        this.setCurrentAxisRange(this.xMaxAxisRange,
                                 this.yMaxAxisRange);
        //this.setLocationHash(null, null);
    } else {
        this.setCurrentAxisRange(ranges.xAxisRange,
                                 ranges.yAxisRange);
        //this.setLocationHash(ranges.xAxisRange, ranges.yAxisRange);
    }
};

xyzon.XYGraphArea.prototype.adjustGraphItems = function() {
    var self = this;
    $.each(this.graphItems, function(i, item) {
        item.animateMoveTo(
            self.calcXCoord(item.getPrice()),
            self.calcYCoord(item.getSalesRank())
        );
    });
};

xyzon.XYGraphArea.prototype.calcXValue = function(x) {
    if (this.xAxisIsLogScale) {
        return(
            Math.exp(
                this.xCurrentAxisRange.getLogFirst()
                    + (this.xCurrentAxisRange.getLogDifference()
                       * x / this.width)));
    } else {
        return(
            this.xCurrentAxisRange.first
                + (this.xCurrentAxisRange.getDifference()
                   * x / this.width));
    }
};

xyzon.XYGraphArea.prototype.calcYValue = function(y) {
    if (this.yAxisIsLogScale) {
        return(
            Math.exp(
                this.yCurrentAxisRange.getLogFirst()
                    + (this.yCurrentAxisRange.getLogDifference()
                       * y / this.height)));
    } else {
        return(
            this.yCurrentAxisRange.first
                + (this.yCurrentAxisRange.getDifference()
                   * y / this.height));
    }
};

xyzon.XYGraphArea.prototype.calcXCoord = function(value) {
    if (this.xAxisIsLogScale) {
        return(
            Math.round(
                this.width
                    * (Math.log(value)
                       - this.xCurrentAxisRange.getLogFirst())
                    / this.xCurrentAxisRange.getLogDifference()));
    } else {
        return(
            Math.round(
                this.width
                    * (value - this.xCurrentAxisRange.first)
                    / this.xCurrentAxisRange.getDifference()));
    }
},

xyzon.XYGraphArea.prototype.calcYCoord = function(value) {
    if (this.yAxisIsLogScale) {
        return(
            Math.round(
                this.height
                    * (Math.log(value)
                       - this.yCurrentAxisRange.getLogFirst())
                    / this.yCurrentAxisRange.getLogDifference()));
    } else {
        return(
            Math.round(
                this.height
                    * (value - this.yCurrentAxisRange.first)
                    / this.yCurrentAxisRange.getDifference()));
    }
};

xyzon.XYGraphArea.prototype.appendItem = function(graphItem) {
    this.graphItems.push(graphItem);
    graphItem.render(this.itemContainer);
    graphItem.moveTo(
        this.calcXCoord(graphItem.getPrice()),
        this.calcYCoord(graphItem.getSalesRank())
    );
};

xyzon.XYGraphArea.prototype.setMaxAxisRange = function(xRange, yRange) {
    var paddingRight = 100;
    var paddingBottom = 120;
    
    this.xMaxAxisRange = this.extendRange(xRange,
                                          paddingRight,
                                          this.width,
                                          this.xAxisIsLogScale);
    this.yMaxAxisRange = this.extendRange(yRange,
                                          paddingBottom,
                                          this.height,
                                          this.yAxisIsLogScale);
    if (this.rangeHistories.length == 0) {
        this.setCurrentAxisRange(xRange, yRange);
    }
};

xyzon.XYGraphArea.prototype.extendRange = function(range, lastPaddingPixel, lengthPixel, isLog) {
    if (isLog) {
        range.last = Math.exp(
            range.getLogLast()
                + (lastPaddingPixel
                   * range.getLogDifference()
                   / lengthPixel));
    } else {
        range.last =
            range.last
            + (lastPaddingPixel
               * range.getDifference()
               / lengthPixel);
    }
    return range;
};

xyzon.XYGraphArea.prototype.setCurrentAxisRange = function(xRange, yRange) {
    this.xCurrentAxisRange = xRange;
    this.yCurrentAxisRange = yRange;
    this.xAxisScale.setRange(xRange);
    this.yAxisScale.setRange(yRange);
    this.adjustGraphItems();
};
