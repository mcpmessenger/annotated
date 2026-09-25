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
    m.cardTimes = [m.card1Time, m.card2Time, m.card3Time]
    m.cardRawTimes = ["", "", ""]
    m.focusedCardIndex = 0
    m.currentPlayingCardIndex = -1
    m.cardTimestamps = [0, 45, 90]
    m.activeSyncIndex = -1
    m.annotations = invalid

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

    ' Observe video player position and state
    m.mainVideo.observeField("position", "onVideoPositionChanged")
    m.mainVideo.observeField("state", "onVideoStateChanged")

    ' Initial fallback video while fetching live annotations
    videoContent = createObject("RoSGNode", "ContentNode")
    videoContent.url = "http://192.168.4.22:8090/demo.mp4"
    videoContent.title = "Connecting live feed..."
    videoContent.streamformat = "mp4"
    m.mainVideo.content = videoContent
    m.mainVideo.control = "play"

    ' Spawn background Task to pull real live annotations from Supabase
    m.feedTask = CreateObject("roSGNode", "AnnotationFeedTask")
    m.feedTask.observeField("annotations", "onAnnotationsLoaded")
    m.feedTask.control = "RUN"

    m.top.setFocus(true)
    print "[Annotated] MainScene initialized. Ready in STATE_A (Passive Playback)."
end sub

function resolvePlayableVideoUrl(mediaUrl as Dynamic) as String
    if mediaUrl = invalid then return "http://192.168.4.22:8090/demo.mp4"
    mUrl = ""
    if type(mediaUrl) = "String" or type(mediaUrl) = "roString"
        mUrl = mediaUrl.trim()
    end if
    if mUrl = "" then return "http://192.168.4.22:8090/demo.mp4"

    ext = LCase(Right(mUrl, 4))
    ext5 = LCase(Right(mUrl, 5))
    if ext = ".mp4" or ext = ".m4v" or ext5 = ".m3u8"
        return mUrl
    end if

    ' If it is a webm stored in Supabase storage, proxy it through our local streaming media server
    if Instr(1, mUrl, "annotation-media/") > 0
        slashParts = mUrl.split("/")
        if slashParts.count() > 0
            filename = slashParts[slashParts.count() - 1]
            baseName = filename.replace(".webm", "")
            return "http://192.168.4.22:8090/clip/" + baseName + ".mp4"
        end if
    end if

    return "http://192.168.4.22:8090/demo.mp4"
end function

sub playAnnotationVideo(index as Integer)
    if m.annotations = invalid or index < 0 or index >= m.annotations.count()
        return
    end if

    item = m.annotations[index]
    videoUrl = resolvePlayableVideoUrl(item.media_url)

    title = "Annotated Community Clip"
    if item.page_title <> invalid and item.page_title <> ""
        title = item.page_title
    end if

    print "[Annotated Video Selector] Playing Card ["; index; "]: "; title; " -> "; videoUrl
    m.videoTitle.text = title

    videoContent = createObject("RoSGNode", "ContentNode")
    videoContent.url = videoUrl
    videoContent.title = title
    videoContent.streamformat = "mp4"

    m.mainVideo.content = videoContent
    m.mainVideo.control = "play"
    m.currentPlayingCardIndex = index

    updateCardPlayingIndicator()
end sub

sub updateCardPlayingIndicator()
    for i = 0 to m.cardTimes.count() - 1
        lbl = m.cardTimes[i]
        if lbl <> invalid
            if i = m.currentPlayingCardIndex
                lbl.text = "PLAYING"
                lbl.color = "0x34D399FF" ' Emerald green
            else
                if m.cardRawTimes[i] <> invalid and m.cardRawTimes[i] <> ""
                    lbl.text = m.cardRawTimes[i]
                else
                    lbl.text = "Recent"
                end if
                lbl.color = "0x94A3B8FF" ' Muted slate
            end if
        end if
    end for
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
            m.remoteHint.text = "[Back] Video   [^/v] Select   [OK] Play Video"
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
    vDur = 41
    if m.mainVideo.duration <> invalid and m.mainVideo.duration > 0 then vDur = m.mainVideo.duration

    posSecTotal = 0
    durSecTotal = 41
    
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
        ' In State A, update the accent bar of the currently active annotation
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
    tsStr = ""
    if type(raw) = "String" or type(raw) = "roString"
        tsStr = raw.trim()
    else if type(raw) = "Integer" or type(raw) = "roInt" or type(raw) = "Float" or type(raw) = "roFloat"
        tsStr = Str(raw).trim()
    end if
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

    m.annotations = annotations
    m.totalNotesCount = annotations.count()
    print "[Annotated] Binding "; m.totalNotesCount; " live annotations to UI!"
    if m.uiState = "STATE_A"
        m.railCount.text = Str(m.totalNotesCount).trim() + " Notes"
    end if

    ' 1. Card 1 (Top Annotation)
    if annotations.count() > 0
        a1 = annotations[0]

        m.card1Author.text = "@annotated"
        if a1.hostname <> invalid and a1.hostname <> ""
            m.card1Author.text = "@" + a1.hostname
        end if

        if a1.media_timestamp <> invalid and a1.media_timestamp <> ""
            m.cardRawTimes[0] = a1.media_timestamp
            ts1 = parseTimestampToSeconds(a1.media_timestamp)
            if ts1 >= 0 then m.cardTimestamps[0] = ts1
        else
            m.cardRawTimes[0] = "00:00"
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
            m.cardRawTimes[1] = a2.media_timestamp
            ts2 = parseTimestampToSeconds(a2.media_timestamp)
            if ts2 >= 0 then m.cardTimestamps[1] = ts2
        else
            m.cardRawTimes[1] = "00:15"
            m.cardTimestamps[1] = 15
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
            m.cardRawTimes[2] = a3.media_timestamp
            ts3 = parseTimestampToSeconds(a3.media_timestamp)
            if ts3 >= 0 then m.cardTimestamps[2] = ts3
        else
            m.cardRawTimes[2] = "00:30"
            m.cardTimestamps[2] = 30
        end if

        if a3.comment <> invalid and a3.comment <> ""
            m.card3Note.text = cleanText(a3.comment)
        end if
    end if

    ' Automatically play the genuine video belonging to the first community annotation!
    playAnnotationVideo(0)
    print "[Annotated] Initial community video clip loaded and playing!"
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
                ' Pressing OK plays the genuine video of the currently selected card!
                print "[Annotated] Remote OK pressed on Card "; m.focusedCardIndex; " -> Switching to selected video!"
                playAnnotationVideo(m.focusedCardIndex)
                handled = true
            end if
        end if
    end if

    return handled
end function
