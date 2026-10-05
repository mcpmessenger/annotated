sub init()
    m.STATE_PLAYBACK = "PLAYBACK"
    m.STATE_BUBBLE_OPEN = "BUBBLE_OPEN"
    m.STATE_DETAIL_OPEN = "DETAIL_OPEN"
    m.STATE_QR_OPEN = "QR_OPEN"
    m.STATE_LOADING = "LOADING"
    m.STATE_ERROR_HIDDEN = "ERROR_HIDDEN"

    m.bgRect = m.top.findNode("bgRect")
    m.mainVideo = m.top.findNode("mainVideo")
    m.videoTitle = m.top.findNode("videoTitle")
    m.railCount = m.top.findNode("railCount")
    m.remoteHint = m.top.findNode("remoteHint")
    m.timestampBadge = m.top.findNode("timestampBadge")
    m.videoOverlayTop = m.top.findNode("videoOverlayTop")

    m.btnFactCheck = m.top.findNode("btnFactCheck")
    m.btnFire = m.top.findNode("btnFire")
    m.btnThink = m.top.findNode("btnThink")
    m.btnIdea = m.top.findNode("btnIdea")
    m.btnHundred = m.top.findNode("btnHundred")
    m.btnDown = m.top.findNode("btnDown")
    m.factCheckBanner = m.top.findNode("factCheckBanner")
    m.fcHeadline = m.top.findNode("fcHeadline")
    m.fcDetail = m.top.findNode("fcDetail")
    m.railGroup = m.top.findNode("railGroup")
    m.railBackdropGroup = m.top.findNode("railBackdropGroup")
    m.railHeaderBg = m.top.findNode("railHeaderBg")
    m.totalNotesCount = 0
    m.topAnnotationIndex = 0

        m.annotationBubble = m.top.findNode("annotationBubble")
    m.annotationBubble.bubbleState = "CLOSED"
    m.tweetBillboardGroup = m.top.findNode("tweetBillboardGroup")
    m.bbPlatform = m.top.findNode("bbPlatform")
    m.bbDomain = m.top.findNode("bbDomain")
    m.bbAuthor = m.top.findNode("bbAuthor")
    m.bbAnnotatorAvatar = m.top.findNode("bbAnnotatorAvatar")
    m.bbQuote = m.top.findNode("bbQuote")
    m.bbComment = m.top.findNode("bbComment")
    m.bbDivider = m.top.findNode("bbDivider")
    m.bbImageFrame = m.top.findNode("bbImageFrame")
    m.bbAttachedImage = m.top.findNode("bbAttachedImage")
    m.bbIntent = m.top.findNode("bbIntent")
    m.bbIntentPill = m.top.findNode("bbIntentPill")
    m.bbQrBg = m.top.findNode("bbQrBg")
    m.bbQrCode = m.top.findNode("bbQrCode")

    m.globalQrGroup = m.top.findNode("globalQrGroup")
    m.globalQrBg = m.top.findNode("globalQrBg")
    m.globalQrCode = m.top.findNode("globalQrCode")
    m.annotateQrOverlay = m.top.findNode("annotateQrOverlay")
    m.bigAnnotateQr = m.top.findNode("bigAnnotateQr")

    m.detailModalGroup = m.top.findNode("detailModalGroup")
    m.modalPlatform = m.top.findNode("modalPlatform")
    m.modalDomain = m.top.findNode("modalDomain")
    m.modalAuthor = m.top.findNode("modalAuthor")
    m.modalTitle = m.top.findNode("modalTitle")
    m.modalQuote = m.top.findNode("modalQuote")
    m.modalComment = m.top.findNode("modalComment")
    m.modalQrCode = m.top.findNode("modalQrCode")

    m.card1 = m.top.findNode("card1")
    m.card1Outline = m.top.findNode("card1Outline")
    m.card1Accent = m.top.findNode("card1Accent")
    m.card1Author = m.top.findNode("card1Author")
    m.card1Time = m.top.findNode("card1Time")
    m.card1Quote = m.top.findNode("card1Quote")
    m.card1Note = m.top.findNode("card1Note")
    m.card1Emote = m.top.findNode("card1Emote")

    m.card2 = m.top.findNode("card2")
    m.card2Outline = m.top.findNode("card2Outline")
    m.card2Accent = m.top.findNode("card2Accent")
    m.card2Author = m.top.findNode("card2Author")
    m.card2Time = m.top.findNode("card2Time")
    m.card2Note = m.top.findNode("card2Note")
    m.card2Emote = m.top.findNode("card2Emote")

    m.card3 = m.top.findNode("card3")
    m.card3Outline = m.top.findNode("card3Outline")
    m.card3Accent = m.top.findNode("card3Accent")
    m.card3Author = m.top.findNode("card3Author")
    m.card3Time = m.top.findNode("card3Time")
    m.card3Note = m.top.findNode("card3Note")
    m.card3Emote = m.top.findNode("card3Emote")

    m.lblFire = m.top.findNode("lblFire")
    m.lblThink = m.top.findNode("lblThink")
    m.lblIdea = m.top.findNode("lblIdea")
    m.lblHundred = m.top.findNode("lblHundred")
    m.lblDown = m.top.findNode("lblDown")

    ' m.buttons array removed
    m.focusedButtonIndex = 0
    m.focusedEmojiIndex = -1
    m.castedReactions = {}

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

    ' Progress bar references
    m.progressFill = m.top.findNode("progressFill")
    m.bgFire = m.top.findNode("bgFire")
    m.bgAnnotate = m.top.findNode("bgAnnotate")
    m.bgThink = m.top.findNode("bgThink")
    m.bgIdea = m.top.findNode("bgIdea")
    m.bgHundred = m.top.findNode("bgHundred")
        m.bgDown = m.top.findNode("bgDown")
    m.bgClaim = m.top.findNode("bgClaim")
    m.lblFire = m.top.findNode("lblFire")
    m.lblThink = m.top.findNode("lblThink")
    m.lblIdea = m.top.findNode("lblIdea")
    m.lblHundred = m.top.findNode("lblHundred")
    m.lblDown = m.top.findNode("lblDown")
    m.reportToast = m.top.findNode("reportToast")
    m.reportToastTimer = m.top.findNode("reportToastTimer")
    if m.reportToastTimer <> invalid
        m.reportToastTimer.observeField("fire", "onHideReportToast")
    end if

    m.autoAdvanceDuration = 15  ' seconds to hold text/billboard posts
    m.videoDuration = 90        ' max seconds for video posts
    m.progressTick = 0          ' current elapsed tick
    m.progressMax = 15          ' current max (15 for text, actual duration for video)
    m.isVideoPlaying = false

    ' Interaction States: STATE_A (Passive Playback) or STATE_B (Active Browsing)
    m.uiState = m.STATE_PLAYBACK
    updateButtonFocus()

    ' Cinematic Intro Elements
    m.introOverlay = m.top.findNode("introOverlay")
    m.introAnim = m.top.findNode("introAnim")
    if m.introAnim <> invalid
        m.introAnim.observeField("state", "onIntroAnimState")
        m.introAnim.control = "start"
    end if

    ' Hard fallback: force-hide intro overlay after 5s in case animation callback never fires
    m.introFallbackTimer = CreateObject("roSGNode", "Timer")
    m.introFallbackTimer.duration = 5
    m.introFallbackTimer.repeat = false
    m.introFallbackTimer.observeField("fire", "onIntroFallbackTimer")
    m.top.appendChild(m.introFallbackTimer)
    m.introFallbackTimer.control = "start"

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

    ' Do NOT try to play anything until Supabase annotations arrive.
    ' Trying to connect to the local media server before we have URLs
    ' causes Roku's Video node to hang in a buffering state.
    m.mainVideo.control = "stop"

    ' Spawn background Task to pull real live annotations from Supabase
    m.feedTask = CreateObject("roSGNode", "AnnotationFeedTask")
    m.feedTask.observeField("annotations", "onAnnotationsLoaded")
    m.feedTask.observeField("error", "onAnnotationsFeedError")
    m.feedTask.control = "RUN"

    ' Safety timeout: if nothing loads in 12s, show an error message
    m.loadTimer = CreateObject("roSGNode", "Timer")
    m.loadTimer.duration = 12
    m.loadTimer.repeat = false
    m.loadTimer.observeField("fire", "onLoadTimeout")
    m.top.appendChild(m.loadTimer)
    m.loadTimer.control = "start"

    m.top.setFocus(true)
    print "[Annotated] MainScene initialized. Ready in STATE_A (Passive Playback)."
