with open('extension/widget.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Add audio Blob state and recorder
audio_state = """
let recordedAudioBlob = null;
let mediaRecorder = null;
let audioChunks = [];
"""

text = text.replace("let mediaDataUrl = null, mediaType = null, mediaFileName = null;", "let mediaDataUrl = null, mediaType = null, mediaFileName = null;\n" + audio_state)

# Replace dictateBtn logic to record real audio webm blob
old_dictate_logic = """  if (dictateBtn) {
    dictateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!recognition) {
        alert("Dictation is not supported in this browser.");
        return;
      }
      if (isRecording) {
        stopDictation();
      } else {
        isRecording = true;
        dictateBtn.classList.add('recording');
        recognition.start();
      }
    });
  }"""

new_dictate_logic = """  if (dictateBtn) {
    dictateBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (isRecording) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        stopDictation();
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioChunks = [];
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
          };
          mediaRecorder.onstop = () => {
            recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            dictateBtn.innerHTML = '🎙️ Audio Recorded! (Click to re-record)';
          };
          mediaRecorder.start();
          isRecording = true;
          dictateBtn.classList.add('recording');
          dictateBtn.innerHTML = '🔴 Recording Audio... (Click to stop)';
          if (recognition) recognition.start();
        } catch (err) {
          console.error('[AudioRecorder] Mic access error:', err);
          if (recognition) {
            isRecording = true;
            dictateBtn.classList.add('recording');
            recognition.start();
          }
        }
      }
    });
  }"""

text = text.replace(old_dictate_logic, new_dictate_logic)

# In publish process, upload recordedAudioBlob if present
upload_audio_code = """      let audio_url = null;
      if (recordedAudioBlob) {
        try {
          const fileName = `audio_${Date.now()}.webm`;
          const uploadRes = await fetch(`${supabase.url}/storage/v1/object/annotation-media/${fileName}`, {
            method: 'POST',
            headers: {
              'apikey': supabase.key,
              'Authorization': `Bearer ${supabase.token || supabase.key}`,
              'Content-Type': 'audio/webm'
            },
            body: recordedAudioBlob
          });
          if (uploadRes.ok) {
            audio_url = `${supabase.url}/storage/v1/object/public/annotation-media/${fileName}`;
          }
        } catch (err) {
          console.error('[AudioUpload] Error:', err);
        }
      }
"""

# Insert upload_audio_code before supabase.insertAnnotation payload
text = text.replace('const annotation = {', upload_audio_code + '\n      const annotation = {\n        audio_url,')

with open('extension/widget.js', 'w', encoding='utf-8') as f:
    f.write(text)
with open('../annotated-extension-w-logos/annotated-extension-w-logos/widget.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Upgraded widget.js with MediaRecorder audio capture & Supabase storage upload!")
