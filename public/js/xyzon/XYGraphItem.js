goog.provide('xyzon.XYGraphItem');
goog.require('xyzon.ImageInfo');
goog.require('xyzon.XYGraphDetail');

xyzon.XYGraphItem = function(itemElem) {
    this.item = $(itemElem);
    this.tipIsActive = true;
    this.image = this.createImage();
};

xyzon.XYGraphItem.prototype.getDetailPageURL = function() {
    return this.item.find("DetailPageURL").eq(0).text();
};

xyzon.XYGraphItem.prototype.getTitle = function() {
    return this.item.find("ItemAttributes > Title").eq(0).text();
};

xyzon.XYGraphItem.prototype.getAuthor = function() {
    return this.item.find("ItemAttributes > Author").eq(0).text() || "";
};

xyzon.XYGraphItem.prototype.getSummary = function() {
    return this.item.find("Summary").eq(0).text() || "";
};

xyzon.XYGraphItem.prototype.getContent = function() {
    return this.item.find("Content").eq(0).text() || "";
};

xyzon.XYGraphItem.prototype.getDateString = function() {
    return this.getPublicationDate()
        || this.getReleaseDate()
        || this.item.find("ItemAttributes > OriginalAirDate").eq(0).text()
        || this.item.find("ItemAttributes > OriginalReleaseDate").eq(0).text()
        || this.item.find("ItemAttributes > TheatricalReleaseDate").eq(0).text();
};

xyzon.XYGraphItem.prototype.getPublicationDate = function() {
    return this.item.find("ItemAttributes > PublicationDate").eq(0).text();
};

xyzon.XYGraphItem.prototype.getReleaseDate = function() {
    return this.item.find("ItemAttributes > ReleaseDate").eq(0).text();
};

xyzon.XYGraphItem.prototype.getPrice = function() {
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
};

xyzon.XYGraphItem.prototype.getTinyImageInfo = function() {
    return new xyzon.ImageInfo(this.item, "TinyImage");
};

xyzon.XYGraphItem.prototype.getMediumImageInfo = function() {
    return new xyzon.ImageInfo(this.item, "MediumImage");
};

xyzon.XYGraphItem.prototype.getLargeImageInfo = function() {
    return new xyzon.ImageInfo(this.item, "LargeImage");
};

xyzon.XYGraphItem.prototype.getRating = function() {
    return this.item.find("CustomerReviews > AverageRating").number() || 2.5;
};

xyzon.XYGraphItem.prototype.getTotalReviews = function() {
    return this.item.find("CustomerReviews > TotalReviews").integer() || 0;
};

xyzon.XYGraphItem.prototype.getSalesRank = function() {
    return this.item.find("SalesRank").integer();
};

xyzon.XYGraphItem.prototype.getSalesRankLog = function() { // Obsolete
    if (!this._salesRankLog) {
        this._salesRankLog = Math.log(this.getSalesRank());
    }
    return this._salesRankLog;
};

xyzon.XYGraphItem.prototype.getImageScale = function() {
    return (this.getTotalReviews() >= 2)
        ? this.getRating() / 5
        : 2.5 / 5;
};

xyzon.XYGraphItem.prototype.getReviewComments = function() {
    var comments = [];
    this.item.find("CustomerReviews > Review").each(function(index, elem) {
        comments.push({
            summary: $(elem).find("Summary").text(),
            content: $(elem).find("Content").text(),
            rating:  $(elem).find("Rating").number()
        });
    });
    return comments;
};

xyzon.XYGraphItem.prototype.createImage = function() { // Thumbnail Image
    var self = this;
    var thumb = this.getTinyImageInfo();
    ////var thumb = this.getMediumImageInfo();

    var w = Math.round(thumb.width  * self.getImageScale());
    var h = Math.round(thumb.height * self.getImageScale());

    var padding = 3;
    var container = $("<div/>").css({
        position: "absolute",
        left: 0,
        top: 0,
        cursor: "pointer",
        border: "2px solid #FFFFFF",
        "padding-left": padding,
        "padding-top":  padding,
        "padding-bottom": padding,
        width: w + padding,
        "min-width": 60,
        height: h + 12*2 + padding * 3,
        "background-color": "#DDDDDD",
        "z-index": self.getZIndex(),
        "line-height": "1em",
        overflow: "hidden"
    }).mouseover(function() {
        self.onMouseover();
    }).mouseout(function() {
        self.onMouseout();
    }).mousedown(function(event) {
        self.onMousedown(event);
    }).mousemove(function(event) {
        event.preventDefault();
    });

    var img = $("<img/>").attr({
        src: thumb.url
    }).css({
        width: w,
        height: h
    }).appendTo(container);

    var title = $("<span/>").text(
        this.getTitle()
    ).css({
        "font-size": 12,
        "line-height": 0
    }).appendTo(container);

    return container;
};

