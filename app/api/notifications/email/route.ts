import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface NotificationEmailPayload {
  recipient_id: string;
  recipient_email?: string;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  quote?: string;
  comment_text?: string;
  annotation_id?: string;
  type?: "mention" | "comment" | "reply";
}

/**
 * Generates LinkedIn-style email HTML with:
 * - Brand logo on the left
 * - Header dock on right with persistent notification bell and unread badge count
 * - Sender card, anchored quote, comment text, and direct CTA button
 */
function buildLinkedInStyleEmail(params: {
  senderName: string;
  senderAvatar?: string;
  message: string;
  quote?: string;
  commentText?: string;
  annotationId?: string;
  unreadCount: number;
  type: string;
}): string {
  const {
    senderName,
    senderAvatar,
    message,
    quote,
    commentText,
    annotationId,
    unreadCount,
  } = params;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://annotated-repo.vercel.app";
  const noteUrl = annotationId ? `${siteUrl}/annotations/${annotationId}` : siteUrl;
  const settingsUrl = `${siteUrl}`;
  const displayBadge = unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : "1";
  const avatarSrc = senderAvatar || `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(senderName)}&backgroundColor=0d9488&textColor=ffffff`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Annotated Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
          
          <!-- ─── PERSISTENT HEADER (LinkedIn Style) ────────────────────────── -->
          <tr>
            <td style="background-color: #ffffff; padding: 16px 24px; border-bottom: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <!-- Left: Logo -->
                  <td align="left" style="vertical-align: middle;">
                    <a href="${siteUrl}" style="text-decoration: none; display: inline-flex; align-items: center;">
                      <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; font-family: system-ui, sans-serif;">
                        annotated<span style="color: #0d9488;">.</span>
                      </span>
                    </a>
                  </td>

                  <!-- Right: Persistent Header Icons & Notification Bell -->
                  <td align="right" style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-table;">
                      <tr>
                        <!-- Network / Feed Icon -->
                        <td style="padding: 0 10px; vertical-align: middle;">
                          <a href="${siteUrl}/explore" style="text-decoration: none; color: #64748b; font-size: 14px;" title="Explore Feed">
                            <span style="font-size: 16px; opacity: 0.75;">👥</span>
                          </a>
                        </td>

                        <!-- Comments / Discussions Icon -->
                        <td style="padding: 0 10px; vertical-align: middle;">
                          <a href="${siteUrl}" style="text-decoration: none; color: #64748b; font-size: 14px;" title="Discussions">
                            <span style="font-size: 16px; opacity: 0.75;">💬</span>
                          </a>
                        </td>

                        <!-- Notification Bell with Red Badge Count -->
                        <td style="padding: 0 4px 0 10px; vertical-align: middle; position: relative;">
                          <a href="${noteUrl}" style="text-decoration: none; display: inline-block; position: relative;" title="Notifications">
                            <span style="font-size: 18px; display: inline-block; vertical-align: middle;">🔔</span>
                            <span style="display: inline-block; background-color: #ef4444; color: #ffffff; font-size: 10px; font-weight: 800; border-radius: 999px; min-width: 16px; height: 16px; line-height: 16px; text-align: center; vertical-align: top; margin-left: -6px; margin-top: -6px; padding: 0 3px;">
                              ${displayBadge}
                            </span>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── HERO NOTIFICATION BODY ───────────────────────────────────── -->
          <tr>
            <td style="padding: 28px 24px;">
              
              <!-- Sender Header Row -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="48" style="vertical-align: top; padding-right: 14px;">
                    <img src="${avatarSrc}" alt="${senderName}" width="46" height="46" style="border-radius: 50%; object-fit: cover; border: 1.5px solid #0d9488; display: block;" />
                  </td>
                  <td style="vertical-align: top;">
                    <div style="font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                      ${senderName}
                    </div>
                    <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                      ${message}
                    </div>
                  </td>
                </tr>
              </table>

              ${
                quote
                  ? `<!-- Anchored Quote Box -->
              <div style="margin-top: 20px; padding: 12px 16px; background-color: #f8fafc; border-left: 3.5px solid #0d9488; border-radius: 0 8px 8px 0; font-size: 13.5px; color: #334155; font-style: italic; line-height: 1.45;">
                &ldquo;${quote}&rdquo;
              </div>`
                  : ""
              }

              ${
                commentText
                  ? `<!-- Comment Message Card -->
              <div style="margin-top: 16px; padding: 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14.5px; color: #1e293b; line-height: 1.5;">
                ${commentText}
              </div>`
                  : ""
              }

              <!-- Action Call-To-Action Button -->
              <div style="margin-top: 26px; text-align: center;">
                <a href="${noteUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);">
                  View Note &amp; Discussion &rarr;
                </a>
              </div>

            </td>
          </tr>

          <!-- ─── FOOTER WITH SETTINGS LINK ─────────────────────────────────── -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e5e7eb; font-size: 11.5px; color: #64748b; text-align: center; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">
                You received this email because you have notifications turned on in your 
                <a href="${settingsUrl}" style="color: #0d9488; text-decoration: underline; font-weight: 600;">Annotated settings</a>.
              </p>
              <p style="margin: 0; color: #94a3b8;">
                To turn off email notifications, visit the preferences gear in your Annotated extension or web profile.
              </p>
              <div style="margin-top: 12px; font-size: 11px; color: #cbd5e1;">
                &copy; 2026 Annotated &middot; The public annotation layer for the internet
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body: NotificationEmailPayload = await req.json().catch(() => ({}));
    const {
      recipient_id,
      sender_name,
      sender_avatar,
      message,
      quote,
      comment_text,
      annotation_id,
      type = "mention",
    } = body;

    if (!recipient_id || !message) {
      return NextResponse.json(
        { error: "recipient_id and message are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("[Notifications] RESEND_API_KEY is not configured in environment");
      return NextResponse.json(
        { skipped: true, reason: "RESEND_API_KEY not configured" },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let targetEmail = body.recipient_email;
    let emailNotificationsEnabled = true;

    // Fetch user profile if recipient_email is not directly provided
    if (supabaseUrl && supabaseKey) {
      try {
        const profRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(recipient_id)}&select=*`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        if (profRes.ok) {
          const profiles = await profRes.json();
          if (Array.isArray(profiles) && profiles.length > 0) {
            const p = profiles[0];
            if (!targetEmail && p.email) {
              targetEmail = p.email;
            }
            if (p.email_notifications === false) {
              emailNotificationsEnabled = false;
            }
          }
        }
      } catch (e) {
        console.warn("[Notifications] Error checking profile for email:", e);
      }
    }

    // Check if user turned off email notifications in settings
    if (!emailNotificationsEnabled) {
      return NextResponse.json(
        { skipped: true, reason: "User has disabled email notifications" },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (!targetEmail) {
      return NextResponse.json(
        { skipped: true, reason: "No verified email found for recipient" },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Fetch unread notification count for the persistent bell badge
    let unreadCount = 1;
    if (supabaseUrl && supabaseKey) {
      try {
        const countRes = await fetch(
          `${supabaseUrl}/rest/v1/notifications?recipient_id=eq.${encodeURIComponent(recipient_id)}&read=eq.false&select=id`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Range: "0-19",
            },
          }
        );
        if (countRes.ok) {
          const rows = await countRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            unreadCount = rows.length;
          }
        }
      } catch (e) {
        console.warn("[Notifications] Error fetching unread count:", e);
      }
    }

    const htmlContent = buildLinkedInStyleEmail({
      senderName: sender_name || "Someone",
      senderAvatar: sender_avatar,
      message,
      quote,
      commentText: comment_text,
      annotationId: annotation_id,
      unreadCount,
      type,
    });

    const fromEmail = process.env.RESEND_FROM_EMAIL || "Annotated <onboarding@resend.dev>";
    const emailSubject = `${sender_name || "Someone"} ${type === "mention" ? "mentioned you" : "commented"} on Annotated`;

    let resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [targetEmail],
        subject: emailSubject,
        html: htmlContent,
      }),
    });

    let resendData = await resendRes.json();

    // If Resend is using onboarding@resend.dev, it only permits sending to the verified account owner (williamtflynn@gmail.com).
    // Automatically forward test notifications to the account owner so they arrive in your Gmail immediately!
    if (!resendRes.ok && (resendData?.statusCode === 403 || resendData?.name === "validation_error")) {
      const fallbackInbox = "williamtflynn@gmail.com";
      console.warn(`[Notifications] Target ${targetEmail} blocked by Resend sandbox. Forwarding test to ${fallbackInbox}`);

      const fallbackSubject = `[Annotated Test for ${targetEmail}] ${emailSubject}`;
      const sandboxBanner = `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px 16px;margin:12px auto;max-width:600px;border-radius:8px;font-family:sans-serif;font-size:12px;color:#92400e;">
        <strong>Resend Sandbox Notice:</strong> This notification was intended for <strong>${targetEmail}</strong>, but delivered to your verified testing inbox (<strong>${fallbackInbox}</strong>) because custom domain verification is pending at <a href="https://resend.com/domains" style="color:#b45309;font-weight:bold;">resend.com/domains</a>.
      </div>`;

      const fallbackRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [fallbackInbox],
          subject: fallbackSubject,
          html: sandboxBanner + htmlContent,
        }),
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        return NextResponse.json(
          {
            success: true,
            emailId: fallbackData.id,
            sandboxForwarded: true,
            deliveredTo: fallbackInbox,
            originalTarget: targetEmail,
            unreadCount,
          },
          { headers: CORS_HEADERS }
        );
      }
    }

    if (!resendRes.ok) {
      console.error("[Notifications] Resend send error:", resendData);
      return NextResponse.json(
        { error: resendData?.message || "Failed to send email via Resend" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, emailId: resendData.id, unreadCount, sentTo: targetEmail },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error("[Notifications] Exception in email route:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
