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

    ' Action Bar Dynamic Reaction Count Labels
    m.lblFireCount = m.top.findNode("lblFireCount")
    m.lblThinkCount = m.top.findNode("lblThinkCount")
    m.lblIdeaCount = m.top.findNode("lblIdeaCount")
    m.lblHundredCount = m.top.findNode("lblHundredCount")
    m.lblDownCount = m.top.findNode("lblDownCount")

    ' Fact Check Dynamic Banner & Button Elements
    m.fcBorder = m.top.findNode("fcBorder")
    m.fcIcon = m.top.findNode("fcIcon")
    m.fcHeadline = m.top.findNode("fcHeadline")
    m.fcDetail = m.top.findNode("fcDetail")
    m.btnFcIcon = m.top.findNode("btnFcIcon")
    m.lblFactCheck = m.top.findNode("lblFactCheck")

    ' Rail Card Dynamic Metrics & Fact Check Badges
    m.card1EmojiPoster = m.top.findNode("card1EmojiPoster")
    m.card1FireCount = m.top.findNode("card1FireCount")
    m.card1IdeaCount = m.top.findNode("card1IdeaCount")
    m.card1FcIcon = m.top.findNode("card1FcIcon")
    m.card1FcLabel = m.top.findNode("card1FcLabel")

    m.card2EmojiPoster = m.top.findNode("card2EmojiPoster")
    m.card2HundredCount = m.top.findNode("card2HundredCount")
    m.card2ThinkCount = m.top.findNode("card2ThinkCount")
    m.card2FcIcon = m.top.findNode("card2FcIcon")
    m.card2FcLabel = m.top.findNode("card2FcLabel")

    m.card3EmojiPoster = m.top.findNode("card3EmojiPoster")
    m.card3FireCount = m.top.findNode("card3FireCount")
    m.card3IdeaCount = m.top.findNode("card3IdeaCount")
    m.card3FcIcon = m.top.findNode("card3FcIcon")
    m.card3FcLabel = m.top.findNode("card3FcLabel")

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
    m.card2Quote = m.top.findNode("card2Quote")
    m.card2Note = m.top.findNode("card2Note")

    m.card3 = m.top.findNode("card3")
    m.card3Outline = m.top.findNode("card3Outline")
    m.card3Accent = m.top.findNode("card3Accent")
    m.card3Author = m.top.findNode("card3Author")
    m.card3Time = m.top.findNode("card3Time")
    m.card3Quote = m.top.findNode("card3Quote")
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
    m.railStartIndex = 0
    m.cardTimestamps = [0, 45, 90]
    m.activeSyncIndex = -1
    m.annotations = invalid

    ' Expanded Detail Modal Elements
    m.detailModalGroup = m.top.findNode("detailModalGroup")
    m.modalPlatformText = m.top.findNode("modalPlatformText")
    m.modalAuthor = m.top.findNode("modalAuthor")
    m.modalFullQuote = m.top.findNode("modalFullQuote")
    m.modalFullComment = m.top.findNode("modalFullComment")
    m.modalEmojiIcon = m.top.findNode("modalEmojiIcon")
    m.modalFcBox = m.top.findNode("modalFcBox")
    m.modalFcIcon = m.top.findNode("modalFcIcon")
    m.modalFcHeadline = m.top.findNode("modalFcHeadline")
    m.modalFcDetail = m.top.findNode("modalFcDetail")
    m.modalQrPoster = m.top.findNode("modalQrPoster")
    m.modalUrlLabel = m.top.findNode("modalUrlLabel")
    m.btnModalPlay = m.top.findNode("btnModalPlay")
    m.btnModalClose = m.top.findNode("btnModalClose")
    m.isModalOpen = false
    m.modalItemIndex = -1
    m.focusedModalButton = 0

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
    videoContent.title = ""
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
    if mediaUrl = invalid then return ""
    mUrl = ""
    if type(mediaUrl) = "String" or type(mediaUrl) = "roString"
        mUrl = mediaUrl.trim()
    end if
    if mUrl = "" then return ""

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

    return mUrl
end function

