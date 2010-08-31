goog.provide('xyzon.Console');
goog.require('goog.debug.Console');
goog.require('goog.debug.LogRecord');
goog.require('goog.debug.Logger');
goog.require('goog.debug.Logger.Level');

xyzon.Console.info = function(text, loggerName) {
    var level = goog.debug.Logger.Level.INFO;
    var log = new goog.debug.LogRecord(level, text, loggerName);
    this.getConsole().addLogRecord(log);
}

xyzon.Console.getConsole = function() {
    if (!this._console) {
        this._console = new goog.debug.Console();
    }
    return this._console;
}