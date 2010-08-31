goog.provide('xyzon.Axis');
goog.provide('xyzon.AxisType');

xyzon.AxisType = {
    SalesRank: 'SalesRank',
    Price: 'Price',
    ReleaseDate: 'ReleaseDate',
    Weight: 'Weight',
    TotalReviews: 'TotalReviews',
    AverageRating: 'AverageRating'
};

xyzon.Axis = function(type) {
    this.axisType = type;
};

xyzon.Axis.prototype.getUnit = function() {
    switch (this.axisType.toString()) {
    case xyzon.AxisType.SalesRank:
        return '位';
        break;
    case xyzon.AxisType.Price:
        return '円';
        break;
    case xyzon.AxisType.ReleaseDate:
        return '日前';
        break;
    case xyzon.AxisType.Weight:
        return 'Kg';
        break;
    case xyzon.AxisType.TotalReviews:
        return '件';
        break;
    case xyzon.AxisType.AverageRating:
        return '';
        break;
    }
    return '';
};

xyzon.Axis.prototype.getLabel = function() {
    switch (this.axisType) {
    case xyzon.AxisType.SalesRank:
        return '売れ筋';
        break;
    case xyzon.AxisType.Price:
        return '安い';
        break;
    case xyzon.AxisType.ReleaseDate:
        return '新しい';
        break;
    case xyzon.AxisType.Weight:
        return '軽い';
        break;
    case xyzon.AxisType.TotalReviews:
        return '少ない';
        break;
    case xyzon.AxisType.AverageRating:
        return '低い';
        break;
    }
    return '';
};

xyzon.Axis.prototype.isLogScale = function() {
    if (this.axisType.toString() === xyzon.AxisType.SalesRank) {
        return true;
    }
    return false;
};

xyzon.Axis.prototype.getScale = function(scaleMode) {
    var thick = (scaleMode == ScaleMode.HORIZONTAL) ? 34 : 100;
    return (this.isLogScale())
        ? new xyzon.LogAxisScale(thick, scaleMode, this.getUnit())
        : new xyzon.AxisScale(thick, scaleMode, this.getUnit())
};