end sub

function resolvePlayableVideoUrl(item as Dynamic) as String
    if item = invalid then return ""

    ' GLOBAL ROKU OVERRIDE: Prevent fragmented mp4/webm crashing Roku hardware decoder
    ' If it originates from our raw supabase bucket, instantly route to our processed S3 bucket
    if item.media <> invalid and item.media.raw_url <> invalid
        rawStr = item.media.raw_url
        if Instr(1, rawStr, "supabase") > 0 and item.id <> invalid
            return "https://annotated-processed-videos.s3.us-east-1.amazonaws.com/processed/legacy_" + item.id + ".mp4"
        end if
    end if

    playUrl = ""
    rawUrl = ""
    
    if item.media <> invalid
        if item.media.type = "image" or item.media.type = "text"
            return ""
        end if

        if item.media.playable_url <> invalid and item.media.playable_url <> ""
            playUrl = item.media.playable_url
        end if
        
        if item.media.raw_url <> invalid and item.media.raw_url <> ""
            rawUrl = item.media.raw_url
        end if
    end if

    if rawUrl = "" and item.media_url <> invalid and type(item.media_url) = "roString"
        rawUrl = item.media_url.trim()
    end if

    ' First, if playUrl is already good and not webm
    if playUrl <> ""
        lowerPlay = LCase(playUrl)
        if Instr(1, lowerPlay, ".webm") = 0
            return playUrl
        end if
    end if

    if rawUrl = "" then return ""
    lowerRaw = LCase(rawUrl)

    if Instr(1, lowerRaw, ".png") > 0 or Instr(1, lowerRaw, ".jpg") > 0 or Instr(1, lowerRaw, ".jpeg") > 0 or Instr(1, lowerRaw, ".webp") > 0 or Instr(1, lowerRaw, ".gif") > 0
        return ""
    end if

    ' Dynamic WebM to MP4 fallback for Roku
    if Instr(1, rawUrl, "annotation-media/") > 0 
        if item.id <> invalid
            return "https://annotated-processed-videos.s3.us-east-1.amazonaws.com/processed/legacy_" + item.id + ".mp4"
        end if
    end if

    cleanUrl = lowerRaw
    queryIdx = Instr(1, cleanUrl, "?")
    if queryIdx > 0
        cleanUrl = Left(cleanUrl, queryIdx - 1)
    end if

    if Instr(1, cleanUrl, ".mp4") > 0 or Instr(1, cleanUrl, ".m4v") > 0 or Instr(1, cleanUrl, ".m3u8") > 0
        return rawUrl
    end if

    if Instr(1, lowerRaw, "amazonaws.com/processed") > 0
        return rawUrl
    end if

    return ""
end function

