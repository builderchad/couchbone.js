(doc, req) ->
  x = doc._attachments["index.html"]
  # .data

  body : "<foo>#{x.content_type}</foo>",
  # body: x,
  headers :
    "Content-Type" : "application/xml",
    "X-My-Own-Header": "you can set your own headers"
