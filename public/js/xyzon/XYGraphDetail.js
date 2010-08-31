goog.provide('xyzon.XYGraphDetail');

xyzon.XYGraphDetail = function(graphItem) {
    this.isAlive = true;
    this.graphItem = graphItem;
    this.image = this.appendImage(graphItem);
};

xyzon.XYGraphDetail.prototype.appendImage = function(graphItem) {
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
    var medium = graphItem.getLargeImageInfo();
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
};

xyzon.XYGraphDetail.prototype.isTipRight = function() {
    return (this.image.offset().left < 430);
};

xyzon.XYGraphDetail.prototype.appendTip = function(graphItem) { // Detail Tip
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
};

xyzon.XYGraphDetail.prototype.fadeoutAndRemove = function() {
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
};

xyzon.XYGraphDetail.prototype.remove = function() {
    if (!this.isAlive) return;
    if (this.tip) {
        this.tip.qtip("destroy");
    }
    if (this.image) {
        this.image.remove();
    }
    this.isAlive = false;
};
