package com.annotated.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import java.net.URLEncoder

class ProcessTextActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val selectedText = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()
        if (!selectedText.isNullOrBlank()) {
            val encoded = URLEncoder.encode(selectedText, "UTF-8")
            val targetUrl = "https://annotated-repo.vercel.app/share?text=$encoded"

            val mainIntent = Intent(this, MainActivity::class.java).apply {
                putExtra("TARGET_URL", targetUrl)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(mainIntent)
        }

        finish()
    }
}
