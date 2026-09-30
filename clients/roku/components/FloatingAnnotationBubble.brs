sub init()
    m.bubbleGroup = m.top.findNode("bubbleGroup")
    m.sourceAuthorLabel = m.top.findNode("sourceAuthorLabel")
    m.annotatorAvatar = m.top.findNode("annotatorAvatar")
    m.authorLabel = m.top.findNode("authorLabel")
    m.timestampLabel = m.top.findNode("timestampLabel")
    m.quoteLabel = m.top.findNode("quoteLabel")
    m.commentLabel = m.top.findNode("commentLabel")
    m.topAccent = m.top.findNode("topAccent")
    m.fadeAnim = m.top.findNode("fadeAnim")
    m.opacityInterp = m.top.findNode("opacityInterp")
    m.slideInterp = m.top.findNode("slideInterp")
    m.focusRing = m.top.findNode("focusRing")
    end sub

sub onDataChange()
    data = m.top.annotationData
    if data <> invalid
if data.source <> invalid and data.source.author <> invalid and data.source.author <> ""
            m.sourceAuthorLabel.text = "Source: " + data.source.author
        else
            m.sourceAuthorLabel.text = "Identified Source"
        end if

        if data.author <> invalid
            if data.author.username <> invalid
                m.authorLabel.text = "@" + data.author.username
            else if data.author.display_name <> invalid
                m.authorLabel.text = data.author.display_name
            else
                m.authorLabel.text = "@community"
            end if
            
            if data.author.avatar_url <> invalid and data.author.avatar_url <> ""
                m.annotatorAvatar.uri = data.author.avatar_url
                m.annotatorAvatar.visible = true
            else
                m.annotatorAvatar.visible = false
            end if
        else
            m.authorLabel.text = "@community"
            m.annotatorAvatar.visible = false
        end if
        
        if data.quote <> invalid and data.quote <> ""
            m.quoteLabel.text = chr(34) + data.quote + chr(34)
        else
            m.quoteLabel.text = ""
        end if
        m.commentLabel.text = data.comment
        
        if data.timestampSeconds <> invalid
            secs = data.timestampSeconds
            mins = Int(secs / 60)
            remSecs = secs mod 60
            if remSecs < 10
                m.timestampLabel.text = mins.toStr() + ":0" + remSecs.toStr()
            else
                m.timestampLabel.text = mins.toStr() + ":" + remSecs.toStr()
            end if
        end if
        
        if data.factCheck <> invalid and data.factCheck.approved = true
            if data.factCheck.status = "VERIFIED_TRUE"
                m.topAccent.color = "0x34D399FF"
            else if data.factCheck.status = "FALSE"
                m.topAccent.color = "0xEF4444FF"
            end if
        else
            m.topAccent.color = "0x38BDF8FF"
        end if

                
        

    end if
end sub

sub onStateChange()
    state = m.top.bubbleState
    if state = "OPEN"
        m.opacityInterp.keyValue = [m.bubbleGroup.opacity, 1.0]
        m.slideInterp.keyValue = [m.bubbleGroup.translation, [1250, 650]]
        m.fadeAnim.control = "start"
    else if state = "CLOSED"
        m.opacityInterp.keyValue = [m.bubbleGroup.opacity, 0.0]
        m.slideInterp.keyValue = [m.bubbleGroup.translation, [1250, 700]]
        m.fadeAnim.control = "start"
    end if
end sub