sub playAnnotationVideo(index as Integer)
    if m.annotations = invalid or index < 0 or index >= m.annotations.count()
        return
    end if

    item = m.annotations[index]
    videoUrl = ""
    if item.video_url <> invalid and item.video_url <> ""
        videoUrl = item.video_url
    else
        videoUrl = resolvePlayableVideoUrl(item.media_url)
    end if

    title = "Annotated Community Clip"
    if item.page_title <> invalid and item.page_title <> ""
        title = item.page_title
    end if

    print "[Annotated Video Selector] Playing Card ["; index; "]: "; title; " -> "; videoUrl
    m.videoTitle.text = title

    videoContent = createObject("RoSGNode", "ContentNode")
    videoContent.url = videoUrl
    videoContent.title = ""
    videoContent.streamformat = "mp4"

    m.mainVideo.content = videoContent
    m.mainVideo.control = "play"
    m.currentPlayingCardIndex = index
    m.initialVideoPos = invalid
    m.clipStartTime = CreateObject("roDateTime").AsSeconds()

    ' Ensure right rail window centers and moves as videos play, keeping active on-screen note in view
    if index < m.railStartIndex
        m.railStartIndex = index
    else if index > m.railStartIndex + 2
        m.railStartIndex = index - 1
        if m.railStartIndex + 3 > m.annotations.count() then m.railStartIndex = m.annotations.count() - 3
        if m.railStartIndex < 0 then m.railStartIndex = 0
    end if

    slot = index - m.railStartIndex
    if slot >= 0 and slot < 3
        m.focusedCardIndex = slot
    end if

    renderRailCardsWindow()
    updateCardFocus()
    updateCardPlayingIndicator()
    updateStageMetrics(item)
end sub

sub updateStageMetrics(item as Object)
    if item = invalid then return

    ' 1. Real Emoji Reaction Counts from Supabase
    fire = 0
    think = 0
    idea = 0
    hundred = 0
    down = 0

    if item.reactions <> invalid
        if item.reactions.fire <> invalid then fire = item.reactions.fire
        if item.reactions.think <> invalid then think = item.reactions.think
        if item.reactions.idea <> invalid then idea = item.reactions.idea
        if item.reactions.hundred <> invalid then hundred = item.reactions.hundred
        if item.reactions.down <> invalid then down = item.reactions.down
    end if

    if m.lblFireCount <> invalid then m.lblFireCount.text = Str(fire).trim()
    if m.lblThinkCount <> invalid then m.lblThinkCount.text = Str(think).trim()
    if m.lblIdeaCount <> invalid then m.lblIdeaCount.text = Str(idea).trim()
    if m.lblHundredCount <> invalid then m.lblHundredCount.text = Str(hundred).trim()
    if m.lblDownCount <> invalid then m.lblDownCount.text = Str(down).trim()

    print "[Annotated Metrics] Card ["; m.currentPlayingCardIndex; "] Reactions -> Fire: "; fire; " Think: "; think; " Idea: "; idea; " 100: "; hundred; " Down: "; down

    ' 2. Dynamic Fact Check Status & Banner (Nordic Minimalist: Symbols & TL;DR)
    fc = item.fact_check
    status = "verified"
    headline = "VERIFIED ACCURATE"
    detail = "Primary sources cross-referenced and confirmed."
    pillText = "Verified"
    badgeColor = "0x34D399FF"
    bannerColor = "0x064E3BDD"
    borderColor = "0x34D399FF"
    iconUri = "pkg:/images/icon_bolt.png"

    if fc <> invalid
        if fc.status <> invalid then status = fc.status
        if fc.headline <> invalid then headline = fc.headline
        if fc.detail <> invalid then detail = fc.detail
        if fc.pillText <> invalid then pillText = fc.pillText
        if fc.badgeColor <> invalid then badgeColor = fc.badgeColor
        if fc.bannerColor <> invalid then bannerColor = fc.bannerColor
        if fc.borderColor <> invalid then borderColor = fc.borderColor
        if fc.icon <> invalid then iconUri = fc.icon
    else if item.is_disputed = true
        status = "disputed"
        headline = "DISPUTED CLAIM"
        detail = "Community reviewers flagged statement as disputed."
        pillText = "Disputed"
        badgeColor = "0xEF4444FF"
        bannerColor = "0x7F1D1DDD"
        borderColor = "0xEF4444FF"
        iconUri = "pkg:/images/icon_down.png"
    end if

    if m.factCheckBanner <> invalid then m.factCheckBanner.color = bannerColor
    if m.fcBorder <> invalid then m.fcBorder.color = borderColor
    if m.fcIcon <> invalid then m.fcIcon.uri = iconUri
    if m.fcHeadline <> invalid
        m.fcHeadline.text = headline
        m.fcHeadline.color = badgeColor
    end if
    if m.fcDetail <> invalid then m.fcDetail.text = detail

    if m.btnFactCheck <> invalid
        if status = "verified"
            m.btnFactCheck.color = "0x064E3BFF"
        else if status = "context_needed"
            m.btnFactCheck.color = "0x1E1B4BFF"
        else if status = "disputed"
            m.btnFactCheck.color = "0x7F1D1DFF"
        else
            m.btnFactCheck.color = "0x1F2937FF"
        end if
    end if
    if m.lblFactCheck <> invalid
        m.lblFactCheck.text = pillText
        m.lblFactCheck.color = badgeColor
    end if
    if m.btnFcIcon <> invalid then m.btnFcIcon.uri = iconUri

    print "[Annotated FactCheck] Card ["; m.currentPlayingCardIndex; "] Status: "; status; " -> "; headline
