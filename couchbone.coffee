# COUCHBONE is a backbone.js <-> CouchDB connector.  Some code taken form and inspired by these
# other connectors:
# Jan Monschke https://github.com/janmonschke/backbone-couchdb,
# Andrzej Sliwa https://github.com/andrzejsliwa/backbone-couch,
# Thomas Rampelberg https://github.com/pyronicide/backbone.couchdb.js
# 
# CouchBone by Chad Thatcher 2011 under the MIT License
# 
# Requires: customised version of jquery.couch.db.  See couchbone_create and couchbone_read functions for details.


# couch_options:
# 
# 
# 
# 
# view
# list
# show
# 
## The following is an automatic change feed setup using a generic "by" filter
# changes: {
#   field: fieldname
#   is: fieldvalue
# }
# 
# Where "by" filter is defined as follows: (doc, req) -> doc[req.query.field] == req.query.is
# 
## The following is a manual setup  
# changes: {
#   
# }

class CouchBone

  @default_factory_options:
    db : "__default_couchbone_db__"
    host : "http://127.0.0.1:5984"
  @dbs: {}  
  @db: (user_options) ->
    user_options = { db: user_options } if typeof user_options == "string"
    options = @default_factory_options
    _.extend options, user_options
    
    if @dbs[options.db]
      @dbs[options.db]
    else
      @dbs[options.db] = new CouchBone "__OVERRIDE__", options

  @not_these: (excl, from) ->
    ops = {}
    _.each (_.difference (_.keys from), excl), (key) -> ops[key] = from[key]
    ops

  @only_these: (incl, from) ->
    ops = {}
    _.each incl, (key) -> ops[key] = from[key] if from[key]
    ops

  constructor: (factory_switch, @options) ->
    throw "use 'CouchBone.db <db_name>' factory instead" if factory_switch != "__OVERRIDE__"
    @couch = $.couch.db @options.db
    @couch.uri = "#{@options.host}/#{@options.db}/"

  # This handles both a global (db wide change feed object) for any "client_filter" strategy.
  # These are handled together to prevent wasted network connections.
  # Using a server side 'filter' will give back a new object (i.e. a sep. changes feed altogether)
  new_changes_feed: (strategy) ->
    # console.log "ncf:", arguments.callee.caller
    if strategy.client_filter
      throw "not impl."
      @db_wide_feed = new @ChangesFeed("__OVERRIDE__", @couch) unless @db_wide_feed
      @db_wide_feed.add_handler(strategy.client_filter, strategy.client_handler)
    else
      new @ChangesFeed("__OVERRIDE__", @couch, strategy)

  class @ChangesFeed

    constructor: (factory_switch, @db, @filter)->
      throw "Use couchbone instance '.new_changes_feed' factory instead" if factory_switch != "__OVERRIDE__"
      throw "server filter not specified" unless @filter
      _.bindAll @, '_init_changes', '_on_changes'
      @start_feed

    start_feed: ->
      @couch.info success: @_init_changes

    stop_feed: ->
      @_changes.stop if @_changes

    _init_changes: (info) ->
      sequence = info.update_seq || 0
      # options = include_docs: true
      options = {}
      if @filter and @filter.name
        options.filter = @filter.name
        (_.extend options, @filter.params) if @filter.params

      @_changes = @db.changes sequence, options
      @_changes.onChange @_on_changes

    _on_changes: (changes) ->
      _.each changes.results, (result) =>
        @filter.handler result


class Backbone.Model extends Backbone.Model

  idAttribute : "_id"
  couch_options: {}

  # Note: relies on patched version of jquery.couch.js where the 'save' function supports an 'update' option and
  # builds a custom URL like this: url = this.uri + '_design/' + update_parts[0] + '/_update/' + update_parts[1] + '/'
  # { update: 'design_doc/update_func_name' }
  couchbone_create: (callbacks) ->    
    @id = @attributes._id || @attributes.id unless @id
    @attributes._id = @id
    options = @couch_options
    _.extend options,
      success : callbacks.success
      error : callbacks.error
    options.db.couch.saveDoc @toJSON(), (CouchBone.only_these ['update', 'success', 'error'], options)

  # Note: relies on patched version of jquery.couch.js where the 'openDoc' function supports a 'show' option and
  # builds a custom URL like this: url = this.uri + '_design/' + show_parts[0] + '/_show/' + show_parts[1] + '/'
  # { show: 'design_doc/show_func_name' }
  couchbone_read: (callbacks) ->
    options = @couch_options
    include_options = ['show', 'rev', 'revs_info', 'success', 'error']
    _.extend options,
      success: callbacks.success
      error: callbacks.error
    options.db.couch.openDoc @attributes.id, (CouchBone.only_these include_options, options)

  couchbone_update: (callbacks) ->
    @couchbone_create callbacks
  
  couchbone_delete: (callbacks) ->
    @couch_options.db.couch.removeDoc @toJSON(), 
      success: callbacks.success
      error: callbacks.error


class Backbone.Collection extends Backbone.Collection

  couch_options: {}

  initialize: -> 
    @couchbone_feed_subscribe if @couch_options.auto_subscribe

  couchbone_handle_feed_changes: (result) ->
    model = @get result.id
    if model?
      if result.deleted
        @remove model
      else
        model.set result.doc unless model.get("_rev") == result.doc._rev 
    else
      @add result.doc unless result.deleted
      
    # console.log "collchng - handle end"

  couchbone_feed_subscribe: ->
    if @couch_options.db
      if @couch_options.changes.field
        feed_options =
          filter: 'by'
          params: @couch_options.changes.field
          handler: @couchbone_handle_feed_changes
      else if @couch_options.changes.filter
        feed_options =
          filter: @couch_options.changes.filter
          params: @couch_options.changes.params || {}
          handler: @couch_options.changes.handler || @couchbone_handle_feed_changes
      else
        throw "changes specification has not been specified correctly"

      @couch_options.db.new_changes_feed
      # _.bind @generic_handle_changes, @

  # If using a 'view' only then a design doc must be specified:
  # { view: 'design_doc/view_name' }
  # If using the 'list' option then you must also specify a 'view' to draw data from but the view name must not have a design doc specified
  # { list: 'design_doc/list_func_name', view: 'view_name_only' }
  couchbone_read: (callbacks) ->
    options = @couch_options
    exclude = ['db', 'view', 'list', 'changes', 'filter']
    _.extend options,
      success : (response) ->
        callbacks.success (_.map response.rows, (row) -> row.doc)
      error : (response) ->
        callbacks.error response
    
    if options.view
      options.db.couch.view options.view, (CouchBone.not_these exclude, options)
    else if options.list
      options.db.couch.list options.list, options.view, (CouchBone.not_these exclude, options)
    else
      throw 'Must set "view" or "list" in {couch_options} for collection'
  

Backbone.sync = (method, obj, options) -> obj['couchbone_' + method] options

