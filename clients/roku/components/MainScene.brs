sub init()
    m.bgRect = m.top.findNode("bgRect")
    m.mainVideo = m.top.findNode("mainVideo")
    m.videoTitle = m.top.findNode("videoTitle")
    m.railCount = m.top.findNode("railCount")
    m.remoteHint = m.top.findNode("remoteHint")
    m.timestampBadge = m.top.findNode("timestampBadge")

    m.btnFactCheck = m.top.findNode("btnFactCheck")
    m.btnFire = m.top.findNode("btnFire")
    m.btnThink = m.top.findNode("btnThink")
    m.btnIdea = m.top.findNode("btnIdea")
    m.btnHundred = m.top.findNode("btnHundred")
    m.btnDown = m.top.findNode("btnDown")
    m.factCheckBanner = m.top.findNode("factCheckBanner")
    m.railGroup = m.top.findNode("railGroup")
    m.railBackdropGroup = m.top.findNode("railBackdropGroup")
    m.railHeaderBg = m.top.findNode("railHeaderBg")
    m.totalNotesCount = 0

    m.card1 = m.top.findNode("card1")
    m.card1Outline = m.top.findNode("card1Outline")
    m.card1Accent = m.top.findNode("card1Accent")
    m.card1Author = m.top.findNode("card1Author")
    m.card1Time = m.top.findNode("card1Time")
    m.card1Quote = m.top.findNode("card1Quote")
    m.card1Note = m.top.findNode("card1Note")

    m.card2 = m.top.findNode("card2")
    m.card2Outline = m.top.findNode("card2Outline")
    m.card2Accent = m.top.findNode("card2Accent")
    m.card2Author = m.top.findNode("card2Author")
    m.card2Time = m.top.findNode("card2Time")
    m.card2Note = m.top.findNode("card2Note")

    m.card3 = m.top.findNode("card3")
    m.card3Outline = m.top.findNode("card3Outline")
    m.card3Accent = m.top.findNode("card3Accent")
    m.card3Author = m.top.findNode("card3Author")
    m.card3Time = m.top.findNode("card3Time")
    m.card3Note = m.top.findNode("card3Note")

    m.buttons = [m.btnFactCheck, m.btnFire, m.btnThink, m.btnIdea, m.btnHundred, m.btnDown]
    m.focusedButtonIndex = 0

    m.cards = [m.card1, m.card2, m.card3]
    m.cardOutlines = [m.card1Outline, m.card2Outline, m.card3Outline]
    m.cardAccents = [m.card1Accent, m.card2Accent, m.card3Accent]
    m.focusedCardIndex = 0
    m.cardTimestamps = [0, 45, 90]
    m.activeSyncIndex = -1

    ' Interaction States: STATE_A (Passive Playback) or STATE_B (Active Browsing)
    m.uiState = "STATE_A"
    updateButtonFocus()

    ' Cinematic Intro Elements
    m.introOverlay = m.top.findNode("introOverlay")
    m.introAnim = m.top.findNode("introAnim")
    if m.introAnim <> invalid
        m.introAnim.observeField("state", "onIntroAnimState")
        m.introAnim.control = "start"
    end if

    ' Inspect Video node fields for audio ducking support
    print "[Annotated] Checking Video Node Audio Fields:"
    for each f in m.mainVideo.getFields()
        fLower = LCase(f)
        if Instr(1, fLower, "vol") > 0 or Instr(1, fLower, "audio") > 0 or Instr(1, fLower, "mute") > 0
            print "  - Field: "; f; " = "; m.mainVideo[f]
        end if
    end for

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
    print "[Annotated] MainScene initialized. Ready in STATE_A (Passive Playback)."
end sub

sub setVideoDucking(duck as Boolean)
    if m.mainVideo = invalid then return

    if m.mainVideo.hasField("volume")
        if duck
            m.mainVideo.volume = 30
        else
            m.mainVideo.volume = 100
        end if
        print "[Annotated Audio] Video volume set to: "; m.mainVideo.volume
    else if m.mainVideo.hasField("audioVolume")
        if duck
            m.mainVideo.audioVolume = 0.3
        else
            m.mainVideo.audioVolume = 1.0
        end if
        print "[Annotated Audio] Video audioVolume set to: "; m.mainVideo.audioVolume
    else
        print "[Annotated Audio] Hardware audio ducking state toggled: "; duck
    end if