sub renderBillboard(item as Object)
    if item = invalid then return

    if m.mainVideo <> invalid
        m.mainVideo.control = "stop"
        m.mainVideo.visible = false
    end if
    if m.videoOverlayTop <> invalid then m.videoOverlayTop.visible = false
    if m.tweetBillboardGroup <> invalid then m.tweetBillboardGroup.visible = true

    imageUrl = ""
    if item.media <> invalid
        if item.media.image_url <> invalid and item.media.image_url <> ""
            imageUrl = item.media.image_url
        else if item.media.type = "image" and item.media.raw_url <> invalid
            imageUrl = item.media.raw_url
        end if
    else if item.media_url <> invalid and type(item.media_url) = "roString"
        lowerM = LCase(item.media_url)
        if Instr(1, lowerM, ".png") > 0 or Instr(1, lowerM, ".jpg") > 0 or Instr(1, lowerM, ".jpeg") > 0 or Instr(1, lowerM, ".webp") > 0
            imageUrl = item.media_url
        end if
    end if

    if imageUrl <> ""
        if m.bbImageFrame <> invalid then m.bbImageFrame.visible = true
        if m.bbAttachedImage <> invalid then m.bbAttachedImage.uri = imageUrl
        if m.bbQuote <> invalid then m.bbQuote.width = 580
        if m.bbComment <> invalid then m.bbComment.width = 580
        if m.bbDivider <> invalid then m.bbDivider.width = 580
    else
        if m.bbImageFrame <> invalid then m.bbImageFrame.visible = false
        if m.bbQuote <> invalid then m.bbQuote.width = 1200
        if m.bbComment <> invalid then m.bbComment.width = 1160
        if m.bbDivider <> invalid then m.bbDivider.width = 1200
    end if

    domain = ""
    if item.source <> invalid and item.source.domain <> invalid and item.source.domain <> ""
        domain = item.source.domain
    else if item.hostname <> invalid and item.hostname <> ""
        domain = item.hostname
    end if

    sourceLabel = domain
    if item.source <> invalid and item.source.author <> invalid and item.source.author <> ""
        sourceLabel = "Source: " + item.source.author + " | " + domain
    end if
    if m.bbDomain <> invalid then m.bbDomain.text = sourceLabel
    
    if m.bbPlatform <> invalid
        if Instr(1, LCase(domain), "x.com") > 0 or Instr(1, LCase(domain), "twitter") > 0
            m.bbPlatform.text = "X / Twitter"
        else if Instr(1, LCase(domain), "youtube") > 0
            m.bbPlatform.text = "YouTube Note"
        else if Instr(1, LCase(domain), "nytimes") > 0 or Instr(1, LCase(domain), "theverge") > 0
            m.bbPlatform.text = "News / Article"
        else
            m.bbPlatform.text = "Web Note"
        end if
    end if

    if item.author <> invalid
        if item.author.username <> invalid
            if m.bbAuthor <> invalid then m.bbAuthor.text = "@" + item.author.username
        else if item.author.display_name <> invalid
            if m.bbAuthor <> invalid then m.bbAuthor.text = item.author.display_name
        end if
        
        if item.author.avatar_url <> invalid and item.author.avatar_url <> ""
            if m.bbAnnotatorAvatar <> invalid
                m.bbAnnotatorAvatar.uri = item.author.avatar_url
                m.bbAnnotatorAvatar.visible = true
            end if
        else
            if m.bbAnnotatorAvatar <> invalid then m.bbAnnotatorAvatar.visible = false
        end if
    else
        if m.bbAuthor <> invalid then m.bbAuthor.text = "@community"
        if m.bbAnnotatorAvatar <> invalid then m.bbAnnotatorAvatar.visible = false
    end if

    quoteText = "Public annotation from community web layer"
    if item.highlighted_text <> invalid and item.highlighted_text <> ""
        quoteText = cleanText(item.highlighted_text)
    else if item.page_title <> invalid and item.page_title <> ""
        quoteText = cleanText(item.page_title)
    else if item.quote <> invalid and item.quote <> ""
        quoteText = cleanText(item.quote)
    end if
    if m.bbQuote <> invalid then m.bbQuote.text = """" + quoteText + """"

    if item.comment <> invalid and item.comment <> ""
        if m.bbComment <> invalid then m.bbComment.text = cleanText(item.comment)
    else
        if m.bbComment <> invalid then m.bbComment.text = "No additional commentary provided."
    end if

    print "[Annotated Stage] Presented Tweet/Text Billboard: "; sourceLabel; " | Quote: "; Left(quoteText, 35)
end sub

