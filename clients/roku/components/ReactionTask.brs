sub init()
    m.top.functionName = "sendReaction"
end sub

sub sendReaction()
    annId = m.top.annotationId
    emoji = m.top.emoji
    if annId = invalid or annId = "" or emoji = invalid or emoji = "" then return

    postTransfer = CreateObject("roUrlTransfer")
    postTransfer.SetUrl("http://192.168.4.22:8090/api/react")
    postTransfer.AddHeader("Content-Type", "application/json")
    postBody = "{""annotation_id"":""" + annId + """,""emoji"":""" + emoji + """}"
    res = postTransfer.PostFromString(postBody)
    print "[Annotated ReactionTask] Posted reaction '"; emoji; "' for '"; annId; "' -> code: "; res
end sub
