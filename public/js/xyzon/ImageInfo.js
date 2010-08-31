goog.provide('xyzon.ImageInfo');

xyzon.ImageInfo = function(item, type) {
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
};
