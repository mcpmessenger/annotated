sub Main(args as Dynamic)
    print "[Annotated] Channel launching with args: "; args
    showChannelSGScreen(args)
end sub

sub showChannelSGScreen(args as Dynamic)
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.setMessagePort(m.port)

    scene = screen.CreateScene("MainScene")
    scene.id = "RootMainScene"
    screen.show()

    while(true)
        msg = wait(0, m.port)
        msgType = type(msg)
        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub
