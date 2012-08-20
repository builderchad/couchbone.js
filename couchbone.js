/*  AMD Module: Couchbone

 	A rewrite and simplification of jquery.couch.js combined with couch features for backbone.js
	By: C. Thatcher under MIT license
	Original jquery.couch.js source by Dale Harvey (unknown license)
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
	
	Future plans are to possibly use Promise/A from jquery for some things and expand on the doc versioning some more.
	
	//// var xhr = (this.sync || Backbone.sync).call(this, method, this, options);
	/// inlined base64 library: Copyright (C) 1999 Masanao Izumo, modifications by Chris Anderson, Dan Webb
	// var Base64={};
	/ (function(e){var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",n=[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1];e.encode=function(e){var n,i,s,o,u,a;s=r(e),i=0,n=[];while(i<s){o=e.charCodeAt(i++)&255;if(i==s){n.push(t.charCodeAt(o>>2)),n.push(t.charCodeAt((o&3)<<4)),n.push("=".charCodeAt(0)),n.push("=".charCodeAt(0));break}u=e.charCodeAt(i++);if(i==s){n.push(t.charCodeAt(o>>2)),n.push(t.charCodeAt((o&3)<<4|(u&240)>>4)),n.push(t.charCodeAt((u&15)<<2)),n.push("=".charCodeAt(0));break}a=e.charCodeAt(i++),n.push(t.charCodeAt(o>>2)),n.push(t.charCodeAt((o&3)<<4|(u&240)>>4)),n.push(t.charCodeAt((u&15)<<2|(a&192)>>6)),n.push(t.charCodeAt(a&63))}var e="";return n.forEach(function(t){e+=String.fromCharCode(t)}),e},e.decode=function(e){var t,i,s,o,u,a,f;a=r(e),u=0,f=[];while(u<a){do t=n[e.charCodeAt(u++)&255];while(u<a&&t==-1);if(t==-1)break;do i=n[e.charCodeAt(u++)&255];while(u<a&&i==-1);if(i==-1)break;f.push(String.fromCharCode(t<<2|(i&48)>>4));do{s=e.charCodeAt(u++)&255;if(s==61)return f.join("");s=n[s]}while(u<a&&s==-1);if(s==-1)break;f.push(String.fromCharCode((i&15)<<4|(s&60)>>2));do{o=e.charCodeAt(u++)&255;if(o==61)return f.join("");o=n[o]}while(u<a&&o==-1);if(o==-1)break;f.push(String.fromCharCode((s&3)<<6|o))}return f.join("")};var r=function(e){return e.length!==undefined?e.length:e.getLength!==undefined?e.getLength():undefined}})(Base64);
	
*/
require.config( {
    couchbone: { "prefix": "http://localhost:5984" }
});

