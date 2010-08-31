goog.provide('xyzon');

goog.require('goog.dom');
goog.require('goog.dom.forms');
goog.require('goog.style');
goog.require('goog.events');
goog.require('goog.array');
goog.require('xyzon.Console');
goog.require('xyzon.XYGraphArea');
goog.require('xyzon.AmazonSearch');

xyzon.main = function() {
    var xyGraphArea = new xyzon.XYGraphArea();
    new xyzon.AmazonSearch(xyGraphArea);
    initCategorySelection();
    xyzon.initAxisMenu(xyGraphArea);
}

/**
 * カテゴリメニューを切り替えると再検索
 */
function initCategorySelection() {
    $("form.search").each(function(i, formElem) {
        $(formElem).find("select[name='category']").change(
            function(event) {
                $(formElem).submit();
            });
    });
}

xyzon.initAxisMenu = function(xyGraphArea) {
    var xAxisMenu = goog.dom.getElement('x-axis-menu');
    goog.events.listen(
        xAxisMenu,
        goog.events.EventType.CHANGE,
        function(event) {
            var value = goog.dom.forms.getValue(xAxisMenu);
            $.log(value);
            xyGraphArea.switchXAxis(value);
        });

    var yAxisMenu = goog.dom.getElement('y-axis-menu');
    goog.events.listen(
        yAxisMenu,
        goog.events.EventType.CHANGE,
        function(event) {
            var value = goog.dom.forms.getValue(yAxisMenu);
            $.log(value);
            xyGraphArea.switchYAxis(value);
        });
};

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