xyzon.XYGraphItem.prototype.highlight = function() {
    this.image.css({
        "z-index": 2000
    });
    this.image.css({
        "background-color": "#FF9933"
    });
};

xyzon.XYGraphItem.prototype.offlight = function() {
    var self = this;
    this.image.css({
        "z-index": self.getZIndex()
    });
    this.image.css({
        //"border-color": "#DDDDDD"
        "background-color": "#DDDDDD"
    });
};

xyzon.XYGraphItem.prototype.activateTip = function() {
    this.tipIsActive = true;
    this.image.css({
        cursor: "pointer"
    });
};

xyzon.XYGraphItem.prototype.inactivateTip = function() {
    this.tipIsActive = false;
    this.image.css({
        cursor: "crosshair"
    });
};

xyzon.XYGraphItem.prototype.isDetailShowing = function() {
    if (!this.detail) return false;
    return this.detail.isAlive;
};

xyzon.XYGraphItem.prototype.removeDetail = function() {
    if (this.detail) {
        this.detail.fadeoutAndRemove();
    }
};

xyzon.XYGraphItem.prototype.isTipRight = function() {
    return (this.image.offset().left < 400);
};

xyzon.XYGraphItem.prototype.createTip = function() { // Summary tip while mouseover
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
};

xyzon.XYGraphItem.prototype.getZIndex = function() {
    if (!this.getSalesRankLog()){
        return 0;
    }
    return Math.round(
        1000 * this.getImageScale()
            + 100 * (15 - this.getSalesRankLog())/15
    );
};

xyzon.XYGraphItem.prototype.appendTo = function(container) { // obsolete
    container.append(this.image);
};

xyzon.XYGraphItem.prototype.render = function(container) {
    goog.dom.appendChild(container, this.image.get(0));
};

xyzon.XYGraphItem.prototype.moveTo = function(x, y) {
    this.image.css({
        left: x,
        top: y
    });
};

xyzon.XYGraphItem.prototype.animateMoveTo = function(x, y) {
    this._x = x;
    this._y = y;
    var self = this;
    this.image.stop();
    this.image.animate({
        left: x,
        top: y
    }, {
        duration: "fast",
        complete: function() {
            ////self.moveRandom();
        }
    });
};

xyzon.XYGraphItem.prototype.moveRandom = function() {
    var self = this;
    setTimeout(function() {
        self.moveRandomLeft();
    }, 1000 + Math.random() * 5000);
};

xyzon.XYGraphItem.prototype.moveRandomLeft = function() {
    var self = this;
    this.image.animate({
        left: this._x - self.image.width() * Math.random(),
        top: this._y - self.image.height() * Math.random()
    }, {
        duration: "slow",
        complete: function() {
            setTimeout(function() {
                self.moveRandomRight();
            }, 1000 + Math.random() * 4000);
        }
    });
};

xyzon.XYGraphItem.prototype.moveRandomRight = function() {
    var self = this;
    this.image.animate({
        left: this._x,
        top: this._y
    }, {
        duration: "slow",
        complete: function() {
            setTimeout(function() {
                self.moveRandomLeft();
            }, 1000 + Math.random() * 4000);
        }
    });
};

xyzon.XYGraphItem.prototype.onMouseover = function() {
    /*
        if (!this.tipIsActive) return;
        if (this.tip) {
            this.tip.qtip("destroy");
            delete this.tip
        }
        this.tip = this.createTip();*/
    this.highlight();
};

xyzon.XYGraphItem.prototype.onMouseout = function() {
    this.offlight();
    /*
        if (this.tip) {
            this.tip.qtip("destroy");
            delete this.tip
        }*/
};

xyzon.XYGraphItem.prototype.onMousedown = function(event) {
    event.stopPropagation();
    //this.tip.qtip("hide");
    if (this.detail) {
        delete this.detail;
    }
    this.detail = new xyzon.XYGraphDetail(this);
};
