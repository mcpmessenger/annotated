package com.annotated.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager

class FloatingOverlayService : Service() {
    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var params: WindowManager.LayoutParams? = null

    companion object {
        const val CHANNEL_ID = "annotated_overlay_channel"
        const val NOTIFICATION_ID = 4040
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createFloatingBubble()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Annotated Floating Bubble", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Annotated widget over YouTube, X and Chrome"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, launchIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Annotated is active")
                .setContentText("Widget is floating over YouTube, X & Chrome")
                .setSmallIcon(android.R.drawable.ic_menu_edit)
                .setContentIntent(pendingIntent)
                .setOngoing(true).build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Annotated is active")
                .setContentText("Widget is floating over YouTube, X & Chrome")
                .setSmallIcon(android.R.drawable.ic_menu_edit)
                .setContentIntent(pendingIntent)
                .setOngoing(true).build()
        }
    }

    private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics).toInt()

    private fun createFloatingBubble() {
        val sizePx = dp(62f)
        val screenW = resources.displayMetrics.widthPixels
        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        params = WindowManager.LayoutParams(sizePx, sizePx, layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT).apply {
            gravity = Gravity.TOP or Gravity.START
            x = screenW - sizePx - dp(14f)
            y = resources.displayMetrics.heightPixels / 3
        }

        val bubble = object : View(this) {
            private val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#0F172A") }
            private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#38BDF8"); style = Paint.Style.STROKE; strokeWidth = dp(3f).toFloat()
            }
            private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#2038BDF8"); style = Paint.Style.STROKE; strokeWidth = dp(7f).toFloat()
            }
            private val logoPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.parseColor("#38BDF8"); textAlign = Paint.Align.CENTER
                typeface = Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD)
            }
            private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#38BDF8") }

            override fun onDraw(canvas: Canvas) {
                val cx = width / 2f; val cy = height / 2f
                val r = minOf(cx, cy) - dp(3f)
                canvas.drawCircle(cx, cy, r, glowPaint)
                canvas.drawCircle(cx, cy, r, bgPaint)
                canvas.drawCircle(cx, cy, r, ringPaint)
                val fs = height * 0.40f
                logoPaint.textSize = fs
                canvas.drawText("A", cx, cy + fs * 0.33f - dp(2f), logoPaint)
                canvas.drawCircle(cx, cy + fs * 0.5f + dp(1f), dp(2.5f).toFloat(), dotPaint)
            }
        }

        var ix = 0; var iy = 0; var itx = 0f; var ity = 0f; var dragging = false
        bubble.setOnTouchListener { v, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> { ix = params!!.x; iy = params!!.y; itx = e.rawX; ity = e.rawY; dragging = false; true }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (e.rawX - itx).toInt(); val dy = (e.rawY - ity).toInt()
                    if (!dragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) dragging = true
                    if (dragging) {
                        params!!.x = ix + dx
                        params!!.y = (iy + dy).coerceIn(0, resources.displayMetrics.heightPixels - sizePx)
                        windowManager?.updateViewLayout(v, params)
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (dragging) {
                        params!!.x = if (params!!.x + sizePx / 2 < screenW / 2) dp(14f) else screenW - sizePx - dp(14f)
                        windowManager?.updateViewLayout(v, params)
                    } else {
                        packageManager.getLaunchIntentForPackage(packageName)?.apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                            putExtra("open_compose", true)
                        }?.let { startActivity(it) }
                    }
                    true
                }
                else -> false
            }
        }

        floatingView = bubble
        windowManager?.addView(floatingView, params)
    }

    override fun onDestroy() {
        super.onDestroy()
        floatingView?.let { windowManager?.removeView(it); floatingView = null }
    }
}
