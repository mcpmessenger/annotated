package com.annotated.mobile

import android.os.Build
import android.os.Bundle
import android.content.Intent
import android.net.Uri

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme)
    handleShareIntent(intent)
    super.onCreate(null)
  }

  override fun onNewIntent(intent: Intent?) {
    handleShareIntent(intent)
    super.onNewIntent(intent)
    setIntent(intent)
  }

  private fun handleShareIntent(intent: Intent?) {
    if (intent != null && intent.action == Intent.ACTION_SEND && "text/plain" == intent.type) {
        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
        if (sharedText != null) {
            // Check if it's a URL
            if (sharedText.startsWith("http://") || sharedText.startsWith("https://")) {
                intent.action = Intent.ACTION_VIEW
                intent.data = Uri.parse(sharedText)
            } else {
                // If it contains a URL in text (e.g. "Check this out https://youtube.com/...")
                val urlRegex = "(https?://[^\\s]+)".toRegex()
                val match = urlRegex.find(sharedText)
                if (match != null) {
                    intent.action = Intent.ACTION_VIEW
                    intent.data = Uri.parse(match.value)
                }
            }
        }
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }
      super.invokeDefaultOnBackPressed()
  }
}
