sub init()
    m.top.functionName = "executeReport"
end sub

sub executeReport()
    id = m.top.annotationId
    if id = "" or id = invalid then return

    reason = m.top.reason
    if reason = "" or reason = invalid then reason = "other"

    details = m.top.details
    if details = "" or details = invalid then details = "Reported from TV client"

    url = "https://annotated-repo.vercel.app/api/report"

    req = CreateObject("roUrlTransfer")
    req.SetCertificatesFile("common:/certs/ca-bundle.crt")
    req.SetUrl(url)
    req.AddHeader("Content-Type", "application/json")

    body = {
        "contentType": "annotation",
        "contentId": id,
        "reason": reason,
        "details": details,
        "client": "roku"
    }

    jsonStr = FormatJson(body)
    print "[PostReportTask] Submitting UGC report: "; jsonStr

    resp = req.PostFromString(jsonStr)
    code = req.GetResponseCode()
    print "[PostReportTask] Response code: "; code
    m.top.status = Str(code)
end sub