end sub

sub updateCardPlayingIndicator()
    for i = 0 to m.cardTimes.count() - 1
        lbl = m.cardTimes[i]
        if lbl <> invalid
            actualIdx = m.railStartIndex + i
            if actualIdx = m.currentPlayingCardIndex
                lbl.text = "PLAY"
                lbl.color = "0x34D399FF" ' Emerald green
            else
                if m.cardRawTimes[i] <> invalid and m.cardRawTimes[i] <> ""
                    lbl.text = m.cardRawTimes[i]
                else
                    lbl.text = "15s"
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
            m.remoteHint.text = "[Back] Video   [^/v] Browse   [OK] Details   [Play] Watch"
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
        updateCardFocus()
        updateButtonFocus()
        if m.remoteHint <> invalid
            m.remoteHint.text = "[*] Notes   [>] Rail   [OK] Action   [Info] Details"
        end if
        print "[Annotated UI] Returned to STATE_A: Passive Playback (100% Volume)."
    end if
end sub

sub updateModalButtonFocus()
    if m.btnModalPlay <> invalid
        if m.focusedModalButton = 0
            m.btnModalPlay.color = "0x059669FF"
        else
            m.btnModalPlay.color = "0x064E3BFF"
        end if
    end if
    if m.btnModalClose <> invalid
        if m.focusedModalButton = 1
            m.btnModalClose.color = "0x2563EBFF"
        else
            m.btnModalClose.color = "0x1F2937FF"
        end if
    end if
end sub

