sub init()
    m.top.functionName = "loadAnnotations"
end sub

sub loadAnnotations()
    ' -----------------------------------------------------------------------
    ' Annotated Feed API — replaces the raw Supabase REST call.
    ' The /api/feed endpoint returns a structured JSON payload designed for
    ' TV clients: it filters to video-only clips, resolves playable URLs,
    ' and enriches results with author profile data in a single request.
    '
    ' Set this to your production domain once deployed to Vercel:
    '   e.g. "https://annotated.com" or "https://my-app.vercel.app"
    ' -----------------------------------------------------------------------
    BASE_URL = "https://annotated-repo.vercel.app"
    nowSecs = CreateObject("roDateTime").AsSeconds().toStr()
    url = BASE_URL + "/api/feed?client=roku&video_only=false&limit=50&_t=" + nowSecs

    transfer = CreateObject("roUrlTransfer")
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.InitClientCertificates()
    transfer.SetUrl(url)
    transfer.AddHeader("Content-Type", "application/json")
    transfer.AddHeader("Accept", "application/json")
    transfer.AddHeader("Cache-Control", "no-cache")

    responseString = transfer.GetToString()
    if responseString <> invalid and responseString <> ""
        json = ParseJson(responseString)
        ' The feed API returns { items: [...], meta: {...} }
        if json <> invalid and json.items <> invalid and type(json.items) = "roArray"
            print "[Annotated] Feed API: fetched "; json.items.count(); " video annotations"
            m.top.annotations = json.items
            return
        end if
        ' Fallback: handle legacy raw array response (during transition)
        if json <> invalid and type(json) = "roArray"
            print "[Annotated] Feed API: legacy array response with "; json.count(); " annotations"
            m.top.annotations = json
            return
        end if
    end if

    print "[Annotated] Failed to load feed: "; responseString
    m.top.error = "Failed to load live annotations"
end sub
