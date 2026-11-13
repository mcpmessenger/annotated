sub init()
    m.top.functionName = "loadChannel"
end sub

' -----------------------------------------------------------------------
' ChannelFeedTask - channels-ready stub
'
' This task is NOT yet wired to the UI. It is stubbed here so that when
' GET /api/channels/[userId] lands (Channels PRD §5), the TV-side code
' only needs to:
'   1. Create a ChannelFeedTask node
'   2. Set channelUserId to the target user's id
'   3. observeField("items", "onChannelLoaded")
'   4. control = "RUN"
'
' No sign-in is required - channel reads are public (Channels PRD §4).
' -----------------------------------------------------------------------
sub loadChannel()
    userId = m.top.channelUserId
    if userId = "" or userId = invalid
        m.top.error = "channelUserId not set"
        return
    end if

    BASE_URL = "https://annotated-repo.vercel.app"
    url = BASE_URL + "/api/channels/" + userId

    transfer = CreateObject("roUrlTransfer")
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.InitClientCertificates()
    transfer.SetUrl(url)
    transfer.AddHeader("Content-Type", "application/json")
    transfer.AddHeader("Accept", "application/json")
    transfer.AddHeader("Cache-Control", "no-cache")

    responseString = transfer.GetToString()
    responseCode = transfer.GetResponseCode()

    if responseCode = 404
        m.top.error = "Channel not found (404)"
        return
    end if

    if responseString <> invalid and responseString <> ""
        json = ParseJson(responseString)
        if json <> invalid
            if json.items <> invalid and type(json.items) = "roArray"
                m.top.items = json.items
            end if
            if json.profile <> invalid
                m.top.profile = json.profile
            end if
            itemCount = 0
            if json.items <> invalid then itemCount = json.items.count()
            print "[ChannelFeedTask] Loaded channel for "; userId; " - "; itemCount; " items"
            return
        end if
    end if

    m.top.error = "Channel API unavailable or not yet deployed (HTTP " + Str(responseCode).trim() + ")"
    print "[ChannelFeedTask] Channel API not ready: "; responseCode; " "; responseString
end sub
