/*
TODO:
- v0.1.0
  - XMLの同時ロード
- ズーム時どこにいるか
- 商品キープ（気になるチェック）
- 複数軸
- 戻る・進む (URL切り替え？複数グラフがあったときどうするか。あくまで補助的？)
- デザイン
- カテゴリ自動選択
*/

$(function() {
    $(".unselectable").unselectable();
    var xyGraph = new XYGraph(650, 500);
    new AmazonSearch(xyGraph);
    initCategorySelection();
});

function initCategorySelection() {
    $("form.search").each(function(i, formElem) {
        $(formElem).find("select[name='category']").change(
            function(event) {
                $(formElem).submit();
            });
    });
}

function AmazonSearch(xyGraph) {
    this.maxPages = 10;
    this.loadedCount = 0;
    this.xyGraph = xyGraph;
    this.fetchAllPages(10);
}
AmazonSearch.prototype = {
    fetchAllPages: function() {
        for (var page=1; page <= this.maxPages; page++) {
            this.fetchAndParseXML(page);
        }
    },
    
    fetchAndParseXML: function(page) {
        var self = this;
        $.ajax({
            type: "GET",
            url: self.makeSearchURL(page),
            dataType: "xml",
            success: function(xml) {
                self.parseXML(xml, page)
            },
            complete: function() {
                self.onComplete();
            }
        });
    },

    onComplete: function() {
        this.loadedCount += 1;
        if (this.loadedCount >= this.maxPages) {
            $.log("Loaded");
        }
    },

    parseXML: function(xml, page) {
        var items = $(xml).find("Items");
        if (items.find("Request > IsValid").text() == "False") {
            $.log("Invalid: page" + page);
            // TODO: Alert
            return;
        }
        var errors = items.find("Request > Errors");
        if (errors.length > 0) {
            errors.find("Error > Message").each(
                function(i, elem) {
                    $.log("page"+ page + ": " + $(elem).text());
                });
            return;
        }
        var self = this;
        items.find("Item").each(function() {
            self.xyGraph.addItem(this);
        });
    },

    makeSearchURL: function(page) {
        var params = this.getLocationParams();
        return ([
            "/ajax/search",
            params["category"],
            params["keyword"],
            page.toString(),
            "xml"
        ]).join("/");
    },

    getLocationParams: function() {
        if (location.search.length <= 1) return {};
        var pairs = location.search.substr(1).split("&");
        var params = {};
        for (var i=0; i<pairs.length; i++) {
            var pair = pairs[i].split("=");
            if (pair.length == 2) {
                params[pair[0]] = pair[1];
            }
        }
        return params;
    }
};

//
// XYGraph
//
function XYGraph(w, h) {
    this.maxPrice = null;
    this.minPrice = null;
    this.maxSalesRankLog = null;
    this.minSalesRankLog = null;
    this.graphArea = new XYGraphArea("#graph-area", w, h);
}
XYGraph.prototype = {
    addItem: function(itemXmlElem) {
        var graphItem = new XYGraphItem(itemXmlElem);
        if (!graphItem.getSalesRank()) return;
        if (!graphItem.getPrice()) return;
        var priceChanged = this.updateMinMaxPrice(graphItem.getPrice());
        var salesRankChanged = this.updateMinMaxSalesRankLog(graphItem.getSalesRankLog());
        if (priceChanged || salesRankChanged) {
            this.graphArea.setMaxAxisRange(
                new Range(this.minPrice, this.maxPrice),
                new Range(this.maxSalesRankLog, this.minSalesRankLog)
            );
        }
        this.graphArea.appendItem(graphItem);
    },

    updateMinMaxPrice: function(price) {
        var changed = false;
        if (this.minPrice == null
            || price < this.minPrice) {
            this.minPrice = price * 0.9;
            changed = true;
        }
        if (this.maxPrice == null
            || price > this.maxPrice) {
            this.maxPrice = price * 1.1;
            changed = true;
        }
        return changed;
    },

    updateMinMaxSalesRankLog: function(salesRank) {
        var changed = false;
        if (this.minSalesRankLog == null
            || salesRank < this.minSalesRankLog) {
            this.minSalesRankLog = salesRank;
            changed = true;
        }
        if (this.maxSalesRankLog == null
            || salesRank > this.maxSalesRankLog) {
            this.maxSalesRankLog = salesRank * 1.2;
            changed = true;
        }
        return changed;
    }
};

