sub init()
    m.top.functionName = "executeRequest"
end sub

sub executeRequest()
    id = m.top.annotationId
    idx = m.top.reactionIndex
    if id = "" or id = invalid then return

    emojis = ["🔥", "🤔", "💡", "💯", "👎"]
    if idx < 0 or idx > 4 then return
    emoji = emojis[idx]

    url = "https://annotated-repo.vercel.app/api/react"

    req = CreateObject("roUrlTransfer")
    req.SetCertificatesFile("common:/certs/ca-bundle.crt")
    req.InitClientCertificates()
    req.SetUrl(url)
    req.AddHeader("Content-Type", "application/json")

    body = {
        "annotationId": id,
        "emoji": emoji,
        "client": "roku"
    }

    jsonStr = FormatJson(body)
    print "[PostReactionTask] Posting: "; jsonStr

    resp = req.PostFromString(jsonStr)
    code = req.GetResponseCode()
    print "[PostReactionTask] Response code: "; code
    m.top.status = Str(code)
end sub
