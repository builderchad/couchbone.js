(doc) ->
  if doc.doctype
    parts = doc._id.split('/')
    parts.shift()
    
    if parts[0] == "projects"
      struct =
        doctype: doc.doctype
      struct.assembler = doc.assembler if doc.assembler?
      struct.generator = doc.generator if doc.generator?
      struct.codetype = doc.codetype if doc.codetype?
      emit (parts.slice 0, parts.length), struct
  null