//
// XYGraphArea
//
function XYGraphArea(containerSelector, w, h) {
    this.width = w;
    this.height = h;
    this.xMaxAxisRange = new Range(0, 0);
    this.yMaxAxisRange = new Range(0, 0);
    this.xCurrentAxisRange = new Range(0, 0);
    this.yCurrentAxisRange = new Range(0, 0);
    this.rangeHistories = [];
    this.graphItems = [];

    var table = $("<table/>").css({
        "border-spacing": 0,
        "border-collapse": "collapse"
    }).appendTo(containerSelector);
    var tr1  = $("<tr/>").appendTo(table);
    var tr2  = $("<tr/>").appendTo(table);
    var td11 = this.td().appendTo(tr1);
    var td12 = this.td().appendTo(tr1);
    var td21 = this.td().appendTo(tr2);
    var td22 = this.td().appendTo(tr2);

    this.itemContainer = this.createItemContainer(w, h).appendTo(td11);
    this.xAxisScale = new XAxisScale(td21, w);
    this.yAxisScale = new YAxisScale(td12, h);

    var offset = $(containerSelector).offset();
    this.selector = new Selector(offset.left,
                                 offset.top,
                                 offset.left + w,
                                 offset.top + h);
    this.selector.hide();
}
XYGraphArea.prototype = {
    td: function() {
        return $("<td/>").css({
            padding: 0
        });
    },

    createItemContainer: function(w, h) {
        var self = this;
        var div = $("<div/>").unselectable().css({
            width: w,
            height: h,
            border: "1px solid #CCC",
            "background-color": "#FFF",
            position: "relative",
            cursor: "crosshair",
            overflow: "hidden",
            float: "left"
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
    },

    onMousedown: function(event) {
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
    },

    isAnyDetailShowing: function() {
        return $.any(this.graphItems,
                     function(i, item) {
                         return item.isDetailShowing();
                     });
    },

    removeAllDetail: function() {
        $.each(this.graphItems, function(i, item) {
            item.removeDetail();
        });
    },

    onMousemove: function(event) {
        event.preventDefault();
        if (!this.dragging) return;
        this.selector.resizeTo(event.pageX,
                               event.pageY);
    },

    onMouseup: function(event) {
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
                new Range(
                    this.calcXValue(rect.getLeft()),
                    this.calcXValue(rect.getRight())
                ),
                new Range(
                    this.calcYValue(rect.getBottom()),
                    this.calcYValue(rect.getTop())
                )
            );
        }
        $.each(this.graphItems, function(i, item) {
            item.activateTip();
        });
    },

    setLocationHash: function(xRange, yRange) {
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
    },

    zoomIn: function(xRange, yRange) {
        this.rangeHistories.push({
            xAxisRange: this.xCurrentAxisRange,
            yAxisRange: this.yCurrentAxisRange
        });
        this.setCurrentAxisRange(xRange, yRange);
        //this.setLocationHash(xRange, yRange);
    },

    zoomOut: function() {
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
    },

    adjustGraphItems: function() {
        var self = this;
        $.each(this.graphItems, function(i, item) {
            item.animateMoveTo(
                self.calcXCoord(item.getPrice()),
                self.calcYCoord(item.getSalesRankLog())
            );
        });
    },

    calcXValue: function(x) {
        return this.xCurrentAxisRange.first
            + (this.xCurrentAxisRange.getDifference()
               * x / this.width);
    },

    calcYValue: function(y) {
        return this.yCurrentAxisRange.first
            + (this.yCurrentAxisRange.getDifference()
               * (this.height - y) / this.height);
    },

    calcXCoord: function(value) {
        return(
            Math.round(
                this.width
                    * (value - this.xCurrentAxisRange.first)
                    / this.xCurrentAxisRange.getDifference()
            )
        );
    },

    calcYCoord: function(value) {
        return(
            Math.round(
                this.height
                    - (this.height
                       * (value - this.yCurrentAxisRange.first)
                       / this.yCurrentAxisRange.getDifference())
            )
        );
    },

    appendItem: function(graphItem) {
        this.graphItems.push(graphItem);
        this.itemContainer.append(graphItem);
        graphItem.appendTo(this.itemContainer);
        graphItem.moveTo(
            this.calcXCoord(graphItem.getPrice()),
            this.calcYCoord(graphItem.getSalesRankLog())
        );
    },

    setMaxAxisRange: function(xRange, yRange) {
        this.xMaxAxisRange = xRange;
        this.yMaxAxisRange = yRange;
        if (this.rangeHistories.length == 0) {
            this.setCurrentAxisRange(xRange, yRange);
        }
    },

    setCurrentAxisRange: function(xRange, yRange) {
        this.xCurrentAxisRange = xRange;
        this.yCurrentAxisRange = yRange;
        this.xAxisScale.setRange(xRange);
        this.yAxisScale.setRange(yRange);
        this.adjustGraphItems();
    }
};