sub playAnnotationVideo(index as Integer)
    if m.annotations = invalid or index < 0 or index >= m.annotations.count()
        return
    end if

    item = m.annotations[index]
    videoUrl = resolvePlayableVideoUrl(item)

    title = "Annotated Community Note"
    if item.source <> invalid and item.source.title <> invalid and item.source.title <> ""
        title = item.source.title
    else if item.page_title <> invalid and item.page_title <> ""
        title = item.page_title
    end if

    if m.videoTitle <> invalid then m.videoTitle.text = title
    m.currentPlayingCardIndex = index
    m.castedReactions = {}
    
    ' Reset status lines to Yellow (Pending / Not Verified)
    if m.bbIntentPill <> invalid then m.bbIntentPill.color = "0xFBBF24FF"
    if m.ltStatusLine <> invalid then m.ltStatusLine.color = "0xFBBF24FF"

    ' Run Fact Check Task!
    if m.fcTask <> invalid then m.fcTask.control = "stop"
    m.fcTask = createObject("roSGNode", "FactCheckTask")
    if m.fcTask <> invalid
        m.fcTask.annotationData = FormatJson(item)
        m.fcTask.observeField("response", "onFactCheckResult")
        m.fcTask.control = "RUN"
    end if

    isTextNote = (videoUrl = "" or item.media = invalid or item.media.type = "text" or item.media.type = "image")

    m.lowerThirdGroup = m.top.findNode("lowerThirdGroup")
    m.ltAvatar = m.top.findNode("ltAvatar")
    m.ltAuthor = m.top.findNode("ltAuthor")
    m.ltComment = m.top.findNode("ltComment")
    m.ltStatusLine = m.top.findNode("ltStatusLine")
    m.bbIntentPill = m.top.findNode("bbIntentPill")

    if m.lowerThirdGroup <> invalid
        hasComment = false
        if item.comment <> invalid and item.comment <> ""
            hasComment = true
            if m.ltComment <> invalid then m.ltComment.text = cleanText(item.comment)
            
            authorText = "@community"
            if item.author <> invalid
                if item.author.username <> invalid then authorText = item.author.username
            end if
            if m.ltAuthor <> invalid then m.ltAuthor.text = authorText
            
            if m.ltAvatar <> invalid
                m.ltAvatar.uri = ""
                if item.author <> invalid and item.author.avatar_url <> invalid
                    m.ltAvatar.uri = item.author.avatar_url
                end if
            end if
        end if
        
        if isTextNote or not hasComment
            m.lowerThirdGroup.visible = false
        else
            m.lowerThirdGroup.visible = true
        end if
    end if

    if isTextNote
        stopProgressTimer()
        m.isVideoPlaying = false
        renderBillboard(item)
        ' Start 15-second hold + auto-advance for text/billboard posts
        m.progressMax = m.autoAdvanceDuration
        m.progressTick = 0
        startProgressTimer()
    else
        ' Real native video clip!
        if m.tweetBillboardGroup <> invalid then m.tweetBillboardGroup.visible = false
        if m.videoOverlayTop <> invalid then if m.videoOverlayTop <> invalid then m.videoOverlayTop.visible = true
        if m.mainVideo <> invalid
            m.mainVideo.control = "stop"
            m.mainVideo.visible = true
            videoContent = createObject("RoSGNode", "ContentNode")
            videoContent.url = videoUrl
            videoContent.title = title
            videoContent.streamformat = "mp4"
            
            
            m.mainVideo.content = videoContent
            m.mainVideo.control = "play"
        end if
        print "[Annotated Stage] Playing Native MP4 Clip ["; index; "]: "; videoUrl
    end if

    ' Update real organic reaction counts for the active item
    fireCount = 0
    thinkCount = 0
    ideaCount = 0
    hundredCount = 0
    downCount = 0
    ' Reactions removed due to unicode parsing issues
    if m.lblFire <> invalid then m.lblFire.text = Str(fireCount).trim()
    if m.lblThink <> invalid then m.lblThink.text = Str(thinkCount).trim()
    if m.lblIdea <> invalid then m.lblIdea.text = Str(ideaCount).trim()
    if m.lblHundred <> invalid then m.lblHundred.text = Str(hundredCount).trim()
    if m.lblDown <> invalid then m.lblDown.text = Str(downCount).trim()

    ' Update community note / fact check banner for the active item
    if m.fcHeadline <> invalid and m.fcDetail <> invalid
        if item.is_disputed = true
            if m.factCheckBanner <> invalid then m.factCheckBanner.color = "0x7F1D1DDD"
            m.fcHeadline.text = "COMMUNITY NOTICE: DISPUTED CLAIM"
            m.fcHeadline.color = "0xF87171FF"
            if item.comment <> invalid and item.comment <> ""
                m.fcDetail.text = cleanText(item.comment)
            else
                m.fcDetail.text = "This annotation has been flagged by community members for review."
            end if
        else if item.intent = "fact_check" or item.intent = "fact check"
            if m.factCheckBanner <> invalid then m.factCheckBanner.color = "0x1E3A8ADD"
            m.fcHeadline.text = "COMMUNITY NOTE: FACT CHECK REQUESTED"
            m.fcHeadline.color = "0x60A5FAFF"
            if item.comment <> invalid and item.comment <> ""
                m.fcDetail.text = cleanText(item.comment)
            else
                m.fcDetail.text = "A community member requested a fact-check on this context."
            end if
        else
            if m.factCheckBanner <> invalid then m.factCheckBanner.color = "0x0F172ADD"
            m.fcHeadline.text = "COMMUNITY ANNOTATION & NOTE"
            m.fcHeadline.color = "0x38BDF8FF"
            if item.quote <> invalid and item.quote <> ""
                m.fcDetail.text = """" + cleanText(item.quote) + """"
            else if item.comment <> invalid and item.comment <> ""
                m.fcDetail.text = cleanText(item.comment)
            else
                m.fcDetail.text = "Public annotation synchronized across web and TV."
            end if
        end if
    end if

    ' Update dynamic QR codes for Mobile Pass handoff to Vercel source
    slug = ""
    if item.slug <> invalid and item.slug <> ""
        slug = item.slug
    else if item.id <> invalid
        slug = item.id
    end if

    passUrl = "https://annotated-repo.vercel.app/n/" + slug
    if item.pass_url <> invalid and item.pass_url <> ""
        passUrl = item.pass_url
    end if

    qrUrl = ""
    if item.qr_url <> invalid and item.qr_url <> ""
        qrUrl = item.qr_url
    else
        qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=8&data=https%3A%2F%2Fannotated-repo.vercel.app%2Fn%2F" + slug
    end if

    if m.bbQrCode <> invalid then m.bbQrCode.uri = qrUrl

    updateCardPlayingIndicator()
    ' Phase 2 & 4: Update Floating Bubble and Global QR
    if m.annotationBubble <> invalid
        m.annotationBubble.annotationData = item

    fireCount = 0
    thinkCount = 0
    ideaCount = 0
    hundredCount = 0
    downCount = 0
    if item.reactions <> invalid
    ' bad syntax removed
    ' bad syntax removed
    ' bad syntax removed
    ' bad syntax removed
    ' bad syntax removed
    end if
    if m.lblFire <> invalid then m.lblFire.text = Str(fireCount).trim()
    if m.lblThink <> invalid then m.lblThink.text = Str(thinkCount).trim()
    if m.lblIdea <> invalid then m.lblIdea.text = Str(ideaCount).trim()
    if m.lblHundred <> invalid then m.lblHundred.text = Str(hundredCount).trim()
    if m.lblDown <> invalid then m.lblDown.text = Str(downCount).trim()

        if m.uiState = m.STATE_BUBBLE_OPEN
            m.annotationBubble.bubbleState = "OPEN"
        end if
    end if

    slug = ""
    if item.slug <> invalid and item.slug <> ""
        slug = item.slug
    else if item.id <> invalid
        slug = item.id
    end if
    qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=8&data=https%3A%2F%2Fannotated-repo.vercel.app%2Fn%2F" + slug

    if item.qr_url <> invalid and item.qr_url <> ""
        qrUrl = item.qr_url
    end if

    if m.globalQrCode <> invalid
        m.globalQrCode.uri = qrUrl
    end if
    if m.bigAnnotateQr <> invalid
        m.bigAnnotateQr.uri = qrUrl
    end if
    if m.globalQrBg <> invalid
        
    end if

