sub Main(args as Dynamic)
    print "[Annotated] Channel launching with args: "; args
    showChannelSGScreen(args)
end sub

sub showChannelSGScreen(args as Dynamic)
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)

    ' 1. Deep linking input listener (Roku Certification 5.2)
    input = CreateObject("roInput")
    if input <> invalid
        input.setMessagePort(m.port)
        print "[Annotated] roInput registered for deep link events."
    end if

    ' 2. Memory monitoring (Roku Certification Monitoring)
    deviceInfo = CreateObject("roDeviceInfo")
    if deviceInfo <> invalid
        deviceInfo.setMessagePort(m.port)
        deviceInfo.EnableLowGeneralMemoryEvent(true)
        print "[Annotated] roDeviceInfo memory events enabled."
    end if

    appMemoryMonitor = CreateObject("roAppMemoryMonitor")
    if appMemoryMonitor <> invalid
        appMemoryMonitor.setMessagePort(m.port)
        appMemoryMonitor.EnableMemoryWarningEvent(true)

        availMem = appMemoryMonitor.GetChannelAvailableMemory()
        memLimit = appMemoryMonitor.GetChannelMemoryLimit()
        memPercent = appMemoryMonitor.GetMemoryLimitPercent()
        print "[Annotated Memory] Available: "; availMem; "KB | Limit: "; memLimit; "KB | Used: "; memPercent; "%"
    end if

    scene = screen.CreateScene("MainScene")
    scene.id = "RootMainScene"
    if args <> invalid and type(args) = "roAssociativeArray"
        scene.launchArgs = args
    end if
    screen.show()

    while(true)
        msg = wait(0, m.port)
        msgType = type(msg)

        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        else if msgType = "roInputEvent"
            if msg.isInput()
                inputData = msg.getInfo()
                print "[Annotated roInput] Received deep link event: "; inputData
                if scene <> invalid
                    scene.inputArgs = inputData
                end if
            end if
        else if msgType = "roDeviceInfoEvent"
            if msg.isStatusMessage()
                print "[Annotated Device Info Event] Status: "; msg.getInfo()
            end if
        else if msgType = "roAppMemoryNotificationEvent"
            if msg.isEvent()
                info = msg.getInfo()
                if info <> invalid
                    print "[Annotated Memory Notification] Usage percent: "; info.lookup("MemoryUsagePercent")
                end if
                if appMemoryMonitor <> invalid
                    print "[Annotated Memory Status] Available: "; appMemoryMonitor.GetChannelAvailableMemory(); "KB | Used: "; appMemoryMonitor.GetMemoryLimitPercent(); "%"
                end if
            end if
        end if
    end while
end sub

