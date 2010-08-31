# XYzon

## Install

XYzon requires [appengine-jruby](http://code.google.com/p/appengine-jruby/).

    $ sudo gem install google-appengine

## Run

    $ cd xyzon
    $ dev_appserver.rb .

## Upload to App Engine

Create an application id at [appspot.com](http://appengine.google.com/start/createapp).
Replace the application id in config.ru.

    $ appcfg.rb update .