define(["module", "underscore", "jquery", "backbone"], function(module, _, $, Backbone) {

	DELETE  = "DELETE";
	POST 	= "POST";
	HEAD	= "HEAD";
	PUT 	= "PUT";
	GET 	= "GET";

	Couchbone = {
		prefix: (module.config().prefix || "http://localhost:5984"),
		ajax: ax,
		encodeID: encodeID,
		session: session,
		signup: signup,
		login: login,
		logout: logout,
		tasks: tasks,
		dbs: dbs,
		config: config 
	};
	
	var flyweights = {};
	
	function ax(settings, callbacks, headers) {
		headers = headers || {}
		var ax;
		var callOptions = {
			dataType    : "json",
			type		: settings.type || GET,
			contentType : settings.contentType || "application/json; charset=UTF-8",
			beforeSend  : function(xhr) {
				xhr.setRequestHeader("Accept", "application/json");
				_.each(_.keys(headers), function(hkey) { xhr.setRequestHeader(hkey, headers[hkey]); });
			}
		};
		_.extend(callOptions, _.pick(settings, 'data', 'url'));
		ax = $.ajax(callOptions);
		if (callbacks) {
			if (callbacks.fail || callbacks.error)	{ ax.fail(callbacks.fail ? callbacks.fail : callbacks.error); }
			if (callbacks.done || callbacks.success) { ax.done(callbacks.done ? callbacks.done : callbacks.success); }
			if (callbacks.always || callbacks.complete) { ax.always(callbacks.always ? callbacks.always : callbacks.complete); }
		}
		return ax;
	}

	function slash() { return [].join.call(arguments, '/'); }
	function ripPrefix(options) {
		var prefix;		
		if (options['prefix']) {
			prefix = options['prefix'];
			delete options['prefix'];
		} else {
			prefix = Couchbone.prefix;
		}
		return prefix;
	}
	function encodeID(docID) {
		var matches;
		return (matches = docID.match(/^_design\/(.+)/)) ? '_design/' + encodeURIComponent(matches[1]) : encodeURIComponent(docID);
	}
	function stringify(obj) {
		return obj !== null ? JSON.stringify(obj) : null;
	}
	function encodeOptions(options) {
		var buf = [];
		if (typeof(options) === 'object' && options !== null) {
			for (var name in options) {
				if (name.match(/^(error|success|beforeSuccess|ajaxStart)$/)) { continue; }
				var value = options[name];
				if (name.match(/^(key|startkey|endkey)$/)) { value = stringify(value); }
				buf.push(encodeURIComponent(name) + '=' + encodeURIComponent(value));
			}
		}
		return buf.length ? '?' + buf.join('&') : '';
	}
	function session(prefix, options) {
		options = options || {};
		prefix = prefix || Couchbone.prefix;
		var req = { url: prefix + "/_session", type: GET };
		if (options.name && options.password) {
			req.type = (options.name === '_' ? DELETE : POST);
			req.data = { name: options.name, password: options.password };
			req.contentType = "application/x-www-form-urlencoded; charset=UTF-8";
		}
		return ax(req, _.pick(options, 'done', 'fail', 'always', 'success', 'error', 'complete'));
	}
	function signup(user_doc, options) {
		// options = options || {};
		// user_doc._id = user_doc._id || user_doc.name;
		// user_doc.type = "user";
		// if (!user_doc.roles) { user_doc.roles = []; }
		// return session(Couchbone.prefix, {
		// 	success : function(resp) {
		// 		var db = new Couchbone.DB(resp.info.authentication_db);
		// 		db.saveDoc(user_doc, options);
		// 	}
		// });
	}
	function login(name, password, options) {
		options = options || {};
		return session(ripPrefix(options), _.extend(options, { name: name, password: password }));
	}
	function logout(options) {
		options = options || {};
		return session(ripPrefix(options), _.extend(options, { name : "_", password : "_" }));
	}
	function sync(method, model, callbacks) { model['couchbone_' + method](callbacks); }	
	function getValue(object, prop) {
		if (!(object && object[prop])) return null;
		return _.isFunction(object[prop]) ? object[prop]() : object[prop];
	}
	function dbConnectionError() {
		throw new Error("Couchbone.Model requires a 'db' (DbFly) object or must belong to a Couchbone.Collection which has one");
	}
	function tasks(options) {
		return ax({ url: ripPrefix(options) + "/_active_tasks"}, _.pick(options, 'done', 'fail', 'always', 'success', 'error', 'complete'));
	}
	function dbs(options) {
		return ax({ url: ripPrefix(options) + "/_all_dbs" }, _.pick(options, 'done', 'fail', 'always', 'success', 'error', 'complete'));
	}
	function config(options, section, option, value) {
		var req = {	url: ripPrefix(options) + "/_config/" + 
			(section ? encodeURIComponent(section) + '/' + (option ? encodeURIComponent(option) : '') : '')
		};
		if (value === null) {
			req.type = DELETE;
		} else if (value !== undefined) {
			req.type = PUT;
			req.data = stringify(value);
		}
		return ax(req, _.pick(options, 'done', 'fail', 'always', 'success', 'error', 'complete'));
	}

	Couchbone.ChangesFeed = function(db_or_uri, feed_options) {
		if (!(this instanceof Couchbone.ChangesFeed)) { throw(new Error("Error: Must use 'new' to instantiate ChangesFeed")); }
		this.db = ((db_or_uri instanceof Couchbone.DbFly) ? db_or_uri :	Couchbone.DB(db_or_uri));
		this.timeout = 100;
		this.active = true;
		this.handlers = [];
		var self = this;

	 	function triggerListeners(results) {
			_.each(self.handlers, function(handler) { handler(results); });
		}

		function getChangesSince() {
			return ax({ url: self.db.uri('/_changes') + encodeOptions(feed_options) }, { done: changesSuccess, fail: changesError });
        }

		function changesSuccess(resp) {
			self.timeout = 100;
			if (self.active) {
				feed_options.since = resp.last_seq;
				triggerListeners(resp.results);
				getChangesSince();
			}
		}

		function changesError() {
			if (self.timeout > 10000) { throw(new Error("Couchbone _changes feed error - too many timeouts")); }
			if (self.active) {
				setTimeout(getChangesSince, self.timeout);
				self.timeout = self.timeout * 2;
			}
		}

		_.extend(feed_options, { heartbeat : 10000, feed : 'longpoll' });	
		this.db.info({
			done : function(info) {
				feed_options.since = info.update_seq;
				getChangesSince();
			}
		});

	}

	Couchbone.ChangesFeed.prototype = {
		addHandler: function(fun) { this.handlers.push(fun); return this; },
		stop : function() { this.active = false; },
	}
	
	Couchbone.DbFly = function(uri) {
		var _uri = uri;
		this.uri = function(postfix) { return (postfix ? _uri + postfix : _uri); }
	};
	
	Couchbone.DbFly.prototype = {
		
        info: function(callbacks) {
			return ax({ url: this.uri() }, callbacks);
        },

		head: function(id, callbacks) {
			return ax({ type: HEAD, url: this.uri() + '/' + encodeID(id) }, callbacks);
		},

        get: function(id, settings, callbacks) {
			settings = settings || {};
			// TODO: handle _show properly
			// TODO: hand _pick settings
			return ax({ url: (settings.show || this.uri()) + '/' + encodeID(id) + encodeOptions(settings) }, callbacks);
        },

        save: function(doc, settings, callbacks) {
			options = options || {};
			var req = { url: settings.update || this.uri(), type: POST, data: stringify(doc) };
			var headers = {};

			//TODO: handle _update properly
			// type = 'PUT'; //.... }
			// xhr.setRequestHeader('Accept', '*/*');
			if (!_.isUndefined(options.ensure_full_commit)) {
				headers["X-Couch-Full-Commit"] = options.ensure_full_commit.toString();
			}
			if (!_.isUndefined(doc._id)) {
				req.type = PUT;
				req.url += '/' + encodeID(doc._id);
			}
			return ax(req, callbacks, headers);			
		},

        remove: function(doc) {
			return ax({ type: DELETE, url: slash(this.uri(), encodeID(doc._id)) + encodeOptions({ rev: doc._rev }) });
        },

		removeAttachment: function(doc, att) {
			return ax({ type: DELETE, url: slash(this.uri(), encodeID(doc._id), att) + encodeOptions({ rev: doc._rev }) });
		},

		view: function(view, settings, callbacks) {
			settings = settings || {};
			var req = { url: this.uri('/_design/' + view), type: GET };
			if (settings["keys"]) {
				req.type = POST;
				req.data = stringify({ "keys": settings["keys"] });
			}
			req.url += encodeOptions(_.pick(settings, 'key', 'startkey', 'startkey_docid', 'endkey', 'endkey_docid', 
				'limit', 'stale', 'descending', 'skip', 'group', 'group_level', 'reduce', 
				'include_docs', 'inclusive_end', 'update_seq'));
			return ax(req, callbacks);
        },

        allDocs: function(settings, callbacks) {
			settings = settings || {};
			var req = { url: this.uri('/_all_docs'), type: GET };
			
			if (settings["keys"]) {
				req.type = POST;
				req.data = stringify({ "keys": settings["keys"] });
				req.url += encodeOptions(_.pick(settings, 'include_docs'));
			} else {
				req.url += encodeOptions(_.pick(settings, 'include_docs', 'startkey', 'endkey'));
			}
			return ax(req, callbacks);
        },
// cb = require("couchbone");
// v = cb.DB('ww1');
// resp = { success: function(resp) { console.log("yay:", resp); }, error: function(resp) { console.log("boo:", resp); } }
// v.allDocs({}, resp);
// v.allDesignDocs({}, resp);

        allDesignDocs: function(settings, callbacks) {
			settings = settings || {};
			return this.allDocs(_.extend({ startkey: "_design", endkey: "_design0" }, settings), callbacks);
        },

		compact: function(callbacks) {
			return ax({ type: POST, url: this.uri('/_compact') }, callbacks);
		},

        compactView: function(viewName, callbacks) {
			return ax({ type: POST, url: this.uri('/_compact/') + viewName }, callbacks);
        },

        viewCleanup: function(callbacks) {
			return ax({ type: POST, url: this.uri('/_view_cleanup') }, callbacks);
        },

        create: function(callbacks) {
			return ax({ type: PUT, url: this.uri() }, callbacks);
        },

        drop: function(callbacks) {
			return ax({ type: DELETE, url: this.uri() }, callbacks);
        }

	};


	// DbFly flyweight factory
	Couchbone.DB = function(name) {
		var matches, uri;
		if (matches = name.match(/^((https?:\/\/)?[-_\.\d\w]+(:[0-9]+)?\/[-+_\(\)\/\$\d\w]+)\/?$/)) {
			uri = matches[1];
		} else if (matches = name.match(/^([-+_\(\)\/\$\d\w]+)\/?$/)) {
			uri = Couchbone.prefix + '/' + matches[1];
		} else {
			throw('Must supply a database name or full database uri (e.g. http://host.name.com:5984/dbname)');
		}
		if (flyweights[uri]) {
			return flyweights[uri];
		} else {
			return (flyweights[uri] = new Couchbone.DbFly(uri));
		}
	};
	
	if (Backbone.Model) {


		Couchbone.Model = Backbone.Model.extend({

			idAttribute: '_id',
			sync: sync,
			db: null,		
			
			constructor: function(attributes, options) {
				Backbone.Model.prototype.constructor.call(this, attributes, options);
				if (options && options.db) this.db = options.db;
			},

			url: function() {
				var base;
				db = db || getValue(this.collection, 'db') || dbConnectionError()
				base = db.uri();
				if (this.isNew()) return base;
      			return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
			},
			
			couchbone_read: function(callbacks) {
				var options = {};
				// console.log("aaa:", callbacks, this.attributes.id);
				//TODO: 'show', 'rev', 'revs_info',
				this.db.get(this.attributes.id, options, callbacks);
			},
			
			couchbone_update: function(callbacks) {
				var options = {};
				this.id || (this.id = this.attributes._id || this.attributes.id);
				this.attributes._id = this.id;
				this.db.save(this.toJSON(), _.pick(_.extend(options, callbacks), 'update', 'success', 'error'));				
			},
						
			couchbone_delete: function(callbacks) {
    			this.db.remove(this.toJSON(), _.pick(callbacks, 'success', 'error'));
			},

			couchbone_create: function(callbacks) { couchbone_update(callbacks); }

		});		

	}
	
	if (Backbone.Collection) {
		
		Couchbone.Collection = Backbone.Collection.extend({
			
			model: Couchbone.Model,
			sync: sync,
			db: null,

			constructor: function(models, options) {

				Backbone.Collection.prototype.constructor.call(this, models, options);
				
				if (options) {
					if (options.db) {
						if (options.db instanceof Couchbone.DbFly) {
							this.db = options.db;
						} else {
							this.db = Couchbone.DB(options.db);
						}
					}

					if (options.changes) {
						if (this.db) {
							couchboneFeedSubscribe(options.changes);
						} else {
							throw('Error: No database has been established for collection in order to start changes feed.');
						}
					}
					if (options.view) this.view = options.view;
					if (options.list) this.view = options.list;
				}
			},
		
			couchbone_read: function(callbacks) {
				var options = {};
				//TODO: options -> 'limit', 'skip', etc ....
			    if (this.view) {
					this.db.view(this.view, options, {
						done: function(result) {
							callbacks.success(_.map(result.rows, function(row) { return row.doc; }));
						},
						fail: function(result) {
							callbacks.error(result);
						}						
					});
			    } else {
					throw('Must set "view" (and optionally "list") in {couch_options} for collection');
				}
			},
			couchboneHandleChanges: function(results) {
				
				if (model = this.get(result.id)) {
					if (result.deleted) {
						this.remove(model);
					} else {
						if (model.get("_rev") !== result.doc._rev) { 
							model.set(result.doc); 
						}
					}
				} else {
					if (result.doc) {
						if (!result.deleted) {
				        	this.add(result.doc);
						}
					} else {
						console.log("Warning: No document was returned by the changes handler!");
					}
				}
			},
			couchboneFeedSubscribe: function(changes) {
				if (changes instanceof Couchbone.ChangesFeed) {
					return changes.addHandler(this.couchboneHandleChanges);
				} else {
					return (new ChangesFeed(this.db, changes)).addHandler(this.couchboneHandleChanges);
				}
			}

		});
	
	}
	
	return Couchbone;
});