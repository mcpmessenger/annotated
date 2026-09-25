sub init()
    m.top.functionName = "loadAnnotations"
end sub

sub loadAnnotations()
    ' 1. First try enriched feed from local media server (includes live reaction counts and AI fact checks)
    localTransfer = CreateObject("roUrlTransfer")
    localTransfer.SetUrl("http://192.168.4.22:8090/api/feed")
    localRes = localTransfer.GetToString()
    if localRes <> invalid and localRes <> ""
        json = ParseJson(localRes)
        if json <> invalid and type(json) = "roArray" and json.count() > 0
            print "[Annotated] Successfully fetched "; json.count(); " live annotations with reactions & fact checks from local feed!"
            m.top.annotations = json
            return
        end if
    end if

    ' 2. Fallback to direct Supabase REST API
    url = "https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?select=*&order=created_at.desc&limit=15"
    apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU"

    transfer = CreateObject("roUrlTransfer")
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.InitClientCertificates()
    transfer.SetUrl(url)
    transfer.AddHeader("apikey", apiKey)
    transfer.AddHeader("Authorization", "Bearer " + apiKey)
    transfer.AddHeader("Content-Type", "application/json")

    responseString = transfer.GetToString()
    if responseString <> invalid and responseString <> ""
        json = ParseJson(responseString)
        if json <> invalid and type(json) = "roArray"
            print "[Annotated] Successfully fetched "; json.count(); " live annotations from Supabase!"
            m.top.annotations = json
            return
        end if
    end if

    print "[Annotated] Failed to fetch annotations from Supabase: "; responseString
    m.top.error = "Failed to load live annotations"
end sub
