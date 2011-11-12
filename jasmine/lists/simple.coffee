(head, req) ->
  start()
  send '{ rows: ['
  if req.query.include_docs
    send (toJSON row.doc) while row = getRow()
  else
    send (toJSON row.value) while row = getRow()
  send ']}'