sub openDetailModal(index as Integer)
    if m.annotations = invalid or index < 0 or index >= m.annotations.count() then return
    item = m.annotations[index]
    m.modalItemIndex = index
    m.isModalOpen = true
    m.focusedModalButton = 0
    updateModalButtonFocus()

    ' 1. Author and Platform
    if m.modalAuthor <> invalid
        if item.hostname <> invalid and item.hostname <> ""
            if Left(item.hostname, 1) = "@"
                m.modalAuthor.text = item.hostname
            else
                m.modalAuthor.text = "@" + item.hostname
            end if
        else
            m.modalAuthor.text = "@annotated"
        end if
    end if

    if m.modalPlatformText <> invalid
        if item.url <> invalid and (Instr(1, item.url, "x.com") > 0 or Instr(1, item.url, "twitter.com") > 0)
            m.modalPlatformText.text = "X / TWITTER ANNOTATION"
        else if item.is_video = true
            m.modalPlatformText.text = "VIDEO ANNOTATION"
        else
            m.modalPlatformText.text = "ANNOTATION"
        end if
    end if

    ' 2. Full Quote (no cut-offs)
    if m.modalFullQuote <> invalid
        q = ""
        if item.full_quote <> invalid and item.full_quote <> ""
            q = cleanText(item.full_quote)
        else if item.quote <> invalid and item.quote <> ""
            q = cleanText(item.quote)
        else if item.page_title <> invalid and item.page_title <> ""
            q = cleanText(item.page_title)
        end if
        if Left(q, 12) = "Video Clip (" and Right(q, 1) = ")"
            q = Mid(q, 13, Len(q) - 13)
        end if
        q = q.replace("- YouTube", "").trim()
        m.modalFullQuote.text = """" + q + """"
    end if

    ' 3. Full Comment & Emoji Icon
    if m.modalFullComment <> invalid
        cText = ""
        if item.full_comment <> invalid and item.full_comment <> ""
            cText = cleanText(item.full_comment)
        else if item.comment <> invalid and item.comment <> ""
            cText = cleanText(item.comment)
        end if
        if cText = "" then cText = "Community Annotation"
        m.modalFullComment.text = cText
    end if

    if m.modalEmojiIcon <> invalid
        if item.emoji_icon <> invalid and item.emoji_icon <> ""
            m.modalEmojiIcon.uri = item.emoji_icon
        else
            m.modalEmojiIcon.uri = "pkg:/images/icon_idea.png"
        end if
    end if

    ' 4. Fact Check Status (Intuitive TL;DR symbols)
    fc = item.fact_check
    if fc <> invalid
        if m.modalFcIcon <> invalid and fc.icon <> invalid then m.modalFcIcon.uri = fc.icon
        if m.modalFcHeadline <> invalid
            hl = "VERIFIED ACCURATE"
            if fc.headline <> invalid then hl = fc.headline
            m.modalFcHeadline.text = hl
            if fc.badgeColor <> invalid then m.modalFcHeadline.color = fc.badgeColor
        end if
        if m.modalFcDetail <> invalid and fc.detail <> invalid then m.modalFcDetail.text = fc.detail
    end if

    ' 5. QR Code & Short URL
    if m.modalQrPoster <> invalid
        if item.qr_url <> invalid and item.qr_url <> ""
            m.modalQrPoster.uri = item.qr_url
        else
            m.modalQrPoster.uri = "http://192.168.4.22:8090/qr/" + item.id + ".png"
        end if
    end if

    if m.modalUrlLabel <> invalid
        m.modalUrlLabel.text = "annotated.com/n/" + Left(item.id, 8)
    end if

    ' Show modal and duck audio
    if m.detailModalGroup <> invalid then m.detailModalGroup.visible = true
    setVideoDucking(true)
    print "[Annotated Modal] Opened Expanded Detail Modal for Note ["; index; "]: "; item.id
end sub

sub closeDetailModal()
    if m.detailModalGroup <> invalid then m.detailModalGroup.visible = false
    m.isModalOpen = false
    if m.uiState = "STATE_A"
        setVideoDucking(false)
    end if
    print "[Annotated Modal] Closed Detail Modal."
end sub

