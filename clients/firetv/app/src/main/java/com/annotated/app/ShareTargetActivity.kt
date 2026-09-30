package com.annotated.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import java.net.URLEncoder

class ShareTargetActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
        val sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT) ?: ""

        val queryParams = mutableListOf<String>()
        if (sharedText.isNotBlank()) {
            queryParams.add("text=" + URLEncoder.encode(sharedText, "UTF-8"))
        }
        if (sharedSubject.isNotBlank()) {
            queryParams.add("title=" + URLEncoder.encode(sharedSubject, "UTF-8"))
        }

        val targetUrl = if (queryParams.isNotEmpty()) {
            "https://annotated-repo.vercel.app/share?" + queryParams.joinToString("&")
        } else {
            "https://annotated-repo.vercel.app/share"
        }

        val mainIntent = Intent(this, MainActivity::class.java).apply {
            putExtra("TARGET_URL", targetUrl)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(mainIntent)

        finish()
    }
}
