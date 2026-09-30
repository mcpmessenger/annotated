sub init()
    m.top.functionName = "executeRequest"
end sub

sub executeRequest()
    dataStr = m.top.annotationData
    if dataStr = "" then
        m.top.response = "ERROR"
        return
    end if

    data = ParseJson(dataStr)
    if data = invalid then
        m.top.response = "ERROR"
        return
    end if

    quote = ""
    if data.highlighted_text <> invalid then quote = data.highlighted_text
    if quote = "" and data.quote <> invalid then quote = data.quote
    if quote = "" and data.page_title <> invalid then quote = data.page_title
    
    commentary = ""
    if data.comment <> invalid then commentary = data.comment
    
    sourceUrl = ""
    if data.source <> invalid and data.source.url <> invalid then sourceUrl = data.source.url
    
    sourceTitle = ""
    if data.source <> invalid and data.source.title <> invalid then sourceTitle = data.source.title

    isVideoClip = false
    videoStartTs = ""
    videoEndTs = ""
    if data.media <> invalid and data.media.type = "video"
        isVideoClip = true
        if data.media.timestamp <> invalid
            parts = data.media.timestamp.split("-")
            if parts.count() = 2
                videoStartTs = parts[0]
                videoEndTs = parts[1]
            end if
        end if
    end if

    url = "https://annotated-repo.vercel.app/api/ai/factcheck"
    
    req = CreateObject("roUrlTransfer")
    req.SetCertificatesFile("common:/certs/ca-bundle.crt")
    req.SetUrl(url)
    req.AddHeader("Content-Type", "application/json")
    
    body = {
        "quote": quote,
        "commentary": commentary,
        "sourceUrl": sourceUrl,
        "sourceTitle": sourceTitle,
        "isVideoClip": isVideoClip,
        "videoStartTs": videoStartTs,
        "videoEndTs": videoEndTs
    }
    
    jsonStr = FormatJson(body)
    print "[FactCheckTask] POSTing to AI: "; jsonStr
    
    resp = req.PostFromString(jsonStr)
    code = req.GetResponseCode()
    
    if code = 200
        m.top.response = resp
    else
        print "[FactCheckTask] Failed with code "; code; " response: "; resp
        m.top.response = "ERROR"
    end if
end sub