sub onVideoPositionChanged()
    vPos = 0
    if m.mainVideo.position <> invalid then vPos = m.mainVideo.position
    vDur = 0
    if m.mainVideo.duration <> invalid and m.mainVideo.duration > 0 then vDur = m.mainVideo.duration

    posSecTotal = 0
    durSecTotal = 0
    
    posParts = Str(vPos).trim().split(".")
    if posParts.count() > 0 then posSecTotal = Val(posParts[0])

    durParts = Str(vDur).trim().split(".")
    if durParts.count() > 0 then durSecTotal = Val(durParts[0])

    if posSecTotal > durSecTotal and durSecTotal > 0
        if m.initialVideoPos = invalid or m.initialVideoPos = 0
            m.initialVideoPos = posSecTotal
        end if
        posSecTotal = posSecTotal - m.initialVideoPos
        if posSecTotal < 0 then posSecTotal = 0
    else
        m.initialVideoPos = 0
    end if

    activeItem = invalid
    if m.annotations <> invalid and m.currentPlayingCardIndex >= 0 and m.currentPlayingCardIndex < m.annotations.count()
        activeItem = m.annotations[m.currentPlayingCardIndex]
    end if
    isVideoClip = false
    if activeItem <> invalid and activeItem.is_video = true
        isVideoClip = true
    end if

    ' Target display duration
    displayDur = durSecTotal
    if isVideoClip
        if displayDur <= 0 or displayDur > 90
            displayDur = 90
        end if
    else
        displayDur = 15
    end if

    posMin = posSecTotal \ 60
    posSec = posSecTotal - (posMin * 60)
    durMin = displayDur \ 60
    durSec = displayDur - (durMin * 60)

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

    nowTick = CreateObject("roDateTime").AsSeconds()
    elapsed = 0
    if m.clipStartTime <> invalid then elapsed = nowTick - m.clipStartTime

    if isVideoClip
        ' For full video clips: let video play up to natural duration or 90s max
        clipFinished = false
        if durSecTotal > 0 and posSecTotal >= (durSecTotal - 1)
            clipFinished = true
        else if posSecTotal >= 90 or elapsed >= 90
            clipFinished = true
        end if

        if clipFinished
            if m.lastAutoPlayTime = invalid or (nowTick - m.lastAutoPlayTime > 3)
                m.lastAutoPlayTime = nowTick
                print "[Annotated Watchdog] Full video clip finished or reached 90s cap (pos="; posSecTotal; " dur="; durSecTotal; " elapsed="; elapsed; "). Advancing to next!"
                playNextVideo()
                return
            end if
        end if
    else
        ' For stagnant slates: showcase for 15s then advance
        if elapsed >= 15
            if m.lastAutoPlayTime = invalid or (nowTick - m.lastAutoPlayTime > 3)
                m.lastAutoPlayTime = nowTick
                print "[Annotated Watchdog] 15s slate showcase elapsed. Advancing to next note!"
                playNextVideo()
                return
            end if
        end if
    end if
end sub

sub onVideoStateChanged()
    print "[Annotated] Video Player state changed: "; m.mainVideo.state
    if m.mainVideo.state = "error"
        print "[Annotated] Video Player error: "; m.mainVideo.errorStr; " code: "; m.mainVideo.errorCode
        nowTick = CreateObject("roDateTime").AsSeconds()
        if m.lastAutoPlayTime = invalid or (nowTick - m.lastAutoPlayTime > 3)
            m.lastAutoPlayTime = nowTick
            print "[Annotated] Recovering from player error. Advancing to next clip..."
            playNextVideo()
        end if
    else if m.mainVideo.state = "finished"
        nowTick = CreateObject("roDateTime").AsSeconds()
        if m.lastAutoPlayTime = invalid or (nowTick - m.lastAutoPlayTime > 3)
            m.lastAutoPlayTime = nowTick
            print "[Annotated Playlist] Video playback finished event received. Autoplaying next clip!"
            playNextVideo()
        end if
    end if
end sub

sub playNextVideo()
    if m.annotations = invalid or m.annotations.count() = 0 then return

    nextIndex = m.currentPlayingCardIndex + 1
    if nextIndex >= m.annotations.count()
        nextIndex = 0 ' Loop back to start of playlist
    end if

    print "[Annotated Playlist] Autoplay advancing to clip ["; nextIndex; " / "; m.annotations.count(); "]"

    ' Automatically advance rail scroll window so the active playing card is always visible in the right rail
    if nextIndex < m.railStartIndex
        m.railStartIndex = nextIndex
    else if nextIndex > m.railStartIndex + 2
        m.railStartIndex = nextIndex - 2
    else if nextIndex = m.railStartIndex + 2 and m.railStartIndex + 3 < m.annotations.count()
        m.railStartIndex = m.railStartIndex + 1
    end if

    renderRailCardsWindow()
    playAnnotationVideo(nextIndex)
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
    clean = clean.replace("💡", "[Idea] ")
    clean = clean.replace("🔥", "[Fire] ")
    clean = clean.replace("💯", "[100] ")
    clean = clean.replace("🤔", "[Think] ")
    clean = clean.replace("⚡", "[FactCheck] ")
    clean = clean.replace("👎", "[Disagree] ")
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

