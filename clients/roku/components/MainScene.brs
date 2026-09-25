sub init()
    m.bgRect = m.top.findNode("bgRect")
    m.mainVideo = m.top.findNode("mainVideo")
    m.videoTitle = m.top.findNode("videoTitle")
    m.railCount = m.top.findNode("railCount")

    m.btnFactCheck = m.top.findNode("btnFactCheck")
    m.btnFire = m.top.findNode("btnFire")
    m.btnThink = m.top.findNode("btnThink")
    m.btnIdea = m.top.findNode("btnIdea")
    m.btnHundred = m.top.findNode("btnHundred")
    m.btnDown = m.top.findNode("btnDown")
    m.factCheckBanner = m.top.findNode("factCheckBanner")
    m.railGroup = m.top.findNode("railGroup")

    m.card1Author = m.top.findNode("card1Author")
    m.card1Time = m.top.findNode("card1Time")
    m.card1Quote = m.top.findNode("card1Quote")
    m.card1Note = m.top.findNode("card1Note")

    m.card2Author = m.top.findNode("card2Author")
    m.card2Time = m.top.findNode("card2Time")
    m.card2Note = m.top.findNode("card2Note")

    m.card3Author = m.top.findNode("card3Author")
    m.card3Time = m.top.findNode("card3Time")
    m.card3Note = m.top.findNode("card3Note")

    m.buttons = [m.btnFactCheck, m.btnFire, m.btnThink, m.btnIdea, m.btnHundred, m.btnDown]
    m.focusedButtonIndex = 0

    updateButtonFocus()

    ' Cinematic Intro Elements
    m.introOverlay = m.top.findNode("introOverlay")
    m.introAnim = m.top.findNode("introAnim")
    if m.introAnim <> invalid
        m.introAnim.observeField("state", "onIntroAnimState")
        m.introAnim.control = "start"
    end if

    m.timestampBadge = m.top.findNode("timestampBadge")

    ' Configure Annotated official demo content video stream
    videoContent = createObject("RoSGNode", "ContentNode")
    videoContent.url = "http://192.168.4.22:8090"
    videoContent.title = "Annotated Product Demo & Community Overview"
    videoContent.streamformat = "mp4"
    m.mainVideo.content = videoContent
    m.mainVideo.observeField("position", "onVideoPositionChanged")
    m.mainVideo.observeField("state", "onVideoStateChanged")
    m.mainVideo.control = "play"

    ' Spawn background Task to pull real live annotations from Supabase
    m.feedTask = CreateObject("roSGNode", "AnnotationFeedTask")
    m.feedTask.observeField("annotations", "onAnnotationsLoaded")
    m.feedTask.control = "RUN"

    m.top.setFocus(true)
    print "[Annotated] MainScene initialized. Playing Annotated Demo.mp4 from workstation."
end sub

sub onVideoPositionChanged()
    vPos = 0
    if m.mainVideo.position <> invalid then vPos = m.mainVideo.position
    vDur = 634
    if m.mainVideo.duration <> invalid and m.mainVideo.duration > 0 then vDur = m.mainVideo.duration

    posSecTotal = 0
    durSecTotal = 634
    
    posParts = Str(vPos).trim().split(".")
    if posParts.count() > 0 then posSecTotal = Val(posParts[0])

    durParts = Str(vDur).trim().split(".")
    if durParts.count() > 0 then durSecTotal = Val(durParts[0])

    posMin = posSecTotal \ 60
    posSec = posSecTotal - (posMin * 60)
    durMin = durSecTotal \ 60
    durSec = durSecTotal - (durMin * 60)

    posMStr = Str(posMin).trim()
    posSStr = Str(posSec).trim()
    durMStr = Str(durMin).trim()
    durSStr = Str(durSec).trim()

    if posMin < 10 then posMStr = "0" + posMStr
    if posSec < 10 then posSStr = "0" + posSStr
    if durMin < 10 then durMStr = "0" + durMStr
    if durSec < 10 then durSStr = "0" + durSStr

    m.timestampBadge.text = posMStr + ":" + posSStr + " / " + durMStr + ":" + durSStr
end sub

sub onVideoStateChanged()
    print "[Annotated] Video Player state changed: "; m.mainVideo.state
    if m.mainVideo.state = "error"
        print "[Annotated] Video Player error: "; m.mainVideo.errorStr; " code: "; m.mainVideo.errorCode
    end if
end sub

sub onIntroAnimState()
    if m.introAnim.state = "stopped"
        m.introOverlay.visible = false
        print "[Annotated] Cinematic intro completed. Revealing live dashboard."
    end if
end sub

function cleanText(raw as Dynamic) as String
    if raw = invalid then return ""
    clean = raw
    clean = clean.replace(chr(10), " ")
    clean = clean.replace(chr(13), " ")
    clean = clean.replace("🎬", "")
    clean = clean.replace("⏱️", "")
    clean = clean.replace("⏱", "")
    clean = clean.replace("💡", "")
    clean = clean.replace("🔥", "")
    clean = clean.replace("💯", "")
    clean = clean.replace("🤔", "")
    clean = clean.replace("⚡", "")
    return clean.trim()