end sub

sub showDetailModal(show as Boolean)
    if m.detailModalGroup = invalid then return
    m.detailModalGroup.visible = show

    if show
        setVideoDucking(true)

        index = m.currentPlayingCardIndex
        if m.uiState = m.STATE_BUBBLE_OPEN
            index = m.topAnnotationIndex + m.focusedCardIndex
        end if

        if m.annotations <> invalid and index >= 0 and index < m.annotations.count()
            item = m.annotations[index]

            slug = ""
            if item.slug <> invalid and item.slug <> ""
                slug = item.slug
            else if item.id <> invalid
                slug = item.id
            end if

            passUrl = "https://annotated-repo.vercel.app/n/" + slug
            if item.pass_url <> invalid and item.pass_url <> ""
                passUrl = item.pass_url
            end if

            qrUrl = ""
            if item.qr_url <> invalid and item.qr_url <> ""
                qrUrl = item.qr_url
            else
                qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=8&data=https%3A%2F%2Fannotated-repo.vercel.app%2Fn%2F" + slug
            end if

            if m.modalQrCode <> invalid then m.modalQrCode.uri = qrUrl

            domain = ""
            if item.source <> invalid and item.source.domain <> invalid
                domain = item.source.domain
            else if item.hostname <> invalid
                domain = item.hostname
            end if
            if m.modalDomain <> invalid then m.modalDomain.text = domain

            if m.modalPlatform <> invalid
                if Instr(1, LCase(domain), "x.com") > 0 or Instr(1, LCase(domain), "twitter") > 0
                    m.modalPlatform.text = "X / Twitter"
                else if Instr(1, LCase(domain), "youtube") > 0
                    m.modalPlatform.text = "YouTube Note"
                else if Instr(1, LCase(domain), "nytimes") > 0 or Instr(1, LCase(domain), "theverge") > 0
                    m.modalPlatform.text = "News / Article"
                else
                    m.modalPlatform.text = "Web Note"
                end if
            end if

            authorName = "@community"
            if item.author <> invalid and item.author.username <> invalid and item.author.username <> ""
                authorName = "@" + item.author.username
            else if domain <> ""
                authorName = "@" + domain
            end if
            if m.modalAuthor <> invalid then m.modalAuthor.text = authorName

            title = "Community Annotation"
            if item.source <> invalid and item.source.title <> invalid and item.source.title <> ""
                title = item.source.title
            else if item.page_title <> invalid and item.page_title <> ""
                title = item.page_title
            end if
            if m.modalTitle <> invalid then m.modalTitle.text = title

            quoteText = "Public annotation from community web layer"
            if item.quote <> invalid and item.quote <> ""
                quoteText = cleanText(item.quote)
            end if
            if m.modalQuote <> invalid then m.modalQuote.text = """" + quoteText + """"

            commText = "Annotated commentary"
            if item.comment <> invalid and item.comment <> ""
                commText = cleanText(item.comment)
            end if
            if m.modalComment <> invalid then m.modalComment.text = commText

            print "[Annotated Detail Modal] Opened Mobile Pass QR for: "; passUrl
        end if
    else
        if m.uiState = m.STATE_PLAYBACK
            setVideoDucking(false)
        end if
    end if
end sub

sub updateCardPlayingIndicator()
    for i = 0 to m.cardTimes.count() - 1
        lbl = m.cardTimes[i]
        if lbl <> invalid
            actualIndex = m.topAnnotationIndex + i
            if actualIndex = m.currentPlayingCardIndex
                lbl.text = "ACTIVE"
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
    if m.uiState = m.STATE_BUBBLE_OPEN
        m.annotationBubble.bubbleState = "OPEN"
        if m.remoteHint <> invalid
            m.remoteHint.text = "[Back] Close   [< >] Browse   [OK] Detail [QR]"
        end if
    else if m.uiState = m.STATE_PLAYBACK
        m.annotationBubble.bubbleState = "CLOSED"
        if m.remoteHint <> invalid
            m.remoteHint.text = "[*] Bubble   [< >] Prev/Next"
        end if
    end if
end sub


