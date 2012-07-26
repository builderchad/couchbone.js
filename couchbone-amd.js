"use strict";
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
    couchbone: {
        "prefix": "http://localhost:5984"
    }
});

define(["module", "underscore", "jquery", "backbone"], function(module, _, $, Backbone) {

	Couchbone = {
		prefix: (module.config().prefix || "http://localhost:5984"),
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
	function ajax(obj, options, error_message, ajax_options) {
		var default_ajax_options = {
			contentType: "application/json",
			headers:{"Accept": "application/json"}
		};
		options = _.extend({ successStatus: 200 }, options);
		ajax_options = _.extend(default_ajax_options, ajax_options);
		error_message = error_message || "Unknown error";
    	return $.ajax(_.extend(_.extend({
      		type: "GET", dataType: "json",
      		beforeSend: function(xhr) {
				if (ajax_options && ajax_options.headers) {
					for (var header in ajax_options.headers) {
						xhr.setRequestHeader(header, ajax_options.headers[header]);
          			}
        		}
      		},
			complete: function(req) {
				try {
					var resp = $.parseJSON(req.responseText);
				} catch(e) {
					if (options.error) {
						options.error(req.status, req, e);
					} else {
						console.log(error_message + ": " + e);
					}
          			return;
        		}

				if (options.ajaxStart) {
					options.ajaxStart(resp);
				}
				
				if (req.status == options.successStatus) {
					if (options.beforeSuccess) { options.beforeSuccess(req, resp); }
					if (options.success) { options.success(resp); }
				} else if (options.error) {
					options.error(req.status, resp && resp.error || error_message, resp && resp.reason || "no response");
				} else {
					console.log(error_message + ": " + resp.reason);
        		}
			}
		}, obj), ajax_options));
	}
	function session(prefix, options) {
		options = options || {};
		var config = {
			type: "GET", url: prefix + "/_session", dataType: "json",
			beforeSend: function(xhr) {
				xhr.setRequestHeader('Accept', 'application/json');
			},
	    	complete: function(req) {
	      		var resp = $.parseJSON(req.responseText);
	      		if (req.status == 200) {
					if (options.success) options.success(resp);
				} else if (options.error) {
					options.error(req.status, resp.error, resp.reason);
				} else {
					console.log("An error occurred getting session info: " + resp.reason);
				}
			}
		};
		if (options.username && options.password) {
			config.type = (options.username === '_' ? 'DELETE' : 'POST');
			config.data = { name: options.username, password: options.password };
		}
		return $.ajax(config);
	}
	function signup(user_doc, options) {
		options = options || {};
		user_doc._id = user_doc._id || user_doc.name;
		user_doc.type = "user";
		if (!user_doc.roles) { user_doc.roles = []; }
		return session(Couchbone.prefix, {
			success : function(resp) {
				var db = new Couchbone.DB(resp.info.authentication_db);
				db.saveDoc(user_doc, options);
			}
		});
	}
	function login(options) {
		options = options || {};
		return session(ripPrefix(options), options);
	}
	function logout(options) {
		options = options || {};
		return session(ripPrefix(options), _.extend(options, { username : "_", password : "_" }));
	}
	function sync(method, model, callbacks) { model['couchbone_' + method](callbacks); }
	function getValue(object, prop) {
		if (!(object && object[prop])) return null;
		return _.isFunction(object[prop]) ? object[prop]() : object[prop];
	}
	function urlError() { throw new Error('This model requires a "url" property or function, or an associated collection with a "db" property or function'); }
	function tasks(options) {
		return ajax({ url: ripPrefix(options) + "/_active_tasks"}, options, "Active task status could not be retrieved");
	}
	function dbs(options) {		
		return ajax({ url: ripPrefix(options) + "/_all_dbs" }, options, "An error occurred retrieving the list of all databases");
	}
	function config(options, section, option, value) {
		var req = {
			url: ripPrefix(options) + "/_config/" + 
				(section ? encodeURIComponent(section) + '/' + (option ? encodeURIComponent(option) : '') : '')
		}
  
		if (value === null) {
			req.type = "DELETE";
		} else if (value !== undefined) {
			req.type = "PUT";
			req.data = stringify(value);
			req.contentType = "application/json";
			req.processData = false
		}
		return ajax( req, options, "An error occurred retrieving/updating the server configuration" );
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
			ajax({ url: self.db.uri() + '/_changes' + encodeOptions(feed_options) },
				 { success: changesSuccess, error: changesError },
				'Error connecting to /_changes');
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
			success : function(info) {
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
		this.uri = function() { return _uri; }
	};
	
	Couchbone.DbFly.prototype = {
		
        info: function(options) {
			return ajax({ url: this.uri() }, options, "Database information could not be retrieved");
        },

        get: function(id, options, ajax_options) {
			options = options || {};
			ajax( 
				{ url: (options.show || this.uri()) + encodeID(id) + encodeOptions(options) },
				options,
				"The document could not be retrieved",
				ajax_options
			);
        },

        save: function(doc, options) {
			options = options || {};
			var method = "POST";
			var url = options.update || this.uri();
			var beforeSend;
			if (typeof options.ensure_full_commit !== "undefined") {
				var commit = options.ensure_full_commit;
				delete options.ensure_full_commit;
				beforeSend = function(xhr) {
					xhr.setRequestHeader('Accept', 'application/json');
					xhr.setRequestHeader("X-Couch-Full-Commit", commit.toString());
				};
			}
			
			// FROM jquery.couch.db:  updateDoc: function(updateFun, doc_id, options, ajaxOptions) { var type = 'PUT'; //.... }
			// beforeSend: function(xhr) { xhr.setRequestHeader('Accept', '*/*'); }, // use this with UPDATE urls?
			
			if (doc._id !== undefined) {
				method = "PUT";
				url += '/' + encodeID(doc._id);
			}
					
			$.ajax({
				
				url: url + encodeOptions(options),
				type: method, 
				data: stringify(doc),
            	dataType: "json", 
				contentType: "application/json",

            	beforeSend : beforeSend,
            	complete: function(req) {
					var resp = $.parseJSON(req.responseText);
					if (req.status == 200 || req.status == 201 || req.status == 202) {
						doc._id = resp.id;
						doc._rev = resp.rev;
						if (options.success) { options.success(resp); }
					} else if (options.error) {
						options.error(req.status, resp.error, resp.reason);
					} else {
						console.log("The document could not be saved: ", resp.reason);
						
					}
				}

			});

		},

        remove: function(doc, options) {
          return ajax(
			{ type: "DELETE", url: this.uri() + encodeID(doc._id) + encodeOptions({rev: doc._rev}) },
            options,
            "The document could not be deleted"
          );
        },

		removeAttachment: function(doc, attachment_name, options) {
          return ajax(
			{ type: "DELETE", url: this.uri() + encodeID(doc._id) + '/' + attachment_name + encodeOptions({rev: doc._rev}) },
            options,
            "The document could not be deleted"
          );
		},

		view: function(view, options, ajax_options) {
			var view = name.split('/'),
				options = options || {},
				type = "GET",
				data = null,
				keys = null,
				url  = this.uri();
			
			if (options["keys"]) {
				type = "POST";
				keys = options["keys"];
				delete options["keys"];
				data = stringify({ "keys": keys });
			}

			// CHECK: can we use a list from a different design doc to the view?
			if (options["list"]) {
				url += '_design/' + view[0] + '/_list/' + options["list"] + '/' + view[1];
				delete options["list"];
			} else {
				url += '_design/' + view[0] + '/_view/' + view[1];
			}
			
			return ajax(
				{ type: type, data: data, url: url + encodeOptions(options) },
				options,
				"An error occurred accessing the view",
				ajax_options
			);
			
        },

		admin: {

	        allDocs: function(options) {
				var type = "GET";
				var data = null;
				if (options["keys"]) {
					type = "POST";
					var keys = options["keys"];
					delete options["keys"];
					data = stringify({ "keys": keys });
				}
				return ajax(
					{ type: type, data: data, url: this.uri() + "_all_docs" + encodeOptions(options) },
					options,
					"An error occurred retrieving a list of all documents"
				);
	        },

	        allDesignDocs: function(options) {
				return this.allDocs(_.extend({startkey:"_design", endkey:"_design0"}, options));
	        },


			compact: function(options) {
				return ajax(
					{ type: "POST", url: this.uri() + "_compact", data: "", processData: false },
					_.extend(options, { successStatus: 202 }),
					"The database could not be compacted"
				);
			},

	        viewCleanup: function(options) {
				return ajax(
					{ type: "POST", url: this.uri() + "_view_cleanup", data: "", processData: false },
					_.extend(options, {successStatus: 202}),
					"The views could not be cleaned up"
				);
	        },

	        compactView: function(groupname, options) {
				return ajax(
					{ type: "POST", url: this.uri() + "_compact/" + groupname, data: "", processData: false },
	            	_.extend(options, {successStatus: 202}),
	            	"The view could not be compacted"
				);
	        },

	        create: function(options) {
				return ajax(
					{ type: "PUT", url: this.uri(), contentType: "application/json", data: "", processData: false },
	            	_.extend(options, {successStatus: 201}),
	            	"The database could not be created"
				);
	        },

	        drop: function(options) {
				return ajax({ type: "DELETE", url: this.uri() }, options, "The database could not be deleted");
	        }
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
			url: function() {
				var base = getValue(this, 'urlRoot') || getValue(this.collection, 'db') || urlError();
				if (this.isNew()) return base;
      			return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + encodeURIComponent(this.id);
			},
			
			couchbone_read: function(callbacks) {
				var options = {};
				this.db.get(this.attributes.id, _.pick(_.extend(options, callbacks), 'show', 'rev', 'revs_info', 'success', 'error'));
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
		Couchbone.Model.extend = Backbone.Model.extend;
	}
	
	if (Backbone.Collection) {
		var collection_def = Couchbone.Collection = function(models, options) {
			options || (options = {});
			if (options.db) {
				this.db = Couchbone.DB(options.db);
			}
			if (options.model) this.model = options.model;
			if (options.comparator) this.comparator = options.comparator;
			this._reset();
			this.initialize.apply(this, arguments);
			if (models) this.reset(models, {silent: true, parse: options.parse});
			if (options.changes) {
				if (this.db) {
					couchboneFeedSubscribe(options.changes);
				} else {
					throw('Error: No database has been established for collection in order to start changes feed.');
				}
			}
		}
	
		Couchbone.Collection.prototype = Backbone.Collection.prototype;
		Couchbone.Collection.extend = Backbone.Collection.extend;
		
		_.extend(Couchbone.Collection, {
			model: Couchbone.Model,
			sync: sync,
			couchbone_read: function() {
				var options = {};
				// _.pick(options, 'limit', 'skip', 'startkey', 'startkey_docid', 'endkey', 'endkey_docid', 'include_docs', 'success', 'error', 'keys');
				
			    _.extend(options, {
					success: function(response) {
						callbacks.success(_.map(response.rows, function(row) { row.doc }));
					},
					error: function(response) {
						callbacks.error(response);
					}
				});
    
			    if (options.view) {
					this.db.view(options.view, options); 
			    } else {
					throw('Must set "view" (and optionally "list") in {couch_options} for collection');
				}
			},
			couchboneHandleChanges: function() {
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
				feed_options = {
					filter: changes.filter,
					params: (changes.params || {}),
					handler: (changes.handler || this.couchboneHandleChanges),
					include_docs: (changes.handler ? (changes.include_docs || false) : true)
				};
				this.db.subscribeToChangesFeed(feed_options);
			}
		});
		Couchbone.CompositeCollection = collection_def.extend({ 
			odm: {},
			couchbone_read: function() {
				// _.pick(options, 'limit', 'skip', 'startkey', 'startkey_docid', 'endkey', 'endkey_docid', 'include_docs', 'success', 'error', 'keys');
			}			
		});
		Couchbone.CompositeCollection.extend = Backbone.Collection.extend;
	}
	
	return Couchbone;
});