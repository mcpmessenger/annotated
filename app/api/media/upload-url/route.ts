import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, contentType, userId } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Initialize S3 Client
    // AWS SDK automatically picks up AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from process.env
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
    });

    const bucketName = process.env.AWS_S3_INPUT_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        { error: "AWS_S3_INPUT_BUCKET is not configured on the server" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Create a unique object key prefixing with "raw/"
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = userId 
      ? `raw/${userId}_${Date.now()}_${safeFileName}`
      : `raw/anon_${Date.now()}_${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    // Generate Presigned URL valid for 5 minutes
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    
    // Calculate the final URL that MediaConvert will produce
    const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN || `https://${bucketName}.s3.amazonaws.com`;
    // uniqueFileName already has an extension. We strip it and let MediaConvert append .mp4
    const baseName = uniqueFileName.replace(/^raw\//, "").replace(/\.[^.]+$/, "");
    const finalMediaUrl = `${cdnDomain}/processed/${baseName}.mp4`;

    return NextResponse.json({
      uploadUrl: signedUrl,
      objectKey: uniqueFileName,
      finalMediaUrl: finalMediaUrl
    }, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error("[S3 Presign Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate upload URL" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