sub onVideoPositionChanged()
    vPos = 0
    if m.mainVideo.position <> invalid then vPos = m.mainVideo.position
    vDur = 0
    if m.mainVideo.duration <> invalid and m.mainVideo.duration > 0 then vDur = m.mainVideo.duration

    ' Update progress bar using real video position
    if m.isVideoPlaying and vDur > 0 and m.progressFill <> invalid
        m.progressFill.width = Int((vPos / vDur) * 1920)
    end if

    if vDur = 0 then vDur = 90

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

    if m.timestampBadge <> invalid then m.timestampBadge.text = posMStr + ":" + posSStr + " / " + durMStr + ":" + durSStr

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
        if m.uiState = m.STATE_PLAYBACK
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
    if m.mainVideo.state = "playing"
        m.isVideoPlaying = true
        if m.progressFill <> invalid then m.progressFill.width = 0
        if m.slideTimer <> invalid then m.slideTimer.control = "stop"
    else if m.mainVideo.state = "finished"
        m.isVideoPlaying = false
        if m.progressFill <> invalid then m.progressFill.width = 1140
        advanceToNextAnnotation()
    else if m.mainVideo.state = "error"
        m.isVideoPlaying = false
        stopProgressTimer()
        print "[Annotated] Video Player error: "; m.mainVideo.errorStr; " code: "; m.mainVideo.errorCode
        print "[Annotated] Video playback error. Gracefully switching to Tweet/Note Billboard."
        if m.annotations <> invalid and m.currentPlayingCardIndex >= 0 and m.currentPlayingCardIndex < m.annotations.count()
            renderBillboard(m.annotations[m.currentPlayingCardIndex])
        else
            if m.mainVideo <> invalid
                m.mainVideo.control = "stop"
                m.mainVideo.visible = false
            end if
            if m.videoOverlayTop <> invalid then if m.videoOverlayTop <> invalid then m.videoOverlayTop.visible = false
            if m.tweetBillboardGroup <> invalid then m.tweetBillboardGroup.visible = true
        end if
        ' Start billboard hold timer after error
        m.progressMax = m.autoAdvanceDuration
        m.progressTick = 0
        startProgressTimer()
    end if
end sub

sub startProgressTimer()
    m.progressTick = 0
    if m.progressFill <> invalid then m.progressFill.width = 0
    if m.slideTimer = invalid
        m.slideTimer = CreateObject("roSGNode", "Timer")
        m.slideTimer.duration = 1
        m.slideTimer.repeat = true
        m.slideTimer.observeField("fire", "onSlideTimerTick")
        m.top.appendChild(m.slideTimer)
    end if
    m.slideTimer.control = "start"
end sub

sub stopProgressTimer()
    if m.slideTimer <> invalid
        m.slideTimer.control = "stop"
    end if
    if m.progressFill <> invalid then m.progressFill.width = 0
end sub

sub onSlideTimerTick()
    m.progressTick = m.progressTick + 1
    ' Update progress bar fill
    if m.progressFill <> invalid and m.progressMax > 0
        fillWidth = Int((m.progressTick / m.progressMax) * 1140)
        if fillWidth > 1140 then fillWidth = 1140
        m.progressFill.width = fillWidth
    end if
    ' Auto-advance when we hit the max (for text posts - video uses "finished" state)
    if not m.isVideoPlaying and m.progressTick >= m.progressMax
        stopProgressTimer()
        advanceToNextAnnotation()
    end if
end sub

sub advanceToNextAnnotation()
    if m.annotations = invalid or m.annotations.count() = 0 then return
    nextIndex = m.currentPlayingCardIndex + 1
    if nextIndex >= m.annotations.count() then nextIndex = 0
    m.focusedCardIndex = nextIndex
    
    ' Check if we need to scroll the UI
    if nextIndex < m.topAnnotationIndex
        m.topAnnotationIndex = nextIndex
        renderRailCards()
    else if nextIndex >= m.topAnnotationIndex + 3
        m.topAnnotationIndex = nextIndex - 2
        renderRailCards()
    end if
    
    updateCardFocus()
    playAnnotationVideo(nextIndex)
end sub



sub onIntroAnimState()
    if m.introAnim.state = "stopped"
        if m.introOverlay <> invalid then m.introOverlay.visible = false
        if m.introFallbackTimer <> invalid then m.introFallbackTimer.control = "stop"
        print "[Annotated] Cinematic intro completed. Revealing live dashboard."
    end if
end sub

sub onIntroFallbackTimer()
    ' Force-dismiss the intro overlay regardless of animation state
    if m.introOverlay <> invalid then m.introOverlay.visible = false
    if m.introAnim <> invalid then m.introAnim.control = "stop"
    print "[Annotated] Intro fallback timer fired — overlay force-dismissed."
end sub

function formatEmotes(item as Object) as String
    if item = invalid then return ""
    if item.intent <> invalid
        return UCase(item.intent.trim())
    end if
    return ""
end function

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

