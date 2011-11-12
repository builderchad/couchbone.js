TESTFIXTURES = {
  "docs": [
    {
      "_id": "/projects/projectzero",
      "doctype": "project",
      "assembler": "project",
      "generator": "project"
    },
    {
      "_id": "/projects/projectone",
      "doctype": "project",
      "assembler": "project",
      "generator": "project"
    },
    {
      "_id": "/projects/projectone/app",
      "doctype": "folder",
      "assembler": "attachments"
    },
    {
      "_id": "/projects/projectone/app/js",
      "doctype": "folder"
    },
    {
      "_id": "/projects/projectone/app/js/app.coffee",
      "doctype": "file",
      "generator": "coffee",
      "codetype": "coffee"
    },
    {
      "_id": "/projects/projectone/app/js/models.coffee",
      "doctype": "smartfile",
      "assembler": "concat",
      "generator": "coffee",
      "codetype": "coffee",
      "destination": "/projects/projectone/app/js/models.js"
    },
    {
      "_id": "/projects/projectone/app/js/models.coffee/Person.coffee",
      "doctype": "filepart",
      "codetype": "coffee"
    },
    {
      "_id": "/projects/projectone/app/js/models.coffee/Session.coffee",
      "doctype": "filepart",
      "codetype": "coffee"
    },
    {
      "_id": "/projects/projectone/app/js/models.coffee/Account.coffee",
      "doctype": "filepart",
      "codetype": "coffee"
    },
    {
      "_id": "/projects/projectone/app/style",
      "doctype": "folder"
    },
    {
      "_id": "/projects/projectone/app/style/main.sass",
      "doctype": "file",
      "generator": "sass",
      "codetype": "sass",
      "destination": "/projects/projectone/app/style/main.css"
    },
    {
      "_id": "/projects/projectone/views",
      "doctype": "folder",
      "assembler": "jsonmerge"
    },
    {
      "_id": "/projects/projectone/views/recent-items",
      "doctype": "filepart",
      "generator": "tojson",
      "codetype": "json"
    },
  ]
}