sub renderRailCardsWindow()
    if m.annotations = invalid or m.annotations.count() = 0 then return

    totalCount = m.annotations.count()
    if m.railStartIndex < 0 then m.railStartIndex = 0
    if m.railStartIndex > totalCount - 3 then m.railStartIndex = totalCount - 3
    if m.railStartIndex < 0 then m.railStartIndex = 0

    cardNodes = [
        { card: m.card1, author: m.card1Author, quote: m.card1Quote, note: m.card1Note, emojiPoster: m.card1EmojiPoster, fcLabel: m.card1FcLabel, fcIcon: m.card1FcIcon, fireCount: m.card1FireCount, ideaCount: m.card1IdeaCount },
        { card: m.card2, author: m.card2Author, quote: m.card2Quote, note: m.card2Note, emojiPoster: m.card2EmojiPoster, fcLabel: m.card2FcLabel, fcIcon: m.card2FcIcon, hundredCount: m.card2HundredCount, thinkCount: m.card2ThinkCount },
        { card: m.card3, author: m.card3Author, quote: m.card3Quote, note: m.card3Note, emojiPoster: m.card3EmojiPoster, fcLabel: m.card3FcLabel, fcIcon: m.card3FcIcon, fireCount: m.card3FireCount, ideaCount: m.card3IdeaCount }
    ]

    for slot = 0 to 2
        dataIdx = m.railStartIndex + slot
        cn = cardNodes[slot]
        if dataIdx < totalCount
            item = m.annotations[dataIdx]

            ' Author
            if cn.author <> invalid
                if item.hostname <> invalid and item.hostname <> ""
                    if Left(item.hostname, 1) = "@"
                        cn.author.text = item.hostname
                    else
                        cn.author.text = "@" + item.hostname
                    end if
                else
                    cn.author.text = "@annotated"
                end if
            end if

            ' Emoji intent badge icon
            if cn.emojiPoster <> invalid
                if item.emoji_icon <> invalid and item.emoji_icon <> ""
                    cn.emojiPoster.uri = item.emoji_icon
                else
                    cn.emojiPoster.uri = "pkg:/images/icon_idea.png"
                end if
            end if

            ' Timestamp
            if item.media_timestamp <> invalid and item.media_timestamp <> ""
                m.cardRawTimes[slot] = item.media_timestamp
                ts = parseTimestampToSeconds(item.media_timestamp)
                if ts >= 0 then m.cardTimestamps[slot] = ts
            else
                m.cardRawTimes[slot] = "15s"
                m.cardTimestamps[slot] = 0
            end if

            ' Quote / Context
            if cn.quote <> invalid
                q = ""
                if item.quote <> invalid and item.quote <> ""
                    q = cleanText(item.quote)
                    if Left(q, 12) = "Video Clip (" and Right(q, 1) = ")"
                        q = Mid(q, 13, Len(q) - 13)
                    end if
                else if item.page_title <> invalid and item.page_title <> ""
                    q = cleanText(item.page_title)
                else
                    q = "Annotated Community Note"
                end if
                q = q.replace("- YouTube", "").trim()
                cn.quote.text = """" + Left(q, 52) + "..."""
            end if

            ' Comment
            if cn.note <> invalid
                cText = cleanText(item.comment)
                if cText = ""
                    if item.page_title <> invalid then cText = cleanText(item.page_title) else cText = "Community annotation"
                end if
                cn.note.text = cText
            end if

            ' Reaction metrics
            if item.reactions <> invalid
                if cn.fireCount <> invalid and item.reactions.fire <> invalid then cn.fireCount.text = Str(item.reactions.fire).trim()
                if cn.ideaCount <> invalid and item.reactions.idea <> invalid then cn.ideaCount.text = Str(item.reactions.idea).trim()
                if cn.hundredCount <> invalid and item.reactions.hundred <> invalid then cn.hundredCount.text = Str(item.reactions.hundred).trim()
                if cn.thinkCount <> invalid and item.reactions.think <> invalid then cn.thinkCount.text = Str(item.reactions.think).trim()
            end if

            ' Fact Check pill & icon
            if item.fact_check <> invalid and cn.fcLabel <> invalid
                if item.fact_check.pillText <> invalid then cn.fcLabel.text = item.fact_check.pillText
                if item.fact_check.badgeColor <> invalid then cn.fcLabel.color = item.fact_check.badgeColor
                if cn.fcIcon <> invalid and item.fact_check.icon <> invalid then cn.fcIcon.uri = item.fact_check.icon
            end if
        end if
    end for

    updateCardPlayingIndicator()
    updateCardFocus()

    if m.uiState = "STATE_B"
        currentPos = m.railStartIndex + m.focusedCardIndex + 1
        m.railCount.text = Str(currentPos).trim() + " / " + Str(totalCount).trim()
    end if