//
// Selector
//
function Selector(left, top, right, bottom) {
    this.limitLeft = left;
    this.limitTop = top;
    this.limitRight = right;
    this.limitBottom = bottom;
    this.frame = this.createFrame().appendTo("body");
}
Selector.prototype = {
    show: function() {
        this.frame.show();
    },

    hide: function() {
        this.frame.hide();
    },

    createFrame: function() {
        var opacity = 0.3;
        return $("<div/>").unselectable().css({
            position: "absolute",
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            border: "1px solid #3333FF",
            "background-color": "#CCCCFF",
            filter: "alpha(opacity=" + (opacity*100) + ")", //IE
            "-moz-opacity": opacity, //FF
            opacity: opacity, // CSS3
            cursor: "crosshair",
            "z-index": 4000
        }).mousemove(function(event) {
            event.preventDefault();
        });
    },

    start: function(x, y) {
        this.startX = x;
        this.startY = y;
        this.frame.css({
            left: x,
            top:  y,
            width: 0,
            height: 0
        });
    },

    resizeTo: function(x, y) {
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
        this.frame.css({
            left: newX,
            top:  newY,
            width:  newWidth,
            height: newHeight
        });
    },

    getPageRect: function() {
        var offset = this.frame.offset();
        return new Rect(
            offset.left,
            offset.top,
            this.frame.width(),
            this.frame.height()
        );
    },

    getRelativeRect: function() {
        var offset = this.frame.offset();
        return new Rect(
            offset.left - this.limitLeft,
            offset.top - this.limitTop,
            this.frame.width(),
            this.frame.height()
        );
    }
};

