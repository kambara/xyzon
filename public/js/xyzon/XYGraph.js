goog.provide('xyzon.XYGraph');

goog.require('xyzon.XYGraphArea');
goog.require('xyzon.XYGraphItem');

xyzon.XYGraph = function() {
    this.maxPrice = null;
    this.minPrice = null;
    this.maxSalesRank = null;
    this.minSalesRank = null;
    this.graphArea = new xyzon.XYGraphArea(goog.dom.getElement("graph-area"),
                                           false, true);
};

xyzon.XYGraph.prototype.addItem = function(itemXmlElem) {
    var graphItem = new xyzon.XYGraphItem(itemXmlElem);
    if (!graphItem.getSalesRank()) return;
    if (!graphItem.getPrice()) return;
    var priceChanged = this.updateMinMaxPrice(graphItem.getPrice());
    var salesRankChanged = this.updateMinMaxSalesRank(graphItem.getSalesRank());
    if (priceChanged || salesRankChanged) {
        this.graphArea.setMaxAxisRange(
            new xyzon.Range(this.minPrice, this.maxPrice),
            new xyzon.Range(this.minSalesRank, this.maxSalesRank)
        );
    }
    this.graphArea.appendItem(graphItem);
};

xyzon.XYGraph.prototype.updateMinMaxPrice = function(price) {
    var changed = false;
    if (this.minPrice == null
        || price < this.minPrice) {
        this.minPrice = price;
        changed = true;
    }
    if (this.maxPrice == null
        || price > this.maxPrice) {
        this.maxPrice = price;
        changed = true;
    }
    return changed;
};

xyzon.XYGraph.prototype.updateMinMaxSalesRank = function(salesRank) {
    var changed = false;
    if (this.minSalesRank == null
        || salesRank < this.minSalesRank) {
        this.minSalesRank = salesRank;
        changed = true;
    }
    if (this.maxSalesRank == null
        || salesRank > this.maxSalesRank) {
        this.maxSalesRank = salesRank;
        changed = true;
    }
    return changed;
};
