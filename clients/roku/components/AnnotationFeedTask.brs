sub init()
    m.top.functionName = "loadAnnotations"
end sub

sub loadAnnotations()
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
