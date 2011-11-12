var CouchBone;
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
  for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor;
  child.__super__ = parent.prototype;
  return child;
};
CouchBone = (function() {
  CouchBone.default_factory_options = {
    db: "__default_couchbone_db__",
    host: "http://127.0.0.1:5984"
  };
  CouchBone.dbs = {};
  CouchBone.db = function(user_options) {
    var options;
    if (typeof user_options === "string") {
      user_options = {
        db: user_options
      };
    }
    options = this.default_factory_options;
    _.extend(options, user_options);
    if (this.dbs[options.db]) {
      return this.dbs[options.db];
    } else {
      return this.dbs[options.db] = new CouchBone("__OVERRIDE__", options);
    }
  };
  CouchBone.not_these = function(excl, from) {
    var ops;
    ops = {};
    _.each(_.difference(_.keys(from), excl), function(key) {
      return ops[key] = from[key];
    });
    return ops;
  };
  CouchBone.only_these = function(incl, from) {
    var ops;
    ops = {};
    _.each(incl, function(key) {
      if (from[key]) {
        return ops[key] = from[key];
      }
    });
    return ops;
  };
  function CouchBone(factory_switch, options) {
    this.options = options;
    if (factory_switch !== "__OVERRIDE__") {
      throw "use 'CouchBone.db <db_name>' factory instead";
    }
    this.couch = $.couch.db(this.options.db);
    this.couch.uri = "" + this.options.host + "/" + this.options.db + "/";
  }
  CouchBone.prototype.new_changes_feed = function(strategy) {
    if (strategy.client_filter) {
      throw "not impl.";
      if (!this.db_wide_feed) {
        this.db_wide_feed = new this.ChangesFeed("__OVERRIDE__", this.couch);
      }
      return this.db_wide_feed.add_handler(strategy.client_filter, strategy.client_handler);
    } else {
      return new this.ChangesFeed("__OVERRIDE__", this.couch, strategy);
    }
  };
  CouchBone.ChangesFeed = (function() {
    function ChangesFeed(factory_switch, db, filter) {
      this.db = db;
      this.filter = filter;
      if (factory_switch !== "__OVERRIDE__") {
        throw "Use couchbone instance '.new_changes_feed' factory instead";
      }
      if (!this.filter) {
        throw "server filter not specified";
      }
      _.bindAll(this, '_init_changes', '_on_changes');
      this.start_feed;
    }
    ChangesFeed.prototype.start_feed = function() {
      return this.couch.info({
        success: this._init_changes
      });
    };
    ChangesFeed.prototype.stop_feed = function() {
      if (this._changes) {
        return this._changes.stop;
      }
    };
    ChangesFeed.prototype._init_changes = function(info) {
      var options, sequence;
      sequence = info.update_seq || 0;
      options = {};
      if (this.filter && this.filter.name) {
        options.filter = this.filter.name;
        if (this.filter.params) {
          _.extend(options, this.filter.params);
        }
      }
      this._changes = this.db.changes(sequence, options);
      return this._changes.onChange(this._on_changes);
    };
    ChangesFeed.prototype._on_changes = function(changes) {
      return _.each(changes.results, __bind(function(result) {
        return this.filter.handler(result);
      }, this));
    };
    return ChangesFeed;
  })();
  return CouchBone;
})();
Backbone.Model = (function() {
  __extends(Model, Backbone.Model);
  function Model() {
    Model.__super__.constructor.apply(this, arguments);
  }
  Model.prototype.idAttribute = "_id";
  Model.prototype.couch_options = {};
  Model.prototype.couchbone_create = function(callbacks) {
    var options;
    if (!this.id) {
      this.id = this.attributes._id || this.attributes.id;
    }
    this.attributes._id = this.id;
    options = this.couch_options;
    _.extend(options, {
      success: callbacks.success,
      error: callbacks.error
    });
    return options.db.couch.saveDoc(this.toJSON(), CouchBone.only_these(['update', 'success', 'error'], options));
  };
  Model.prototype.couchbone_read = function(callbacks) {
    var include_options, options;
    options = this.couch_options;
    include_options = ['show', 'rev', 'revs_info', 'success', 'error'];
    _.extend(options, {
      success: callbacks.success,
      error: callbacks.error
    });
    return options.db.couch.openDoc(this.attributes.id, CouchBone.only_these(include_options, options));
  };
  Model.prototype.couchbone_update = function(callbacks) {
    return this.couchbone_create(callbacks);
  };
  Model.prototype.couchbone_delete = function(callbacks) {
    return this.couch_options.db.couch.removeDoc(this.toJSON(), {
      success: callbacks.success,
      error: callbacks.error
    });
  };
  return Model;
})();
Backbone.Collection = (function() {
  __extends(Collection, Backbone.Collection);
  function Collection() {
    Collection.__super__.constructor.apply(this, arguments);
  }
  Collection.prototype.couch_options = {};
  Collection.prototype.initialize = function() {
    if (this.couch_options.auto_subscribe) {
      return this.couchbone_feed_subscribe;
    }
  };
  Collection.prototype.couchbone_handle_feed_changes = function(result) {
    var model;
    model = this.get(result.id);
    if (model != null) {
      if (result.deleted) {
        return this.remove(model);
      } else {
        if (model.get("_rev") !== result.doc._rev) {
          return model.set(result.doc);
        }
      }
    } else {
      if (!result.deleted) {
        return this.add(result.doc);
      }
    }
  };
  Collection.prototype.couchbone_feed_subscribe = function() {
    var feed_options;
    if (this.couch_options.db) {
      if (this.couch_options.changes.field) {
        feed_options = {
          filter: 'by',
          params: this.couch_options.changes.field,
          handler: this.couchbone_handle_feed_changes
        };
      } else if (this.couch_options.changes.filter) {
        feed_options = {
          filter: this.couch_options.changes.filter,
          params: this.couch_options.changes.params || {},
          handler: this.couch_options.changes.handler || this.couchbone_handle_feed_changes
        };
      } else {
        throw "changes specification has not been specified correctly";
      }
      return this.couch_options.db.new_changes_feed;
    }
  };
  Collection.prototype.couchbone_read = function(callbacks) {
    var exclude, options;
    options = this.couch_options;
    exclude = ['db', 'view', 'list', 'changes', 'filter'];
    _.extend(options, {
      success: function(response) {
        return callbacks.success(_.map(response.rows, function(row) {
          return row.doc;
        }));
      },
      error: function(response) {
        return callbacks.error(response);
      }
    });
    if (options.view) {
      return options.db.couch.view(options.view, CouchBone.not_these(exclude, options));
    } else if (options.list) {
      return options.db.couch.list(options.list, options.view, CouchBone.not_these(exclude, options));
    } else {
      throw 'Must set "view" or "list" in {couch_options} for collection';
    }
  };
  return Collection;
})();
Backbone.sync = function(method, obj, options) {
  return obj['couchbone_' + method](options);
};