end sub

sub setUIState(newState as String)
    m.uiState = newState
    if m.uiState = "STATE_B"
        ' Transition to Active Browsing
        if m.railBackdropGroup <> invalid then m.railBackdropGroup.visible = true
        if m.railHeaderBg <> invalid then m.railHeaderBg.color = "0x0C4A6EFF"
        if m.railCount <> invalid
            m.railCount.text = "BROWSING"
            m.railCount.color = "0x38BDF8FF"
        end if
        setVideoDucking(true)
        updateCardFocus()
        if m.remoteHint <> invalid
            m.remoteHint.text = "[Back] Video   [^/v] Select   [OK] Jump"
        end if
        print "[Annotated UI] Entered STATE_B: Active Rail Browsing (Audio Ducked to 30%)."
    else
        ' Return to Passive Playback
        m.uiState = "STATE_A"
        if m.railBackdropGroup <> invalid then m.railBackdropGroup.visible = false
        if m.railHeaderBg <> invalid then m.railHeaderBg.color = "0x1E293BFF"
        if m.railCount <> invalid
            m.railCount.text = Str(m.totalNotesCount).trim() + " Notes"
            m.railCount.color = "0x38BDF8FF"
        end if
        setVideoDucking(false)
        for i = 0 to m.cardOutlines.count() - 1
            if m.cardOutlines[i] <> invalid then m.cardOutlines[i].visible = false
        end for
        updateButtonFocus()
        if m.remoteHint <> invalid
            m.remoteHint.text = "[*] Notes   [>] Enter   [OK] Action"
        end if
        print "[Annotated UI] Returned to STATE_A: Passive Playback (100% Volume)."
    end if
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

    ' --- Auto-Scroll Timeline Sync for State A ---
    activeIdx = 0
    if m.cardTimestamps.count() >= 3 and posSecTotal >= m.cardTimestamps[2] and m.cardTimestamps[2] > 0
        activeIdx = 2
    else if m.cardTimestamps.count() >= 2 and posSecTotal >= m.cardTimestamps[1] and m.cardTimestamps[1] > 0
        activeIdx = 1
    else
        activeIdx = 0
    end if

    if activeIdx <> m.activeSyncIndex
        m.activeSyncIndex = activeIdx
        ' In State A, update the accent bar of the currently playing annotation
        if m.uiState = "STATE_A"
            for i = 0 to m.cardAccents.count() - 1
                accent = m.cardAccents[i]
                if accent <> invalid
                    if i = m.activeSyncIndex
                        accent.color = "0x38BDF8FF" ' Cyan active highlight
                    else
                        accent.color = "0x1E293BFF" ' Muted slate
                    end if
                end if
            end for
            print "[Annotated Sync] Timeline at " + posMStr + ":" + posSStr + " -> Active Sync Card " + Str(m.activeSyncIndex + 1).trim()
        end if
    end if
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

function parseTimestampToSeconds(raw as Dynamic) as Integer
    if raw = invalid then return -1
    tsStr = Str(raw).trim()
    if tsStr = "" then return -1

    parts = tsStr.split(":")
    if parts.count() = 1
        return Val(parts[0])
    else if parts.count() = 2
        minVal = Val(parts[0])
        secVal = Val(parts[1])
        return (minVal * 60) + secVal
    else if parts.count() = 3
        hourVal = Val(parts[0])
        minVal = Val(parts[1])
        secVal = Val(parts[2])
        return (hourVal * 3600) + (minVal * 60) + secVal
    end if
    return -1
end function