sub renderRailCards()
    if m.annotations = invalid or m.annotations.count() = 0 then return

    for i = 0 to 2
        annIdx = m.topAnnotationIndex + i
        if annIdx < m.annotations.count()
            item = m.annotations[annIdx]

            authorText = "@community"
            if item.author <> invalid and item.author.username <> invalid and item.author.username <> ""
                authorText = "@" + item.author.username
            else if item.hostname <> invalid and item.hostname <> ""
                authorText = "@" + item.hostname
            end if

            rawTime = "Recent"
            if item.media_timestamp <> invalid and item.media_timestamp <> ""
                rawTime = item.media_timestamp
                ts = parseTimestampToSeconds(item.media_timestamp)
                if ts >= 0 then m.cardTimestamps[i] = ts
            else
                m.cardTimestamps[i] = i * 15
            end if
            m.cardRawTimes[i] = rawTime

            noteText = ""
            if item.quote <> invalid and item.quote <> ""
                noteText = """" + Left(cleanText(item.quote), 45) + "..."" "
            end if
            if item.comment <> invalid and item.comment <> ""
                noteText = noteText + cleanText(item.comment)
            end if

            if i = 0
                if m.card1Author <> invalid then m.card1Author.text = authorText
                if m.card1Quote <> invalid
                    if item.quote <> invalid and item.quote <> ""
                        m.card1Quote.text = """" + Left(cleanText(item.quote), 60) + "..."""
                    else
                        m.card1Quote.text = """Annotated Web Commentary"""
                    end if
                end if
                if m.card1Note <> invalid and item.comment <> invalid then m.card1Note.text = cleanText(item.comment)
                if m.card1Emote <> invalid then m.card1Emote.text = formatEmotes(item)
            else if i = 1
                if m.card2Author <> invalid then m.card2Author.text = authorText
                if m.card2Note <> invalid and noteText <> "" then m.card2Note.text = noteText
                if m.card2Emote <> invalid then m.card2Emote.text = formatEmotes(item)
            else if i = 2
                if m.card3Author <> invalid then m.card3Author.text = authorText
                if m.card3Note <> invalid and noteText <> "" then m.card3Note.text = noteText
                if m.card3Emote <> invalid then m.card3Emote.text = formatEmotes(item)
            end if
        end if
    end for

    updateCardPlayingIndicator()
end sub

sub onAnnotationsLoaded()
    annotations = m.feedTask.annotations
    if annotations = invalid or annotations.count() = 0
        print "[Annotated] No annotations returned from feed task."
        if m.railCount <> invalid then m.railCount.text = "0 Notes"
        return
    end if

    m.annotations = annotations
    m.totalNotesCount = annotations.count()
    m.topAnnotationIndex = 0
    print "[Annotated] Binding "; m.totalNotesCount; " live annotations to UI!"
    if m.uiState = m.STATE_PLAYBACK
        if m.railCount <> invalid then m.railCount.text = Str(m.totalNotesCount).trim() + " Notes"
    end if

    renderRailCards()

    ' Automatically play or present the first community annotation!
    playAnnotationVideo(0)
    if m.loadTimer <> invalid then m.loadTimer.control = "stop"
    print "[Annotated] Initial community item loaded and presenting!"

    ' Start periodic feed polling every 20 seconds so deletions and additions are reflected live on TV
    if m.pollTimer = invalid
        m.pollTimer = CreateObject("roSGNode", "Timer")
        m.pollTimer.duration = 20
        m.pollTimer.repeat = true
        m.pollTimer.observeField("fire", "onPollTimerFired")
        m.top.appendChild(m.pollTimer)
        m.pollTimer.control = "start"
    end if
end sub

sub onPollTimerFired()
    if m.feedTask <> invalid
        m.feedTask.control = "STOP"
    end if
    m.feedTask = CreateObject("roSGNode", "AnnotationFeedTask")
    m.feedTask.observeField("annotations", "onAnnotationsPolled")
    m.feedTask.control = "RUN"
end sub

sub onAnnotationsPolled()
    newAnnotations = m.feedTask.annotations
    if newAnnotations = invalid or newAnnotations.count() = 0 then return

    currentPlayingId = ""
    if m.annotations <> invalid and m.topAnnotationIndex < m.annotations.count()
        currentPlayingId = m.annotations[m.topAnnotationIndex].id
    end if

    m.annotations = newAnnotations
    m.totalNotesCount = newAnnotations.count()
    if m.uiState = m.STATE_PLAYBACK
        if m.railCount <> invalid then m.railCount.text = Str(m.totalNotesCount).trim() + " Notes"
    end if
    renderRailCards()

    stillExists = false
    if currentPlayingId <> ""
        for i = 0 to newAnnotations.count() - 1
            if newAnnotations[i].id = currentPlayingId
                stillExists = true
                m.topAnnotationIndex = i
                updateCardPlayingIndicator()
                exit for
            end if
        end for
    end if

    if not stillExists and newAnnotations.count() > 0
        print "[Annotated] Previously playing item was deleted! Transitioning to new active note."
        playAnnotationVideo(0)
    end if
end sub

sub onAnnotationsFeedError()
    errMsg = ""
    if m.feedTask <> invalid and m.feedTask.error <> invalid
        errMsg = m.feedTask.error
    end if
    print "[Annotated] Feed task returned an error: "; errMsg
    if m.railCount <> invalid
        m.railCount.text = "Offline"
        m.railCount.color = "0xEF4444FF"
    end if
    if m.videoTitle <> invalid
        if m.videoTitle <> invalid then m.videoTitle.text = "Could not load live annotations - check network"
    end if
    if m.loadTimer <> invalid then m.loadTimer.control = "stop"
end sub

sub onLoadTimeout()
    print "[Annotated] Feed task timed out after 12 seconds."
    if m.annotations = invalid
        if m.railCount <> invalid
            m.railCount.text = "Timed Out"
            m.railCount.color = "0xEF4444FF"
        end if
        if m.videoTitle <> invalid
            if m.videoTitle <> invalid then m.videoTitle.text = "Network timeout - check Roku connection"
        end if
    end if
end sub


sub updateButtonFocus()
    ' Legacy action bar removed in Phase 1
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

    if press then
        if m.uiState = m.STATE_ENTRY
            if key = "OK" or key = "Select"
                if m.annotations <> invalid and m.annotations.count() > 0
                    playAnnotationVideo(0)
                end if
            end if
            return true
        end if

        if key = "play"
            if m.mainVideo <> invalid
                if m.mainVideo.state = "playing"
                    m.mainVideo.control = "pause"
                else
                    m.mainVideo.control = "resume"
                end if
            end if
            handled = true
        else if key = "rev" or key = "up"
            if m.annotations <> invalid and m.currentPlayingCardIndex > 0
                playAnnotationVideo(m.currentPlayingCardIndex - 1)
            end if
            handled = true
        else if key = "fwd" or key = "down"
            if m.annotations <> invalid and m.currentPlayingCardIndex < m.annotations.count() - 1
                playAnnotationVideo(m.currentPlayingCardIndex + 1)
            end if
            handled = true
        else if key = "left"
            if m.focusedEmojiIndex = -1 then m.focusedEmojiIndex = 0
            if m.focusedEmojiIndex > 0 then m.focusedEmojiIndex = m.focusedEmojiIndex - 1
            setFocusedEmoji(m.focusedEmojiIndex)
            if m.annotateQrOverlay <> invalid then m.annotateQrOverlay.visible = false
            if m.uiState = m.STATE_BUBBLE_OPEN then setUIState(m.STATE_PLAYBACK)
            handled = true
        else if key = "right"
            if m.focusedEmojiIndex = -1 then m.focusedEmojiIndex = 0
            if m.focusedEmojiIndex < 6 then m.focusedEmojiIndex = m.focusedEmojiIndex + 1
            setFocusedEmoji(m.focusedEmojiIndex)
            if m.annotateQrOverlay <> invalid then m.annotateQrOverlay.visible = false
            if m.uiState = m.STATE_BUBBLE_OPEN then setUIState(m.STATE_PLAYBACK)
            handled = true
        else if key = "OK" or key = "Select"
            if m.focusedEmojiIndex = 6
                ' Report objectionable content and skip immediately
                if m.annotations <> invalid and m.currentPlayingCardIndex >= 0 and m.currentPlayingCardIndex < m.annotations.count()
                    item = m.annotations[m.currentPlayingCardIndex]
                    if item <> invalid and item.id <> invalid
                        print "[MainScene] Filing UGC report for annotation: "; item.id
                        reportTask = createObject("roSGNode", "PostReportTask")
                        if reportTask <> invalid
                            reportTask.annotationId = item.id
                            reportTask.reason = "offensive"
                            reportTask.details = "Flagged via TV remote"
                            reportTask.control = "RUN"
                        end if
                    end if
                end if

                ' Show confirmation toast
                if m.reportToast <> invalid then m.reportToast.visible = true
                if m.reportToastTimer <> invalid then m.reportToastTimer.control = "start"

                ' Advance immediately past the reported content
                if m.annotations <> invalid and m.annotations.count() > 0
                    playAnnotationVideo(m.currentPlayingCardIndex + 1)
                end if
                handled = true
            else if m.focusedEmojiIndex = 0
                ' Toggle the big Annotate QR Overlay
                if m.annotateQrOverlay <> invalid
                    m.annotateQrOverlay.visible = not m.annotateQrOverlay.visible
                end if
                handled = true
            else if m.focusedEmojiIndex >= 1 and m.focusedEmojiIndex <= 5
                if m.annotations <> invalid and m.currentPlayingCardIndex >= 0
                    item = m.annotations[m.currentPlayingCardIndex]
                    if item <> invalid and item.id <> invalid
                        castKey = Str(m.currentPlayingCardIndex) + "_" + Str(m.focusedEmojiIndex)
                        if m.castedReactions[castKey] <> true
                            print "Casted emoji reaction: "; m.focusedEmojiIndex
                            m.castedReactions[castKey] = true
                            
                            m.postTask = createObject("roSGNode", "PostReactionTask")
                            if m.postTask <> invalid
                                m.postTask.annotationId = item.id
                                m.postTask.reactionIndex = m.focusedEmojiIndex - 1
                                m.postTask.control = "RUN"
                            end if
                            
                            ' Optimistically update UI
                            counts = [invalid, m.lblFire, m.lblThink, m.lblIdea, m.lblHundred, m.lblDown]
                            if counts[m.focusedEmojiIndex] <> invalid
                                currentCount = Val(counts[m.focusedEmojiIndex].text)
                                counts[m.focusedEmojiIndex].text = Str(currentCount + 1).trim()
                            end if
                        else
                            print "Already casted this reaction!"
                        end if
                    end if
                end if
            else
                ' Default OK action if no emoji focused -> maybe toggle bubble or detail modal
                if m.uiState = m.STATE_PLAYBACK
                    setUIState(m.STATE_BUBBLE_OPEN)
                else
                    setUIState(m.STATE_PLAYBACK)
                end if
            end if
            handled = true
        else if key = "options"
            if m.uiState = m.STATE_PLAYBACK
                setUIState(m.STATE_BUBBLE_OPEN)
            else
                setUIState(m.STATE_PLAYBACK)
            end if
            handled = true
        else if key = "back"
            if m.annotateQrOverlay <> invalid and m.annotateQrOverlay.visible = true
                m.annotateQrOverlay.visible = false
                handled = true
            else if m.uiState = m.STATE_BUBBLE_OPEN
                setUIState(m.STATE_PLAYBACK)
                handled = true
            else if m.focusedEmojiIndex <> -1
                m.focusedEmojiIndex = -1
                setFocusedEmoji(-1)
                handled = true
            end if
            ' If not handled, let system exit
        end if
    end if

    return handled
end function


sub setFocusedEmoji(index as Integer)
    bgs = [m.bgAnnotate, m.bgFire, m.bgThink, m.bgIdea, m.bgHundred, m.bgDown, m.bgClaim]
    for i = 0 to 6
        if bgs[i] <> invalid
            if i = index
                if i = 6
                    bgs[i].color = "0xDC2626FF" ' Red highlight
                else
                    bgs[i].color = "0x059669FF" ' Emerald highlight
                end if
            else
                bgs[i].color = "0x334155AA" ' Normal slate
            end if
        end if
    end for
end sub

sub onFactCheckResult(event as Object)
    respStr = event.getData()
    if respStr <> "" and respStr <> "ERROR"
        res = ParseJson(respStr)
        if res <> invalid
            verdict = res.verdict
            if verdict = "VERIFIED" or verdict = "VERIFIED_TRUE"
                if m.bbIntentPill <> invalid then m.bbIntentPill.color = "0x34D399FF" ' Green
                if m.ltStatusLine <> invalid then m.ltStatusLine.color = "0x34D399FF"
            else if verdict = "FALSE" or verdict = "MISLEADING"
                if m.bbIntentPill <> invalid then m.bbIntentPill.color = "0xEF4444FF" ' Red
                if m.ltStatusLine <> invalid then m.ltStatusLine.color = "0xEF4444FF"
            else
                if m.bbIntentPill <> invalid then m.bbIntentPill.color = "0xFBBF24FF" ' Yellow
                if m.ltStatusLine <> invalid then m.ltStatusLine.color = "0xFBBF24FF"
            end if
        end if
    end if
end sub

sub onHideReportToast()
    if m.reportToast <> invalid then m.reportToast.visible = false
end sub

