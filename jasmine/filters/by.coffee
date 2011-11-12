(doc, req) ->
  doc[req.query.field_name] == req.query.field_value