end function

sub onAnnotationsLoaded()
    annotations = m.feedTask.annotations
    if annotations = invalid or annotations.count() = 0
        print "[Annotated] No annotations returned from feed task."
        m.railCount.text = "0 Notes"
        return
    end if

    print "[Annotated] Binding "; annotations.count(); " live annotations to UI!"
    m.railCount.text = Str(annotations.count()).trim() + " Notes"

    ' 1. Card 1 (Top Annotation)
    if annotations.count() > 0
        a1 = annotations[0]
        if a1.page_title <> invalid and a1.page_title <> ""
            m.videoTitle.text = a1.page_title
        end if

        ' Dynamic Content Stream Binding: If this annotation has an associated mp4/hls clip, load it!
        if a1.media_url <> invalid and a1.media_url <> ""
            ext = LCase(Right(a1.media_url, 4))
            ext5 = LCase(Right(a1.media_url, 5))
            if ext = ".mp4" or ext = ".m4v" or ext5 = ".m3u8"
                print "[Annotated] Loading user annotation video stream: "; a1.media_url
                userClip = createObject("RoSGNode", "ContentNode")
                userClip.url = a1.media_url
                if a1.page_title <> invalid then userClip.title = a1.page_title
                if ext5 = ".m3u8"
                    userClip.streamformat = "hls"
                else
                    userClip.streamformat = "mp4"
                end if
                m.mainVideo.content = userClip
                m.mainVideo.control = "play"
            end if
        end if

        m.card1Author.text = "@annotated"
        if a1.hostname <> invalid and a1.hostname <> ""
            m.card1Author.text = "@" + a1.hostname
        end if

        if a1.media_timestamp <> invalid and a1.media_timestamp <> ""
            m.card1Time.text = a1.media_timestamp
        else
            m.card1Time.text = "Recent"
        end if

        if a1.quote <> invalid and a1.quote <> ""
            m.card1Quote.text = """" + Left(cleanText(a1.quote), 60) + "..."""
        else
            m.card1Quote.text = """Annotated Web Commentary"""
        end if

        if a1.comment <> invalid and a1.comment <> ""
            m.card1Note.text = cleanText(a1.comment)
        end if
    end if

    ' 2. Card 2
    if annotations.count() > 1
        a2 = annotations[1]
        if a2.hostname <> invalid and a2.hostname <> ""
            m.card2Author.text = "@" + a2.hostname
        end if

        if a2.media_timestamp <> invalid and a2.media_timestamp <> ""
            m.card2Time.text = a2.media_timestamp
        else
            m.card2Time.text = "Recent"
        end if

        if a2.comment <> invalid and a2.comment <> ""
            m.card2Note.text = cleanText(a2.comment)
        end if
    end if

    ' 3. Card 3
    if annotations.count() > 2
        a3 = annotations[2]
        if a3.hostname <> invalid and a3.hostname <> ""
            m.card3Author.text = "@" + a3.hostname
        end if

        if a3.media_timestamp <> invalid and a3.media_timestamp <> ""
            m.card3Time.text = a3.media_timestamp
        else
            m.card3Time.text = "Recent"
        end if

        if a3.comment <> invalid and a3.comment <> ""
            m.card3Note.text = cleanText(a3.comment)
        end if
    end if
end sub

sub updateButtonFocus()
    for i = 0 to m.buttons.count() - 1
        btn = m.buttons[i]
        if i = m.focusedButtonIndex
            if i = 0
                btn.color = "0x059669FF" ' Brighter Emerald for Fact-Check focus
            else
                btn.color = "0x2563EBFF" ' Blue focus for reactions
            end if
        else
            if i = 0
                btn.color = "0x064E3BFF" ' Default muted emerald
            else
                btn.color = "0x1F2937FF" ' Default secondary card color
            end if
        end if
    end for
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    handled = false

    if press
        print "[Annotated] Remote key pressed: "; key

        if key = "right"
            if m.focusedButtonIndex < m.buttons.count() - 1
                m.focusedButtonIndex = m.focusedButtonIndex + 1
                updateButtonFocus()
                handled = true
            end if
        else if key = "left"
            if m.focusedButtonIndex > 0
                m.focusedButtonIndex = m.focusedButtonIndex - 1
                updateButtonFocus()
                handled = true
            end if
        else if key = "options" ' [*] Star Key
            ' Toggle annotation rail visibility
            m.railGroup.visible = not m.railGroup.visible
            print "[Annotated] Annotation rail toggled: "; m.railGroup.visible
            handled = true
        else if key = "OK"
            if m.focusedButtonIndex = 0
                ' Toggle fact-check banner
                m.factCheckBanner.visible = not m.factCheckBanner.visible
                print "[Annotated] Fact-Check banner toggled: "; m.factCheckBanner.visible
            else
                print "[Annotated] Reaction button clicked index: "; m.focusedButtonIndex
            end if
            handled = true
        end if
    end if

    return handled
end function