//
// XYGraphItem
//
function XYGraphItem(itemElem) {
    this.item = $(itemElem);
    this.tipIsActive = true;
    this.image = this.createImage();
}
XYGraphItem.prototype = {
    getDetailPageURL: function() {
        return this.item.find("DetailPageURL").eq(0).text();
    },
    getTitle: function() {
        return this.item.find("ItemAttributes > Title").eq(0).text();
    },
    getAuthor: function() {
        return this.item.find("ItemAttributes > Author").eq(0).text() || "";
    },
    getSummary: function() {
        return this.item.find("Summary").eq(0).text() || "";
    },
    getContent: function() {
        return this.item.find("Content").eq(0).text() || "";
    },
    getDateString: function() {
        return this.getPublicationDate()
            || this.getReleaseDate()
            || this.item.find("ItemAttributes > OriginalAirDate").eq(0).text()
            || this.item.find("ItemAttributes > OriginalReleaseDate").eq(0).text()
            || this.item.find("ItemAttributes > TheatricalReleaseDate").eq(0).text();
    },
    getPublicationDate: function() {
        return this.item.find("ItemAttributes > PublicationDate").eq(0).text();
    },
    getReleaseDate: function() {
        return this.item.find("ItemAttributes > ReleaseDate").eq(0).text();
    },
    getPrice: function() {
        if (this._price) {
            return this._price;
        }
        var price = this.item.find("OfferSummary > LowestNewPrice > Amount").eq(0).integer();
        if (!price) {
            price = this.item.find("ItemAttributes > ListPrice > Amount").eq(0).integer();
        }
        if (!price) {
            price = this.item.find("OfferSummary > LowestUsedPrice > Amount").eq(0).integer();
        }
        this._price = price; // cache
        return price;
    },
    getTinyImageInfo: function() {
        return new ImageInfo(this.item, "TinyImage");
    },
    getMediumImageInfo: function() {
        return new ImageInfo(this.item, "MediumImage");
    },
    getRating: function() {
        return this.item.find("CustomerReviews > AverageRating").number() || 2.5;
    },
    getTotalReviews: function() {
        return this.item.find("CustomerReviews > TotalReviews").integer() || 0;
    },
    getSalesRank: function() {
        return this.item.find("SalesRank").integer();
    },
    getSalesRankLog: function() {
        if (!this._salesRankLog) {
            this._salesRankLog = Math.log(this.getSalesRank());
        }
        return this._salesRankLog;
    },
    getImageScale: function() {
        return (this.getTotalReviews() >= 2)
            ? this.getRating() / 5
            : 2.5 / 5;
    },
    getReviewComments: function() {
        var comments = [];
        this.item.find("CustomerReviews > Review").each(function(index, elem) {
            comments.push({
                summary: $(elem).find("Summary").text(),
                content: $(elem).find("Content").text(),
                rating:  $(elem).find("Rating").number()
            });
        });
        return comments;
    },

    createImage: function() { // Thumbnail Image
        var self = this;
        var thumb = this.getTinyImageInfo();
        return $("<img/>").attr({
            src: thumb.url
        }).css({
            position: "absolute",
            left: 0,
            top: 0,
            width:  Math.round(thumb.width  * self.getImageScale()),
            height: Math.round(thumb.height * self.getImageScale()),
            //display: "block",
            cursor: "pointer",
            border: "2px solid #FFFFFF",
            padding: 3,
            "background-color": "#DDDDDD",
            "z-index": self.getZIndex()
        }).mouseover(function() {
            self.onMouseover();
        }).mouseout(function() {
            self.onMouseout();
        }).mousedown(function(event) {
            self.onMousedown(event);
        }).mousemove(function(event) {
            event.preventDefault();
        });
    },

    highlight: function() {
        this.image.css({
            "z-index": 2000
        });
        this.image.css({
            "background-color": "#FF9933"
        });
    },

    offlight: function() {
        var self = this;
        this.image.css({
            "z-index": self.getZIndex()
        });
        this.image.css({
            //"border-color": "#DDDDDD"
            "background-color": "#DDDDDD"
        });
    },

    activateTip: function() {
        this.tipIsActive = true;
        this.image.css({
            cursor: "pointer"
        });
    },

    inactivateTip: function() {
        this.tipIsActive = false;
        this.image.css({
            cursor: "crosshair"
        });
    },

    isDetailShowing: function() {
        if (!this.detail) return false;
        return this.detail.isAlive;
    },

    removeDetail: function() {
        if (this.detail) {
            this.detail.fadeoutAndRemove();
        }
    },

    isTipRight: function() {
        return (this.image.offset().left < 400);
    },

    createTip: function() { // Summary tip while mouseover
        var self = this;
        var summaryHtml = ([this.getPrice() + "円",
                            "星" + this.getRating()
                            + "("
                            + this.getTotalReviews()
                            + "人)"
                           ]).join("<br />");
        var isRight = this.isTipRight();
        return this.image.qtip({
            content: {
                title: self.getTitle(),
                text: summaryHtml
            },
            style: {
                name: "dark",
                tip: {
                    corner: isRight ? "leftTop" : "rightTop"
                },
                border: {
                    radius: 3
                }
            },
            position: {
                corner: {
                    target:  isRight ? "rightTop" : "leftTop",
                    tooltip: isRight ? "leftTop" : "rightTop"
                },
                adjust: {
                    y: 10
                }
            },
            show: {
                ready: true,
                delay: 0
            },
            api: {
                beforeShow: function() {
                    return self.tipIsActive;
                }
            }
        });
    },

    getZIndex: function() {
        if (!this.getSalesRankLog()){
            return 0;
        }
        return Math.round(
            1000 * this.getImageScale()
                + 100 * (15 - this.getSalesRankLog())/15
        );
    },

    appendTo: function(container) {
        container.append(this.image);
    },

    moveTo: function(x, y) {
        this.image.css({
            left: x,
            top: y
        });
    },

    animateMoveTo: function(x, y) {
        this.image.animate({
            left: x,
            top: y
        }, "fast");
    },

    onMouseover: function() {
        if (!this.tipIsActive) return;
        if (this.tip) {
            this.tip.qtip("destroy");
            delete this.tip
        }
        this.tip = this.createTip();
        this.highlight();
    },

    onMouseout: function() {
        this.offlight();
        if (this.tip) {
            this.tip.qtip("destroy");
            delete this.tip
        }
    },

    onMousedown: function(event) {
        event.stopPropagation();
        this.tip.qtip("hide");
        if (this.detail) {
            delete this.detail;
        }
        this.detail = new XYGraphDetail(this);
    }
};