sub onAnnotationsLoaded()
    annotations = m.feedTask.annotations
    if annotations = invalid or annotations.count() = 0
        print "[Annotated] No annotations returned from feed task."
        m.railCount.text = "0 Notes"
        return
    end if

    m.totalNotesCount = annotations.count()
    print "[Annotated] Binding "; m.totalNotesCount; " live annotations to UI!"
    if m.uiState = "STATE_A"
        m.railCount.text = Str(m.totalNotesCount).trim() + " Notes"
    end if

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
            ts1 = parseTimestampToSeconds(a1.media_timestamp)
            if ts1 >= 0 then m.cardTimestamps[0] = ts1
        else
            m.card1Time.text = "00:00"
            m.cardTimestamps[0] = 0
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
            ts2 = parseTimestampToSeconds(a2.media_timestamp)
            if ts2 >= 0 then m.cardTimestamps[1] = ts2
        else
            m.card2Time.text = "01:15"
            m.cardTimestamps[1] = 75
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
            ts3 = parseTimestampToSeconds(a3.media_timestamp)
            if ts3 >= 0 then m.cardTimestamps[2] = ts3
        else
            m.card3Time.text = "03:40"
            m.cardTimestamps[2] = 220
        end if

        if a3.comment <> invalid and a3.comment <> ""
            m.card3Note.text = cleanText(a3.comment)
        end if
    end if

    print "[Annotated] Parsed note timestamps (sec): "; m.cardTimestamps[0]; ", "; m.cardTimestamps[1]; ", "; m.cardTimestamps[2]
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

sub updateCardFocus()
    for i = 0 to m.cards.count() - 1
        card = m.cards[i]
        outline = m.cardOutlines[i]
        accent = m.cardAccents[i]
        if i = m.focusedCardIndex
            if outline <> invalid then outline.visible = true
            if card <> invalid then card.color = "0x1E293BFF" ' Highlighted card surface
            if accent <> invalid then accent.color = "0x38BDF8FF"
        else
            if outline <> invalid then outline.visible = false
            if card <> invalid
                if i = 0
                    card.color = "0x0F172AFF"
                else
                    card.color = "0x111827FF"
                end if
            end if
            if accent <> invalid then accent.color = "0x1E293BFF"
        end if
    end for
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    handled = false

    if press
        print "[Annotated] Remote key: '"; key; "' in State: "; m.uiState

        if m.uiState = "STATE_A"
            ' --- State A: Passive Playback / Action Pills ---
            if key = "right"
                if m.focusedButtonIndex < m.buttons.count() - 1
                    m.focusedButtonIndex = m.focusedButtonIndex + 1
                    updateButtonFocus()
                    handled = true
                else
                    ' Navigating past the rightmost reaction button transitions into State B (Rail)!
                    setUIState("STATE_B")
                    handled = true
                end if
            else if key = "left"
                if m.focusedButtonIndex > 0
                    m.focusedButtonIndex = m.focusedButtonIndex - 1
                    updateButtonFocus()
                    handled = true
                end if
            else if key = "options" ' [*] Star Key
                ' Star key toggles active rail browsing mode
                setUIState("STATE_B")
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

        else if m.uiState = "STATE_B"
            ' --- State B: Active Rail Browsing ---
            if key = "up"
                if m.focusedCardIndex > 0
                    m.focusedCardIndex = m.focusedCardIndex - 1
                    updateCardFocus()
                    handled = true
                end if
            else if key = "down"
                if m.focusedCardIndex < m.cards.count() - 1
                    m.focusedCardIndex = m.focusedCardIndex + 1
                    updateCardFocus()
                    handled = true
                end if
            else if key = "left" or key = "back"
                ' Left or Back returns to State A (Passive Playback)
                setUIState("STATE_A")
                handled = true
            else if key = "options"
                ' Star key toggles back to State A
                setUIState("STATE_A")
                handled = true
            else if key = "OK"
                ' Pressing OK seeks the video to this note's timestamp!
                seekSec = m.cardTimestamps[m.focusedCardIndex]
                if seekSec <> invalid and seekSec >= 0
                    print "[Annotated] Seeking video to note timestamp: "; seekSec; "s"
                    m.mainVideo.seek = seekSec
                end if
                handled = true
            end if
        end if
    end if

    return handled
end function
