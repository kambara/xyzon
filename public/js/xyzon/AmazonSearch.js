goog.provide('xyzon.AmazonSearch');

goog.require('goog.events');
goog.require('goog.net.XhrIo');

xyzon.AmazonSearch = function(xyGraph) {
    this.maxPages = 10;
    this.loadedCount = 0;
    this.xyGraph = xyGraph;
    this.fetchAllPages(10);
};

xyzon.AmazonSearch.prototype.fetchAllPages = function() {
    for (var page=1; page <= this.maxPages; page++) {
        this.fetchAndParseXML(page);
    }
};

xyzon.AmazonSearch.prototype.fetchAndParseXML = function(page) {
    var self = this;
    goog.net.XhrIo.send(
        self.makeSearchURL(page),
        function(e) {
            var xhr = e.target;
            var xml = xhr.getResponseXml();
            self.parseXML(xml, page);
            self.onComplete();
        });
};

xyzon.AmazonSearch.prototype.onComplete = function() {
    this.loadedCount += 1;
    if (this.loadedCount >= this.maxPages) {
        $.log("Loaded");
    }
};

xyzon.AmazonSearch.prototype.parseXML = function(xml, page) {
    //$.log(xml);
    var items = $(xml).find("Items");
    if (items.find("Request > IsValid").text() == "False") {
        $.log("Invalid: page" + page);
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
        self.xyGraph.appendItem(this);
    });
};

xyzon.AmazonSearch.prototype.makeSearchURL = function(page) {
    var params = this.getLocationParams();
    return ([
        "/ajax/search",
        params["category"],
        params["keyword"],
        page.toString(),
        "xml"
    ]).join("/");
};

xyzon.AmazonSearch.prototype.getLocationParams = function() {
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
};