//
// XYGraphDetail
//
function XYGraphDetail(graphItem) {
    this.isAlive = true;
    this.graphItem = graphItem;
    this.image = this.appendImage(graphItem);
}
XYGraphDetail.prototype = {
    appendImage: function(graphItem) {
        var self = this;
        var offset = graphItem.image.offset();
        var thumb = graphItem.getTinyImageInfo();
        var image = $("<img/>").attr({
            src: thumb.url
        }).css({
            position: "absolute",
            left: offset.left,
            top:  offset.top,
            width:  graphItem.image.width(),
            height: graphItem.image.height(),
            padding: graphItem.image.css("padding"),
            "background-color": graphItem.image.css("background-color"),
            border: graphItem.image.css("border"),
            "z-index": 3000
        }).mousemove(function(event) {
            event.preventDefault();
        }).appendTo("body");

        // animate
        var medium = graphItem.getMediumImageInfo();
        image.animate({
            left: offset.left - (medium.width - graphItem.image.width())/2,
            top: offset.top - (medium.height - graphItem.image.height())/2,
            width:  medium.width,
            height: medium.height
        }, "fast", null, function() {
            self.tip = self.appendTip(graphItem);
            image.attr({
                src: medium.url
            });
        });
        return image;
    },

    isTipRight: function() {
        return (this.image.offset().left < 430);
    },

    appendTip: function(graphItem) { // Detail Tip
        var self = this;
        var reviewHtml = $.map(
            graphItem.getReviewComments(),
            function(comment) {
                return (['<div style="border-bottom: 1px solid #333; padding:0.5em;">',
                         "<b>",
                         comment["summary"],
                         "</b>",
                         "<br/>",
                         comment["content"],
                         "</div>"
                        ]).join("");
            }).join("");
        var summaryHtml = ([
            graphItem.getPrice() + "円",
            "星 " + graphItem.getRating()
                + " ("
                + graphItem.getTotalReviews()
                + "人)",
            "ランキング：" + graphItem.getSalesRank() + "位",
            "発売日：" + (graphItem.getDateString() || "?"),
            '<div style="max-height:240px; overflow:auto; border-top: 2px solid #333; font-size:90%;">'
                + reviewHtml
                + "</div>"
        ]).join("<br />");

        var isRight = this.isTipRight();
        var tip = this.image.qtip({
            content: {
                title:
                    '<a href="'
                    + graphItem.getDetailPageURL()
                    + '" target="_blank" style="color:#FFFFFF">'
                    + graphItem.getTitle()
                    + '</a>',
                text: summaryHtml
            },
            style: {
                name: "dark",
                tip: {
                    corner: isRight ? "leftTop" : "rightTop"
                },
                border: {
                    radius: 3
                },
                width: {
                    max: 400
                },
                title: {
                    "font-size": "110%"
                },
                button: {
                    "font-size": "100%"
                }
            },
            position: {
                corner: {
                    target: isRight ? "rightTop" : "leftTop",
                    tooltip: isRight ? "leftTop" : "rightTop"
                },
                adjust: {
                    y: 10
                }
            },
            show: {
                ready: true,
                delay: 0
            },
            hide: {
                delay: 1000,
                fixed: true
            },
            api: {
                onHide: function() {
                    self.image.css({
                        "border-color": "#DDDDDD"
                    });
                    var offset = graphItem.image.offset();
                    self.image.animate({
                        left: offset.left,
                        top: offset.top,
                        width:  graphItem.image.width(),
                        height: graphItem.image.height()
                    }, "fast", null, function() {
                        self.fadeoutAndRemove();
                    });
                }
            }
        }).qtip("show");

        tip.qtip("api").elements.tooltip.selectable();
        tip.qtip("api").elements.tooltip.mousedown(function(event) {
            event.stopPropagation();
        });

        return tip;
    },

    fadeoutAndRemove: function() {
        if (!this.isAlive) return;
        var self = this;
        if (this.tip) {
            this.tip.qtip("destroy");
        }
        this.image.css({
            "background-color": "#DDDDDD"
        });
        var offset = this.graphItem.image.offset();
        this.image.animate({
            left: offset.left,
            top:  offset.top,
            width:  self.graphItem.image.width(),
            height: self.graphItem.image.height()
        }, "fast", null, function() {
            self.remove();
        });
    },

    remove: function() {
        if (!this.isAlive) return;
        if (this.tip) {
            this.tip.qtip("destroy");
        }
        if (this.image) {
            this.image.remove();
        }
        this.isAlive = false;
    }
};


