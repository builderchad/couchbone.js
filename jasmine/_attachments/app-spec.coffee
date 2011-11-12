
class TestTools
  @db_name: "couchbone"
  @ddoc_name: "test"
  @db: $.couch.db @db_name
  @setup_complete: false
  @clean: (callback) ->
    @db.allDocs
      success: (result) ->
        docs = (_.select result.rows, (doc) -> !doc.id.match /^_design\/.+/)
        if docs.length > 0
          TestTools.db.bulkRemove { docs: (_.map docs, (doc) -> { "_rev": doc.value.rev, "_id": doc.id }) },
            success: ->
              callback()
            error: (error) ->
              throw "could not destroy documents in couchdb"
        else
          callback()

do ->
  TestTools.clean ->
    TestTools.db.bulkSave TESTFIXTURES,
      success: ->
        TestTools.setup_complete = true

describe "couchbone", ->
  
  beforeEach ->
    waitsFor -> TestTools.setup_complete == true

  it "should block deafult contstruction", ->
    options = {}
    error_caught = false
    try
      couchbone = new CouchBone options
    catch error
      error_caught = true
  
    (expect error_caught).toBeTruthy
  

  it "should provide a factory 'db' function", ->    
    couchbone = CouchBone.db TestTools.db_name
    doc_count = 0
    fetched = false
    
    couchbone.couch.allDocs
      success: (result) ->
        doc_count = result.rows.length
        fetched = true
      error: (error) ->

    waitsFor -> fetched == true
    runs -> (expect doc_count).toEqual 14


  it "should load a test fixture doc", ->
  
    fetched = false
    
    class Part extends Backbone.Model
      couch_options:
        db: CouchBone.db TestTools.db_name
        
      initialize: ->
        @bind "change", -> fetched = true
  
    model = new Part { id: "/projects/projectone" }
    model.fetch()
    
    waitsFor -> fetched == true
    runs ->
      (expect model.attributes.doctype).toEqual "project"


  it "should create a new fixture doc", ->

    fulfilled = false
    raw_fetch_ok = "unchecked"

    class Part extends Backbone.Model
      couch_options:
        db: CouchBone.db TestTools.db_name
      initialize: ->
        @bind "change", -> fulfilled = true

    model = new Part { id: "new_test_id", doctype: "testtype" }
    model.save()
    waitsFor -> fulfilled == true
    
    runs ->
      TestTools.db.openDoc "new_test_id"
        success: (doc, respo) ->
          if doc.doctype == "testtype"
            raw_fetch_ok = "yes"
          else
            raw_fetch_ok = "no"
        error: (msg) ->
          raw_fetch_ok = msg

    waitsFor -> raw_fetch_ok != "unchecked"
    
    runs ->
      (expect raw_fetch_ok).toEqual "yes"

  it "should delete a fixture doc", ->
  
    loaded = false
    deleted = false
    doc_is_gone = "unchecked"
  
    class Part extends Backbone.Model
      couch_options:
        db: CouchBone.db TestTools.db_name
      initialize: ->
        @bind "change", -> loaded = true
        @bind "destroy", -> deleted = true
  
    model = new Part { id: "/projects/projectone/app/js" }
    
    model.fetch()
    waitsFor -> loaded == true    
    runs -> model.destroy()
    waitsFor -> deleted == true

    runs ->
      TestTools.db.openDoc "/projects/projectone/app/js"
        success: (doc, respo) ->
            doc_is_gone = "no_really_no"
        error: (msg) ->
          doc_is_gone = "yes"
  
    waitsFor -> doc_is_gone != "unchecked"
  
    runs ->
      (expect doc_is_gone).toEqual "yes"


  it "should update a fixture doc", ->
    fulfilled = false
    successful_save = false
    
    class Part extends Backbone.Model
      couch_options:
        db: CouchBone.db TestTools.db_name
      initialize: ->
        @bind "change", -> fulfilled = true
  
    model = new Part { id: "/projects/projectone/app" }
    model.fetch()
    waitsFor -> fulfilled == true
    
    runs ->
      fulfilled = false
      model.attributes.doctype = "testtype"
      model.save {},
        success: (doc, resp) ->
          successful_save = true
      
    waitsFor -> fulfilled == true
    
    runs ->
      (expect successful_save).toBeTruthy

  it "should fetch collections (couchdb views)", ->
    db = CouchBone.db TestTools.db_name
    fulfilled = false
    class SimpleModel extends Backbone.Model

    class SimpleCollection extends Backbone.Collection
      model: SimpleModel
      couch_options:
        db: db
        view: "#{TestTools.ddoc_name}/tree"
        changes:
          type: 'gonzo'

    collection = new SimpleCollection()
    collection.fetch
      success: -> fulfilled = true      

    waitsFor -> fulfilled == true
    runs -> (expect collection.length).toBeGreaterThan 10

  it "should support 'include_docs' in collections (couchdb views)", ->
    db = CouchBone.db TestTools.db_name
    fulfilled = false
    class SimpleModel extends Backbone.Model

    class SimpleCollection extends Backbone.Collection
      model: SimpleModel
      couch_options:
        db: db
        view: "#{TestTools.ddoc_name}/tree"
        include_docs: true
        changes:
          type: 'gonzo'

    collection = new SimpleCollection()
    collection.fetch
      success: -> fulfilled = true      

    waitsFor -> fulfilled == true
    runs -> (expect collection.models[0].attributes.doctype).toEqual "project"


  it "should fetch collections (couchdb lists)", ->
    db = CouchBone.db TestTools.db_name
    fulfilled = false
    class SimpleModel extends Backbone.Model
    class SimpleCollection extends Backbone.Collection
      model: SimpleModel
      couch_options:
        db: db
        view: "#{TestTools.ddoc_name}/tree"
        list: 'simple'
        changes:
          type: 'gonzo'

    collection = new SimpleCollection()
    collection.fetch
      success: -> fulfilled = true

    waitsFor -> fulfilled == true
    runs -> 
      (expect collection.length).toBeGreaterThan 10


  it "should ensure that collections automatically subscribe to the changes feed", ->
    db = CouchBone.db TestTools.db_name
    fulfilled = false
    class SimpleModel extends Backbone.Model  
  
    class SimpleCollection extends Backbone.Collection      
      model: SimpleModel
      couch_options:
        db: db
        view: "#{TestTools.ddoc_name}/tree"
        changes:
          type: 'gonzo'
  
    # t = new CouchBone.ChangesFeed
    db.new_changes_feed({})
    
    collection = new SimpleCollection()
    collection.fetch
      success: -> fulfilled = true
  
    waitsFor -> fulfilled == true
    runs -> (expect db.couch.uri).toEqual "http://127.0.0.1:5984/#{TestTools.db_name}/"
     
       
 