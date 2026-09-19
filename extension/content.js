(() => {
  const state = { annotations: [] };
  const getKey = () => `page:${location.origin}${location.pathname}`;

  // ─── Load & render existing highlights ───────────────────────────────────────
    const getExactSourceUrl = () => {
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const anchorNode = selection.anchorNode;
        const element = anchorNode?.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode?.parentElement;
        const tweetArticle = element?.closest('article[data-testid="tweet"]');
        if (tweetArticle) {
          const statusLink = tweetArticle.querySelector('a[href*="/status/"]');
          if (statusLink) {
            const href = statusLink.getAttribute('href');
            if (href) return href.startsWith('http') ? href : `https://x.com${href}`;
          }
        }
      }
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && canonical.href) return canonical.href;
    } catch (_) {}
    return location.href;
  };

  
  // Inject custom highlight styles into document
  if (!document.getElementById('annotated-highlight-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'annotated-highlight-style';
    styleEl.textContent = `
      .annotated-highlight {
        background-color: #ffd21a !important;
        color: #000 !important;
        cursor: pointer !important;
        border-radius: 3px;
        padding: 0 2px;
        transition: all 0.2s ease;
      }
      .annotated-highlight:hover {
        background-color: #f0c400 !important;
        box-shadow: 0 0 10px rgba(255, 210, 26, 0.8);
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  const load = () => {
    chrome.storage.local.get(getKey()).then(data => {
      state.annotations = data[getKey()] || [];
      state.annotations.forEach(renderHighlight);
    });

    const cleanUrl = location.origin + location.pathname;
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';
    fetch(`https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?url=ilike.${encodeURIComponent('%' + cleanUrl + '%')}`, {
      headers: { 'apikey': anonKey }
    })
    .then(r => r.json())
    .then(data => {
      if (Array.isArray(data)) {
        data.forEach(ann => {
          if (!state.annotations.find(a => a.id === ann.id)) {
            state.annotations.push(ann);
            renderHighlight(ann);
          }
        });
      }
    })
    .catch(() => {});
  };

  const renderHighlight = (annotation) => {
    const quote = annotation.quote || annotation.quote_text;
    if (!quote || !document.body) return false;
    if (document.querySelector(`[data-annotated-highlight="${annotation.id}"]`)) return true;

    const targetText = quote.trim();
    const searchPhrases = [targetText];
    if (targetText.length > 25) {
      searchPhrases.push(targetText.slice(0, 25));
    }

    for (const phrase of searchPhrases) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const index = node.nodeValue.indexOf(phrase);
        if (index !== -1 && !node.parentElement?.closest('[data-annotated-highlight]')) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + phrase.length);
          const mark = document.createElement('mark');
          mark.dataset.annotatedHighlight = annotation.id;
          mark.className = 'annotated-highlight';
          mark.title = `${annotation.intent || 'Annotation'} - ${annotation.commentary || annotation.comment || ''}`;
          try { 
            range.surroundContents(mark); 
            return true; 
          } catch (_) {}
        }
      }
    }
    return false;
  };

  setInterval(() => {
    state.annotations.forEach(ann => renderHighlight(ann));
  }, 1000);

  let widgetIframe = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  let widgetContainer = null;
  let shadowRoot = null;

  function createWidget(x, y) {
    if (!document.body) return;
    if (!widgetContainer || !document.body.contains(widgetContainer)) {
      widgetContainer = document.createElement('div');
      widgetContainer.id = 'annotated-layer-' + crypto.randomUUID().split('-')[0];
      widgetContainer.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; left: 0;';
      shadowRoot = widgetContainer.attachShadow({ mode: 'open' });
      document.body.appendChild(widgetContainer);
    }

    if (!widgetIframe) {
      widgetIframe = document.createElement('iframe');
      widgetIframe.src = chrome.runtime.getURL('widget.html');
      widgetIframe.allow = 'microphone; display-capture';
      widgetIframe.style.cssText = `
        position: fixed;
        width: 360px;
        height: 390px;
        max-height: 90vh;
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        background: transparent;
        display: block;
        color-scheme: light dark;
        transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      shadowRoot.appendChild(widgetIframe);

      window.addEventListener('message', (e) => {
        if (e.data?.type === 'DRAG_START') {
          isDragging = true;
          // clientX from the iframe is already relative to the iframe's top-left corner
          dragOffset.x = e.data.clientX;
          dragOffset.y = e.data.clientY;
          widgetIframe.style.pointerEvents = 'none';
        } else if (e.data?.type === 'CLOSE_WIDGET') {
          widgetIframe.style.display = 'none';
          stopDictation();
        } else if (e.data?.type === 'RESIZE_WIDGET') {
          if (widgetIframe && e.data.height) {
            widgetIframe.style.height = `${e.data.height}px`;
          }
        } else if (e.data?.type === 'START_DICTATION') {
          console.log('[Content Host] Window message received: START_DICTATION');
          startDictation();
        } else if (e.data?.type === 'STOP_DICTATION') {
          console.log('[Content Host] Window message received: STOP_DICTATION');
          stopDictation();
        }
      });
    } else if (!shadowRoot.contains(widgetIframe)) {
      shadowRoot.appendChild(widgetIframe);
    }

    widgetIframe.style.display = 'block';
    positionWidget(x, y);
  }

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      widgetIframe.style.left = (e.clientX - dragOffset.x) + 'px';
      widgetIframe.style.top = (e.clientY - dragOffset.y) + 'px';
    }, { capture: true });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        widgetIframe.style.pointerEvents = 'auto';
      }
    }, { capture: true });

  function positionWidget(x, y) {
    let posX = (typeof x === 'number' && !isNaN(x)) ? x : (window.innerWidth - 380);
    let posY = (typeof y === 'number' && !isNaN(y)) ? y : 20;
    let left = posX + 20;
    let top = posY - 30;
    if (left + 340 > window.innerWidth) left = window.innerWidth - 360;
    if (top + 370 > window.innerHeight) top = window.innerHeight - 390;
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    widgetIframe.style.left = left + 'px';
    widgetIframe.style.top = top + 'px';
  }

  // Buffer the latest selection to survive aggressive SPA clears (like X.com)
  let lastKnownSelection = null;
  let lastKnownRect = null;
  
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const quote = selection?.toString().replace(/\s+/g, ' ').trim();
    if (quote && quote.length >= 2 && selection.rangeCount > 0) {
      lastKnownSelection = quote;
      lastKnownRect = selection.getRangeAt(0).getBoundingClientRect();
    } else {
      // Clear if they actually deselected (not just X.com being aggressive on mouseup)
      // We rely on mousedown to clear it to be safe
    }
  });

  document.addEventListener('mousedown', (e) => {
    // If they click outside the widget, clear the fallback so it doesn't pop up again
    if (!widgetContainer || !widgetContainer.contains(e.target)) {
      lastKnownSelection = null;
      lastKnownRect = null;
    }
  }, { capture: true });

  const recordSelection = () => {
    const selection = window.getSelection();
    let quote = selection?.toString().replace(/\s+/g, ' ').trim();
    let rect = null;

    if (quote && quote.length >= 2 && selection.rangeCount > 0) {
      rect = selection.getRangeAt(0).getBoundingClientRect();
    } else if (lastKnownSelection) {
      // Fallback for X.com which might clear selection on mouseup
      quote = lastKnownSelection;
      rect = lastKnownRect;
    }

    if (!quote || quote.length < 2 || !rect) return;
    
    // Always open widget immediately
    try {
      createWidget(rect.right, rect.top);
    } catch (err) {
      console.warn('[Annotated] createWidget error:', err);
    }

    const payload = {
      quote,
      url: getExactSourceUrl(),
      title: document.title,
      hostname: location.hostname,
      timestamp: Date.now(),
    };

    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ pendingSelection: payload }, () => {
          chrome.runtime.sendMessage({ type: 'selection', ...payload }).catch(() => {});
        });
      }
    } catch (_) {}
  };

  document.addEventListener('mouseup', () => setTimeout(recordSelection, 10));
  document.addEventListener('keyup', (e) => { if (e.key === 'Shift') setTimeout(recordSelection, 10); });

  // ─── Message handler ─────────────────────────────────────────────────────────
  
  // ─── Multimodal 240p Video Clipper (Max 90s) & Audio Fusion ───────────────
  let activeVideoRecorder = null;
  let activeRecordStream = null;
  let activeAudioStream = null;
  let activeSpeakerBridge = null;
  let activeVideoEl = null;
  let activeAnimFrameId = null;
  let isRecordingVideo = false;
  let pendingSendResponse = null;

  async function startOffscreenSpeakerBridge(audioStream) {
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'ENSURE_OFFSCREEN' }, resolve);
      });

      const pc = new RTCPeerConnection();
      activeSpeakerBridge = pc;

      audioStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, audioStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (pc.iceGatheringState !== 'complete') {
        await new Promise((resolve) => {
          const check = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', check);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', check);
          setTimeout(resolve, 60);
        });
      }

      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_START_AUDIO_BRIDGE',
        sdp: pc.localDescription.sdp
      }, async (res) => {
        if (res && res.sdp && pc.signalingState !== 'closed') {
          try {
            await pc.setRemoteDescription({ type: 'answer', sdp: res.sdp });
          } catch (_) {}
        }
      });
    } catch (err) {
      console.warn('[Annotated] Live speaker bridge warning:', err);
    }
  }

  function stopOffscreenSpeakerBridge() {
    if (activeSpeakerBridge) {
      try { activeSpeakerBridge.close(); } catch (_) {}
      activeSpeakerBridge = null;
    }
    try {
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_AUDIO_BRIDGE' }).catch(() => {});
    } catch (_) {}
  }

  function stopRecordingNow() {
    if (!isRecordingVideo && !activeVideoRecorder) return;
    isRecordingVideo = false;
    if (activeAnimFrameId) {
      if (activeVideoEl && 'cancelVideoFrameCallback' in activeVideoEl) {
        try { activeVideoEl.cancelVideoFrameCallback(activeAnimFrameId); } catch (_) {}
      }
      cancelAnimationFrame(activeAnimFrameId);
      activeAnimFrameId = null;
    }
    stopOffscreenSpeakerBridge();
    if (activeVideoRecorder && activeVideoRecorder.state === 'recording') {
      try {
        activeVideoRecorder.stop();
      } catch (err) {
        console.warn('[Annotated] Error calling recorder.stop():', err);
      }
    }
  }

  async function capture240pVideoClip(durationSeconds = 15, streamId, sendResponse) {
    if (isRecordingVideo) {
      stopRecordingNow();
    }

    const video = document.querySelector('video');
    if (!video) {
      sendResponse({ error: 'No video element found on this page.' });
      return;
    }

    try {
      pendingSendResponse = sendResponse;
      isRecordingVideo = true;
      activeVideoEl = video;

      const canvas = document.createElement('canvas');
      canvas.width = 426;  // 240p width
      canvas.height = 240; // 240p height
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(24); // 24 FPS
      activeRecordStream = stream;

      // ─── Audio Acquisition (Multi-tier: Tab Capture -> video element -> Silent WebAudio) ───
      let audioTrackAdded = false;

      // 1. Tab Capture audio via streamId
      let targetStreamId = streamId;
      if (!targetStreamId) {
        try {
          const bgRes = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'getTabAudioStreamId' }, resolve);
          });
          if (bgRes && bgRes.streamId) {
            targetStreamId = bgRes.streamId;
          }
        } catch (_) {}
      }

      if (targetStreamId) {
        try {
          const tabAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: targetStreamId
              },
              optional: [
                { echoCancellation: false },
                { autoGainControl: false },
                { noiseSuppression: false }
              ]
            }
          });
          if (tabAudioStream && tabAudioStream.getAudioTracks().length > 0) {
            activeAudioStream = tabAudioStream;
            const tabTrack = tabAudioStream.getAudioTracks()[0];
            if (tabTrack) {
              stream.addTrack(tabTrack);
              audioTrackAdded = true;
              startOffscreenSpeakerBridge(tabAudioStream);
            }
          }
        } catch (err) {
          console.warn('[Annotated] Tab audio getUserMedia error:', err);
        }
      }

      // 2. Video element captureStream fallback (works on non-CORS videos)
      if (!audioTrackAdded) {
        try {
          const vidStream = (video.captureStream && video.captureStream()) || (video.mozCaptureStream && video.mozCaptureStream());
          if (vidStream && vidStream.getAudioTracks().length > 0) {
            stream.addTrack(vidStream.getAudioTracks()[0]);
            audioTrackAdded = true;
          }
        } catch (_) {}
      }

      // 3. Silent Web Audio fallback (Ensures container ALWAYS has Opus track so player speaker icon is never disabled)
      if (!audioTrackAdded) {
        try {
          const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioCtxClass();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const dest = audioCtx.createMediaStreamDestination();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          gain.gain.value = 0; // Silent
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
          const silentTrack = dest.stream.getAudioTracks()[0];
          if (silentTrack) {
            stream.addTrack(silentTrack);
            audioTrackAdded = true;
          }
        } catch (e) {
          console.warn('[Annotated] Silent audio creation fallback failed:', e);
        }
      }

      // Codecs negotiation
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 800000
      });
      activeVideoRecorder = recorder;
      const chunks = [];
      const recordStartTime = Date.now();
      const maxDurationMs = Math.min(durationSeconds, 90) * 1000;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        isRecordingVideo = false;
        if (activeAnimFrameId) {
          if (activeVideoEl && 'cancelVideoFrameCallback' in activeVideoEl) {
            try { activeVideoEl.cancelVideoFrameCallback(activeAnimFrameId); } catch (_) {}
          }
          cancelAnimationFrame(activeAnimFrameId);
          activeAnimFrameId = null;
        }
        stopOffscreenSpeakerBridge();
        try {
          stream.getTracks().forEach(t => t.stop());
        } catch (_) {}
        if (activeAudioStream) {
          try {
            activeAudioStream.getTracks().forEach(t => t.stop());
          } catch (_) {}
          activeAudioStream = null;
        }

        const rawBlob = new Blob(chunks, { type: 'video/webm' });
        const actualDurationMs = Math.max(Date.now() - recordStartTime, 500);

        const finalize = (finalBlob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (pendingSendResponse) {
              pendingSendResponse({
                dataUrl: reader.result,
                duration: Math.round(actualDurationMs / 1000)
              });
              pendingSendResponse = null;
            }
          };
          reader.readAsDataURL(finalBlob);
        };

        const fixFn = typeof ysFixWebmDuration === 'function' ? ysFixWebmDuration : (window.ysFixWebmDuration || null);
        if (fixFn) {
          fixFn(rawBlob, actualDurationMs, (fixedBlob) => {
            finalize(fixedBlob);
          });
        } else {
          finalize(rawBlob);
        }
      };

      // Draw initial frame before starting recorder
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (_) {}

      // Continuous recording without 100ms micro-chunking prevents audio stutter
      recorder.start(1000);

      const renderFrame = () => {
        if (!isRecordingVideo || !activeVideoRecorder || activeVideoRecorder.state !== 'recording') {
          return;
        }
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (_) {}

        if (Date.now() - recordStartTime >= maxDurationMs) {
          stopRecordingNow();
        } else {
          if ('requestVideoFrameCallback' in video) {
            activeAnimFrameId = video.requestVideoFrameCallback(renderFrame);
          } else {
            activeAnimFrameId = requestAnimationFrame(renderFrame);
          }
        }
      };

      if ('requestVideoFrameCallback' in video) {
        activeAnimFrameId = video.requestVideoFrameCallback(renderFrame);
      } else {
        activeAnimFrameId = requestAnimationFrame(renderFrame);
      }
    } catch (err) {
      isRecordingVideo = false;
      if (pendingSendResponse) {
        pendingSendResponse({ error: err.message || 'Failed to capture video clip.' });
        pendingSendResponse = null;
      }
    }
  }

  // ─── Speech-to-Text (STT) Engine ───────────────────────────────────────────
  let activeSpeechRecognition = null;
  let isDictating = false;
  let isStarting = false;
  let restartTimeoutId = null;
  let sessionAccumulatedFinal = '';
  let currentRunFinal = '';
  let consecutiveErrors = 0;

  function sendDictationEvent(payload) {
    console.log('[Content STT Dispatch]', payload);
    if (widgetIframe && widgetIframe.contentWindow) {
      try {
        widgetIframe.contentWindow.postMessage(payload, '*');
      } catch (_) {}
    } else {
      try {
        chrome.runtime.sendMessage(payload).catch(() => {});
      } catch (_) {}
    }
  }

  async function startDictation() {
    console.log('[Content STT] startDictation() initiated');
    if (isDictating || isStarting) {
      console.log('[Content STT] Already active or starting, ignoring duplicate start request.');
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.error('[Content STT] webkitSpeechRecognition unavailable');
      sendDictationEvent({
        type: 'DICTATION_ERROR',
        error: 'Speech recognition is not supported on this browser/page.'
      });
      return;
    }

    isStarting = true;
    cleanupSTT(false);
    sessionAccumulatedFinal = '';
    currentRunFinal = '';
    consecutiveErrors = 0;
    isDictating = true;

    // Check permission state first to avoid redundant getUserMedia requests
    let hasPermission = false;
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'microphone' });
        console.log('[Content STT] navigator.permissions microphone state:', perm.state);
        if (perm.state === 'granted') {
          hasPermission = true;
        } else if (perm.state === 'denied') {
          isDictating = false;
          isStarting = false;
          sendDictationEvent({
            type: 'DICTATION_ERROR',
            error: 'Microphone is blocked for this site. Click the lock icon in the URL bar to allow.'
          });
          return;
        }
      } catch (_) {}
    }

    if (!hasPermission && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      sendDictationEvent({ type: 'DICTATION_STATUS', status: 'Requesting mic permission…' });
      try {
        console.log('[Content STT] Requesting getUserMedia to prompt for microphone permission...');
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
        await new Promise(r => setTimeout(r, 120));
      } catch (err) {
        console.warn('[Content STT] getUserMedia error:', err);
        isDictating = false;
        isStarting = false;
        sendDictationEvent({
          type: 'DICTATION_ERROR',
          error: 'Microphone permission denied. Allow mic access to dictate.'
        });
        return;
      }
    }

    sendDictationEvent({ type: 'DICTATION_STATUS', status: '🎙️ Mic active… listening' });

    function initRecognition() {
      if (!isDictating) return;

      try {
        console.log('[Content STT] Initializing SpeechRecognition session');
        const recognition = new SpeechRec();
        activeSpeechRecognition = recognition;
        let recognitionFailed = false;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';

        recognition.onstart = () => {
          console.log('[Content STT] Event: onstart');
          isStarting = false;
          consecutiveErrors = 0;
          sendDictationEvent({ type: 'DICTATION_STARTED' });
        };

        recognition.onaudiostart = () => {
          console.log('[Content STT] Event: onaudiostart');
          sendDictationEvent({ type: 'DICTATION_STATUS', status: '🎙️ Mic active… listening' });
        };

        recognition.onresult = (event) => {
          consecutiveErrors = 0;
          let runFinal = '';
          let interimTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              runFinal += item[0].transcript + ' ';
            } else {
              interimTranscript += item[0].transcript;
            }
          }
          currentRunFinal = runFinal;
          const fullText = (sessionAccumulatedFinal + currentRunFinal + interimTranscript).trimStart();
          console.log('[Content STT] Transcribed total:', fullText);
          sendDictationEvent({
            type: 'DICTATION_RESULT',
            text: fullText,
            finalTranscript: sessionAccumulatedFinal + currentRunFinal,
            interimTranscript: interimTranscript
          });
        };

        recognition.onerror = (event) => {
          console.warn('[Content STT] Event: onerror! Code:', event.error, event);
          if (event.error === 'aborted') {
            return;
          }
          if (event.error === 'no-speech') {
            // Normal silence pause, do not kill the dictation session
            return;
          }

          recognitionFailed = true;
          consecutiveErrors++;

          if (event.error === 'not-allowed') {
            isDictating = false;
            sendDictationEvent({
              type: 'DICTATION_ERROR',
              error: 'Microphone permission blocked. Please allow mic access.'
            });
          } else if (event.error === 'audio-capture') {
            if (consecutiveErrors > 2) {
              isDictating = false;
              sendDictationEvent({
                type: 'DICTATION_ERROR',
                error: 'Microphone not available or busy in another app.'
              });
            }
          } else if (event.error === 'network') {
            if (consecutiveErrors > 2) {
              isDictating = false;
              sendDictationEvent({
                type: 'DICTATION_ERROR',
                error: 'Speech recognition network error. Please check your connection.'
              });
            }
          } else {
            if (consecutiveErrors > 2) {
              isDictating = false;
              sendDictationEvent({
                type: 'DICTATION_ERROR',
                error: `Dictation error: ${event.error}`
              });
            }
          }
        };

        recognition.onend = () => {
          console.log('[Content STT] Event: onend. isDictating:', isDictating, 'recognitionFailed:', recognitionFailed);
          sessionAccumulatedFinal += currentRunFinal;
          currentRunFinal = '';

          if (isDictating && consecutiveErrors <= 2) {
            console.log('[Content STT] Still dictating; re-engaging session...');
            restartTimeoutId = setTimeout(() => {
              if (isDictating) {
                initRecognition();
              }
            }, 250);
            return;
          }

          cleanupSTT(consecutiveErrors <= 2);
        };

        console.log('[Content STT] Calling recognition.start()...');
        recognition.start();
      } catch (err) {
        console.error('[Content STT] Failed to initialize recognition:', err);
        consecutiveErrors++;
        if (isDictating && consecutiveErrors <= 2) {
          restartTimeoutId = setTimeout(() => {
            if (isDictating) initRecognition();
          }, 350);
        } else {
          cleanupSTT(false);
          sendDictationEvent({
            type: 'DICTATION_ERROR',
            error: err.message || 'Failed to start dictation.'
          });
        }
      }
    }

    initRecognition();
  }

  function cleanupSTT(notifyEnded = true) {
    console.log('[Content STT] cleanupSTT called. notifyEnded:', notifyEnded);
    isDictating = false;
    isStarting = false;
    if (restartTimeoutId) {
      clearTimeout(restartTimeoutId);
      restartTimeoutId = null;
    }
    if (activeSpeechRecognition) {
      const rec = activeSpeechRecognition;
      activeSpeechRecognition = null;
      try { rec.abort(); } catch (_) {}
    }
    if (notifyEnded) {
      sendDictationEvent({ type: 'DICTATION_ENDED' });
    }
  }

  function stopDictation() {
    console.log('[Content STT] stopDictation() called by user');
    isDictating = false;
    isStarting = false;
    cleanupSTT(true);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_DICTATION') {
      console.log('[Content Host] chrome.runtime message received: START_DICTATION');
      startDictation();
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'STOP_DICTATION') {
      console.log('[Content Host] chrome.runtime message received: STOP_DICTATION');
      stopDictation();
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'stopVideo') {
      stopRecordingNow();
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'captureVideo') {
      capture240pVideoClip(message.duration || 90, message.streamId, sendResponse);
      return true;
    }
    if (message.type === 'openWidget') {
      createWidget(window.innerWidth - 380, 20);
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === 'saveAnnotation') {
      const annotation = { ...message.annotation, id: crypto.randomUUID(), url: location.href };
      state.annotations.push(annotation);
      chrome.storage.local.set({ [getKey()]: state.annotations }).then(() => {
        renderHighlight(annotation);
        sendResponse({ ok: true });
      });
      return true;
    }
    if (message.type === 'getPageInfo') {
      sendResponse({
        title: document.title,
        url: getExactSourceUrl(),
        hostname: location.hostname,
        selectedText: window.getSelection()?.toString().replace(/\s+/g, ' ').trim() || '',
      });
    }
  });

  load();
})();