var ScaleMode = {
    HORIZONTAL: 1,
    VERTICAL:   2
};

/**
 * AxisScale
 * Abstract Class
 */
function AxisScale(container, w, h, scaleMode, isLog) {
    this.markColor = "#CCCCCC";
    this.width = w;
    this.height = h;
    this.scaleMode = scaleMode || ScaleMode.HORIZONTAL;
    this.isLog = isLog || false;
    this.textClassName = "_canvas_text_";
    
    this.innerContainer = $("<div/>").css({
        width: w,
        height: h,
        position: "relative"
    }).appendTo(container);

    // Init canvas
    var canvas = $("<canvas/>").attr({
        width: w,
        height: h
    }).appendTo(this.innerContainer);

    this.ctx = this.getContext(canvas.get(0));
}
AxisScale.prototype = {
    isHorizontal: function() {
        return (this.scaleMode == ScaleMode.HORIZONTAL);
    },

    hv: function(hValue, vValue) {
        return this.isHorizontal()
            ? hValue
            : vValue;
    },

    getScaleLength: function() {
        return this.hv(
            this.width,
            this.height);
    },

    getContext: function(canvasElem) {
        if (typeof(G_vmlCanvasManager) != 'undefined') { // IE
            canvasElem = G_vmlCanvasManager.initElement(canvasElem);
        }
        return canvasElem.getContext('2d');
    },

    appendText: function(text, pos, offset) {
        if (pos < 0) return;
        if (pos > this.getScaleLength()) return;

        var self = this;
        var span = $("<span/>").text(text).attr({
            "class": self.textClassName
        }).css({
            position: "absolute",
            left: self.hv(pos,    offset),
            top:  self.hv(offset, pos),
            "font-size": 13,
            color: "#666666"
        });
        this.innerContainer.append(span);
    },

    removeAllTexts: function() {
        this.innerContainer.find(
            "span." + this.textClassName
        ).remove();
    },

    setRange: function(range) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.removeAllTexts();
        var labeledNumberTable = {};

        var num100000Marks = this.drawMarks(range,
                                            100000,
                                            5,
                                            18,
                                            true,
                                            labeledNumberTable);
        if (num100000Marks <= 4) {
            var num10000Marks = this.drawMarks(range,
                                               10000,
                                               3,
                                               14,
                                               (num100000Marks <= 1),
                                               labeledNumberTable);
            if (num10000Marks <= 4) {
                this.drawMarks(range,
                               1000,
                               1,
                               8,
                               (num10000Marks <= 1),
                               labeledNumberTable);
            }
        }
    },

    drawMarks: function(range, unit,
                        lineWidth,
                        lineLength,
                        labelIsShown,
                        labeledNumberTable) {
        var interval = unit * this.getScaleLength() / range.getDifference();
        var rightScaleValue = Math.floor(range.last / unit) * unit;
        var rightOffset = interval * (range.last - rightScaleValue) / unit;
        var count = 0;
        while (true) {
            var pos = this.getScaleLength() - rightOffset - interval * count;
            if (pos < 0) break;
            this.drawMark(pos, lineWidth, lineLength);
            if (labelIsShown) {
                var value = rightScaleValue - unit * count;
                if (!labeledNumberTable[value]) {
                    this.appendText(value.toString(),
                                    pos,
                                    lineLength);
                    labeledNumberTable[value] = true;
                }
            }
            count++;
        }
        return count;
    },

    drawMark: function(pos, lineWidth, lineLength) {
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
    },

    drawLine: function(x1, y1, x2, y2, lineWidth, lineLength) {
        this.ctx.strokeStyle = "#CCCCCC";
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }
};

//
// XAxisScale
//
var XAxisScale = extend(
    AxisScale,
    function(containerSelector, w) {
        this.base(containerSelector, w, 34);
    },
    {
    }
);

var YAxisScale = extend(
    AxisScale,
    function(container, h) {
        this.base(container, 100, h, ScaleMode.VERTICAL, true);
    },
    {
        getLogPos: function(value, range) {
            return(
                (Math.log(value) - range.last)
                    * this.getScaleLength() / (range.first - range.last)
            );
        },

        setRange: function(range) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            this.removeAllTexts();
            for (var i=0; i<=6; i++) {
                var value = Math.pow(10, i);
                var pos = this.getLogPos(value, range);
                if (pos > this.getScaleLength()) return;
                this.drawMark(pos, 3, 14);
                this.appendText(value.toString(), pos-4, 14);

                for (var j=2; j<=9; j++) {
                    var value2 = value * j;
                    var pos2 = this.getLogPos(value2, range);
                    if (pos2 > this.getScaleLength()) return;
                    this.drawMark(pos2, 1, 8);
                    if (j <= 4) {
                        this.appendText(value2.toString(), pos2-4, 8);
                    }
                }
            }
        }
    }
);


//
// Extend jQuery
//
jQuery.fn.extend({
    integer: function() {
        return parseInt(this.text());
    },

    number: function() {
        return parseFloat(this.text());
    },

    unselectable: function() {
        return this.each(function() {
            $(this).attr({
                unselectable: "on" // IE
            }).css({
                "-moz-user-select": "none",
                "-khtml-user-select": "none",
                "-webkit-user-select": "none",
                "user-select": "none" // CSS3
            });
        });
    },

    selectable: function() {
        return this.each(function() {
            $(this).attr({
                unselectable: "off" // IE
            }).css({
                "-moz-user-select": "auto",
                "-khtml-user-select": "auto",
                "-webkit-user-select": "auto",
                "user-select": "auto" // CSS3
            });
        });
    }
});

jQuery.log = function(obj) {
    if (window.console) {
        console.log(obj);
    }
}

jQuery.any = function(array, callback) {
    for (var i=0; i<array.length; i++) {
        if (callback.call(this, i, array[i])) {
            return true;
        }
    }
    return false
}

jQuery.min = function(a, b) {
    if (a < b) return a;
    return b;
}

//
// Range
//
function Range(first, last) {
    this.first = first;
    this.last = last;
}
Range.prototype = {
    getDifference: function() {
        return this.last - this.first;
    },

    toString: function() {
        return this.first + " " + this.last;
    }
};

//
// Point
//
function Point(x, y) {
    this.x = x;
    this.y = y;
}
Point.prototype = {
    subtract: function(p) {
        return new Point(this.x - p.x,
                         this.y - p.y);
    }
};

//
// Rect
//
function Rect(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}
Rect.prototype = {
    getLeft: function() {
        return this.x;
    },

    getTop: function() {
        return this.y;
    },

    getRight: function() {
        return this.x + this.width;
    },

    getBottom: function() {
        return this.y + this.height;
    }
};

//
// ImageInfo
//
function ImageInfo(item, type) {
    var image = item.find(type).eq(0);
    this.url = image.find("URL").text();
    if (this.url) {
        this.width  = image.find("Width").integer();
        this.height = image.find("Height").integer();
    } else {
        this.url    = "/img/noimage.jpg";
        this.width  = 64;
        this.height = 42;
    }
}


/**
 * extend function
 * <http://plusb.jp/blog/?p=102>
 * @param {Object}   s superclass
 * @param {Function} c constructor
 * @param {Object}   m methods
 * @return Constructor
 */
function extend(s, c, m) {
    function f(){};
    f.prototype = s.prototype;
    c.prototype = new f();
    c.prototype.__super = s.prototype;
    c.prototype.__super.constructor = s;
    c.prototype.constructor = c;
    c.prototype.base = function() {
      var ob = this.base;
      this.base = s.prototype.base;
      s.apply(this, arguments);
      if( this.constructor == c) {
          delete this.base;
      } else {
          this.base = ob;
      }
    }
    //属性を拡張
    for (var n in m) {
        c.prototype[n] = m[n];
    }
    return c;
}