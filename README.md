
couchbone.js
============

AMD Module: Couchbone

A rewrite and simplification of jquery.couch.js combined with couch features for backbone.js

NOTE: Supports CouchDB 1.2+ only

Code and ideas from these other libs:
- Jan Monschke https://github.com/janmonschke/backbone-couchdb
- Andrzej Sliwa https://github.com/andrzejsliwa/backbone-couch
- Thomas Rampelberg https://github.com/pyronicide/backbone.couchdb.js

Couchbone - Module containing constructors for CouchDB connection and changes feed objects
Couchbone.DB - Factory which creates flyweight singletons (DbFly) for each unique db connection
	(Couchbone.DbFly - Flyweight objects for database specific services)
	(Couchbone.DbFly.prototype.admin - Admin functions are hidden in the 'admin' object within the prototype. e.g. mydb.admin.allDesignDocs())
Couchbone.ChangesFeed - CouchDB _changes publisher/subscribe service (use 'new')
	
Creates Couchbone.Model, Couchbone.Collection and Couchbone.CompositeCollection
  
Dependencies
------------

* [jQuery](http://www.jquery.com/)
* [Backbone.js](https://github.com/documentcloud/backbone) (>= 0.5.1)
* [Underscore.js](https://github.com/documentcloud/underscore)

Current features
----------------

- CRUD on models
- Couchdb's 'show' and 'update' functions supported
- Read on collections
- Composite couchdb views handled by CompositeCollection using simple ODM
- Changes feed by server side filter 
- Flyweight instances per database connection
- (TODO: generic 'by' filter supported semi-automatically)
- (TODO: Add support for a generic id filter in the "global feed handler")

Test Suite
----------


Usage
-----

