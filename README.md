
couchbone.js
============

A backbone.js to couchdb connector and feed handler.  Uses the global namespace 'CouchBone'.

Some code and ideas taken from these other great connectors:

* Jan Monschke https://github.com/janmonschke/backbone-couchdb,
* Andrzej Sliwa https://github.com/andrzejsliwa/backbone-couch,
* Thomas Rampelberg https://github.com/pyronicide/backbone.couchdb.js


Extends Backbone.Model, Backbone.Collection, Backbone.sync and relies on a modified version
of jquery.couch.js (updated to handle 'show' and 'update' functions).
  
Dependencies
------------

* [Backbone.js](https://github.com/documentcloud/backbone) (>= 0.5.1)
* [Underscore.js](https://github.com/documentcloud/underscore)
* [jquery.couch.js *modified version included*] (https://github.com/apache/couchdb/blob/trunk/share/www/script/jquery.couch.js)
* [jQuery](http://www.jquery.com/)

Current features
----------------

- CRUD on models
- Couchdb's 'show' and 'update' functions supported through modified jquery.couch.js
- Read on collections
- Changes feed by server side filter (generic 'by' filter supported semi-automatically)
- One CouchBone instance per database connection


Bugs to be fixed and future features
--------------------------------------

- Add support for multiple db's with exactly same name (on dif. hosts) (its a simple factory ATM)
- Finish off code to support a "global feed handler" (set per db).  ATM its server filters only.
- Add support for a generic id filter in the "global feed handler"


Testing using the Jasmine couchapp
----------------------------------

See the README.md file in the jasmine/ directory


Usage
-----

Soon...*gulp*....

