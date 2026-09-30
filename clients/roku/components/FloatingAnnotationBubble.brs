sub init()
    m.bubbleGroup = m.top.findNode("bubbleGroup")
    m.disputeQrCode = m.top.findNode("disputeQrCode")
    m.fadeAnim = m.top.findNode("fadeAnim")
    m.opacityInterp = m.top.findNode("opacityInterp")
    m.slideInterp = m.top.findNode("slideInterp")
end sub

sub onDataChange()
    data = m.top.annotationData
    if data <> invalid
        ' Generate a secure dispute link based on the note slug/pass_url
        targetUrl = "https://annotated-repo.vercel.app"
        if data.pass_url <> invalid and data.pass_url <> ""
            targetUrl = data.pass_url + "?dispute=true"
        else if data.slug <> invalid and data.slug <> ""
            targetUrl = "https://annotated-repo.vercel.app/n/" + data.slug + "?dispute=true"
        end if
        
        qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=" + targetUrl
        m.disputeQrCode.uri = qrUrl
    end if
end sub


sub onStateChange()
    state = m.top.bubbleState
    if state = "OPEN"
        m.opacityInterp.keyValue = [m.bubbleGroup.opacity, 1.0]
        m.slideInterp.keyValue = [m.bubbleGroup.translation, [1300, 260]]
        m.fadeAnim.control = "start"
    else if state = "CLOSED"
        m.opacityInterp.keyValue = [m.bubbleGroup.opacity, 0.0]
        m.slideInterp.keyValue = [m.bubbleGroup.translation, [1300, 310]]
        m.fadeAnim.control = "start"
    end if
end sub
