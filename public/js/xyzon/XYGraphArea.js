goog.provide('xyzon.XYGraphArea');

goog.require('goog.dom');
goog.require('goog.style');
goog.require('goog.math.Size');
goog.require('xyzon.XYGraphItem');
goog.require('xyzon.Range');
goog.require('xyzon.Selector');
goog.require('xyzon.AxisScale');
goog.require('xyzon.LogAxisScale');
goog.require('xyzon.Axis');
goog.require('xyzon.AxisType');

/**
 * ItemContainerとAxisScale(軸)を管理
 */
xyzon.XYGraphArea = function() {
    this.graphItems = [];

    this.xAxis = new xyzon.Axis(xyzon.AxisType.Price);
    this.yAxis = new xyzon.Axis(xyzon.AxisType.SalesRank);
    this.reset_();

    // ItemContainer
    this.itemContainer = this.createItemContainer().get(0);
    goog.dom.appendChild(document.body, this.itemContainer);

    // Selector
    this.selector = new xyzon.Selector();
    this.selector.hide();

    // Resize Event
    var self = this;
    goog.events.listen(
        window,
        goog.events.EventType.RESIZE,
        function(evt) {
            self.onWindowResize();
        });

    // 最後に整える
    this.onWindowResize();
};

xyzon.XYGraphArea.prototype.reset_ = function() {
    // Rangeなど初期化
    this.minXValue_ = null;
    this.maxXValue_ = null;
    this.minYValue_ = null;
    this.maxYValue_ = null;
    this.xMaxAxisRange = new xyzon.Range(0, 0);
    this.yMaxAxisRange = new xyzon.Range(0, 0);
    this.xCurrentAxisRange = new xyzon.Range(0, 0);
    this.yCurrentAxisRange = new xyzon.Range(0, 0);
    this.rangeHistories = [];

    // ラベル
    goog.dom.setTextContent(goog.dom.getElement('x-axis-label'),
                            this.xAxis.getLabel());
    goog.dom.setTextContent(goog.dom.getElement('y-axis-label'),
                            this.yAxis.getLabel());

    // 古いAxisScaleを消して作り直す
    if (this.xAxisScale) this.xAxisScale.remove();
    if (this.yAxisScale) this.yAxisScale.remove();
    this.xAxisScale = this.xAxis.getScale(ScaleMode.HORIZONTAL);
    this.yAxisScale = this.yAxis.getScale(ScaleMode.VERTICAL);

    // AxisRangeを再設定（初回は0個なので関係ない）
    var self = this;
    goog.array.forEach(
        this.graphItems,
        function(graphItem, index, array) {
            self.updateRangeAndMoveItem_(graphItem);
        });
}

/**
 * 軸を変更
 */
xyzon.XYGraphArea.prototype.switchXAxis = function(axisType) {
    delete this.xAxis;
    this.xAxis = new xyzon.Axis(axisType);
    this.reset_();
    this.onWindowResize();
};

xyzon.XYGraphArea.prototype.switchYAxis = function(axisType) {
    delete this.yAxis;
    this.yAxis = new xyzon.Axis(axisType);
    this.reset_();
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
            self.calcXCoord(item.getAxisValue(self.xAxis.axisType)),
            self.calcYCoord(item.getAxisValue(self.yAxis.axisType))
        );
    });
};

xyzon.XYGraphArea.prototype.calcXValue = function(x) {
    if (this.xAxis.isLogScale()) {
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
    if (this.yAxis.isLogScale()) {
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
    if (this.xAxis.isLogScale()) {
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
    if (this.yAxis.isLogScale()) {
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

xyzon.XYGraphArea.prototype.appendItem = function(itemXmlElem /*graphItem*/) {
    var graphItem = new xyzon.XYGraphItem(itemXmlElem);
    if (!graphItem.getPrice()) return; // 値段は必須
    //if (!graphItem.getSalesRank()) return; // これは必須でなくて良いかも
    //$.log('weight: '+graphItem.getWeightKg());
    //$.log(graphItem.getTotalReviews());

    this.graphItems.push(graphItem);
    graphItem.render(this.itemContainer);
    this.updateRangeAndMoveItem_(graphItem);
};

xyzon.XYGraphArea.prototype.updateRangeAndMoveItem_ = function(graphItem) {
    // 値が無効の商品（日付が不明など）は除外する
    if (graphItem.getAxisValue(this.yAxis.axisType)) {
        graphItem.show();
    } else {
        //$.log('除外 '+graphItem.getAxisValue(this.yAxis.axisType));
        graphItem.hide();
        return;
    }

    // Rangeを更新．Rangeを更新したら再描画
    var xValue = graphItem.getAxisValue(this.xAxis.axisType);
    var yValue = graphItem.getAxisValue(this.yAxis.axisType);
    this.updateRange_(xValue, yValue);
    graphItem.moveTo(
        this.calcXCoord(xValue),
        this.calcYCoord(yValue)
    );
};

xyzon.XYGraphArea.prototype.updateRange_ = function(xValue, yValue) {
    var xChanged = false;
    var yChanged = false;
    if (this.minXValue_ == null || xValue < this.minXValue_) {
        this.minXValue_ = xValue;
        xChanged = true;
    }
    if (this.maxXValue_ == null || xValue > this.maxXValue_) {
        this.maxXValue_ = xValue;
        xChanged = true;
    }
    if (this.minYValue_ == null || yValue < this.minYValue_) {
        this.minYValue_ = yValue;
        yChanged = true;
    }
    if (this.maxYValue_ == null || yValue > this.maxYValue_) {
        this.maxYValue_ = yValue;
        yChanged = true;
    }
    if (xChanged || yChanged) {
        this.setMaxAxisRange(
            new xyzon.Range(this.minXValue_, this.maxXValue_),
            new xyzon.Range(this.minYValue_, this.maxYValue_)
        );
    }
};

xyzon.XYGraphArea.prototype.setMaxAxisRange = function(xRange, yRange) {
    var paddingRight = 100;
    var paddingBottom = 120;
    
    this.xMaxAxisRange = this.extendRange(xRange,
                                          paddingRight,
                                          this.width,
                                          this.xAxis.isLogScale());
    this.yMaxAxisRange = this.extendRange(yRange,
                                          paddingBottom,
                                          this.height,
                                          this.yAxis.isLogScale());
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
