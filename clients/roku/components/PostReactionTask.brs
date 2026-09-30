sub init()
    m.top.functionName = "executeRequest"
end sub

sub executeRequest()
    id = m.top.annotationId
    idx = m.top.reactionIndex
    if id = "" then return

    emojis = ["🔥", "🤔", "💡", "💯", "👎"]
    if idx < 0 or idx > 4 then return
    emoji = emojis[idx]

    url = "https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotation_reactions"
    
    req = CreateObject("roUrlTransfer")
    req.SetCertificatesFile("common:/certs/ca-bundle.crt")
    req.SetUrl(url)
    
    req.AddHeader("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU")
    req.AddHeader("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU")
    req.AddHeader("Content-Type", "application/json")
    req.AddHeader("Prefer", "return=minimal")
    
    body = {
        "annotation_id": id,
        "emoji": emoji
    }
    
    jsonStr = FormatJson(body)
    print "[PostReactionTask] Posting: "; jsonStr
    
    resp = req.PostFromString(jsonStr)
    print "[PostReactionTask] Response code: "; req.GetResponseCode()
end sub