end sub

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

    renderRailCardsWindow()

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
        actualIdx = m.railStartIndex + i

        isPlaying = (actualIdx = m.currentPlayingCardIndex)
        isBrowsingFocused = (m.uiState = "STATE_B" and i = m.focusedCardIndex)

        if isBrowsingFocused
            if outline <> invalid
                outline.visible = true
                outline.color = "0x38BDF8FF" ' Cyan focus border in active rail browsing
            end if
            if card <> invalid then card.color = "0x1E293BFF"
            if accent <> invalid then accent.color = "0x38BDF8FF"
        else if isPlaying
            if outline <> invalid
                outline.visible = true
                outline.color = "0x059669FF" ' Sleek emerald selector outline on playing card!
            end if
            if card <> invalid then card.color = "0x0B2E24FF" ' Subtle emerald glowing surface
            if accent <> invalid then accent.color = "0x34D399FF"
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

sub postReaction(emoji as String)
    if m.annotations = invalid or m.currentPlayingCardIndex < 0 or m.currentPlayingCardIndex >= m.annotations.count()
        return
    end if

    activeItem = m.annotations[m.currentPlayingCardIndex]
    annId = activeItem.id

    print "[Annotated Emote] Posting reaction: "; emoji; " for Annotation: "; annId

    ' 1. Optimistic instant local UI increment
    if activeItem.reactions = invalid
        activeItem.reactions = { fire: 0, think: 0, idea: 0, hundred: 0, down: 0 }
    end if

    if emoji = "🔥"
        activeItem.reactions.fire = activeItem.reactions.fire + 1
        if m.lblFireCount <> invalid then m.lblFireCount.text = Str(activeItem.reactions.fire).trim()
    else if emoji = "🤔"
        activeItem.reactions.think = activeItem.reactions.think + 1
        if m.lblThinkCount <> invalid then m.lblThinkCount.text = Str(activeItem.reactions.think).trim()
    else if emoji = "💡"
        activeItem.reactions.idea = activeItem.reactions.idea + 1
        if m.lblIdeaCount <> invalid then m.lblIdeaCount.text = Str(activeItem.reactions.idea).trim()
    else if emoji = "💯"
        activeItem.reactions.hundred = activeItem.reactions.hundred + 1
        if m.lblHundredCount <> invalid then m.lblHundredCount.text = Str(activeItem.reactions.hundred).trim()
    else if emoji = "👎"
        activeItem.reactions.down = activeItem.reactions.down + 1
        if m.lblDownCount <> invalid then m.lblDownCount.text = Str(activeItem.reactions.down).trim()
    end if

    ' Also update rail cards if current video is displayed in visible window
    renderRailCardsWindow()

    ' 2. Async HTTP POST via background ReactionTask
    reactionTask = createObject("RoSGNode", "ReactionTask")
    reactionTask.annotationId = annId
    reactionTask.emoji = emoji
    reactionTask.control = "RUN"
    print "[Annotated Emote] Dispatched ReactionTask for: "; annId; " with emoji: "; emoji
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    handled = false

    if press
        print "[Annotated] Remote key: '"; key; "' in State: "; m.uiState; " ModalOpen: "; m.isModalOpen

        ' 1. Modal Navigation overrides other controls when open
        if m.isModalOpen = true
            if key = "back" or key = "options" or key = "info"
                closeDetailModal()
                handled = true
            else if key = "left" or key = "right"
                m.focusedModalButton = (m.focusedModalButton + 1) mod 2
                updateModalButtonFocus()
                handled = true
            else if key = "OK"
                if m.focusedModalButton = 0
                    targetIdx = m.modalItemIndex
                    closeDetailModal()
                    if targetIdx >= 0 then playAnnotationVideo(targetIdx)
                else
                    closeDetailModal()
                end if
                handled = true
            else if key = "play"
                targetIdx = m.modalItemIndex
                closeDetailModal()
                if targetIdx >= 0 then playAnnotationVideo(targetIdx)
                handled = true
            end if
            return handled
        end if

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
            else if key = "up"
                ' Pressing Up from bottom actions directly enters State B (Rail)
                setUIState("STATE_B")
                handled = true
            else if key = "options" ' [*] Star Key
                ' Star key toggles active rail browsing mode
                setUIState("STATE_B")
                handled = true
            else if key = "info"
                ' Info key opens expanded detail modal for currently playing video
                openDetailModal(m.currentPlayingCardIndex)
                handled = true
            else if key = "OK"
                if m.focusedButtonIndex = 0
                    ' Open detail modal for the current playing clip
                    openDetailModal(m.currentPlayingCardIndex)
                    print "[Annotated] Fact-Check / Details modal opened for Card: "; m.currentPlayingCardIndex
                else if m.focusedButtonIndex = 1
                    postReaction("🔥")
                else if m.focusedButtonIndex = 2
                    postReaction("🤔")
                else if m.focusedButtonIndex = 3
                    postReaction("💡")
                else if m.focusedButtonIndex = 4
                    postReaction("💯")
                else if m.focusedButtonIndex = 5
                    postReaction("👎")
                end if
                handled = true
            end if

        else if m.uiState = "STATE_B"
            ' --- State B: Active Rail Browsing & Smooth Windowed Scrolling ---
            if key = "up"
                if m.focusedCardIndex > 0
                    m.focusedCardIndex = m.focusedCardIndex - 1
                    updateCardFocus()
                    currentPos = m.railStartIndex + m.focusedCardIndex + 1
                    m.railCount.text = Str(currentPos).trim() + " / " + Str(m.totalNotesCount).trim()
                    handled = true
                else if m.railStartIndex > 0
                    ' Scroll window up!
                    m.railStartIndex = m.railStartIndex - 1
                    renderRailCardsWindow()
                    handled = true
                end if
            else if key = "down"
                if m.focusedCardIndex < 2
                    m.focusedCardIndex = m.focusedCardIndex + 1
                    updateCardFocus()
                    currentPos = m.railStartIndex + m.focusedCardIndex + 1
                    m.railCount.text = Str(currentPos).trim() + " / " + Str(m.totalNotesCount).trim()
                    handled = true
                else if m.annotations <> invalid and m.railStartIndex + 3 < m.annotations.count()
                    ' Scroll window down!
                    m.railStartIndex = m.railStartIndex + 1
                    renderRailCardsWindow()
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
                ' Pressing OK expands the selected note into the Full Detail Modal + Scannable QR Pass!
                targetIdx = m.railStartIndex + m.focusedCardIndex
                print "[Annotated] Remote OK pressed on Window Slot "; m.focusedCardIndex; " (Annotation Index "; targetIdx; ") -> Opening Detail Modal!"
                openDetailModal(targetIdx)
                handled = true
            else if key = "play"
                ' Pressing Play directly plays the selected note's video!
                targetIdx = m.railStartIndex + m.focusedCardIndex
                print "[Annotated] Remote Play pressed on Window Slot "; m.focusedCardIndex; " (Annotation Index "; targetIdx; ") -> Switching to selected video!"
                playAnnotationVideo(targetIdx)
                handled = true
            end if
        end if
    end if

    return handled
end function
