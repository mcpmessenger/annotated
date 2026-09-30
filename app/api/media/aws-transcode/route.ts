import { NextRequest, NextResponse } from "next/server";
import { MediaConvertClient, CreateJobCommand } from "@aws-sdk/client-mediaconvert";

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
    const { objectKey } = body;

    if (!objectKey) {
      return NextResponse.json({ error: "objectKey is required" }, { status: 400, headers: CORS_HEADERS });
    }

    const inputBucket = process.env.AWS_S3_INPUT_BUCKET || "annotated-raw-uploads";
    const outputBucket = process.env.AWS_S3_OUTPUT_BUCKET || "annotated-processed-videos";
    const roleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN; // Set this in Vercel to arn:aws:iam::396608803476:role/AnnotatedMediaConvertRole

    if (!roleArn) {
      return NextResponse.json({ error: "AWS_MEDIACONVERT_ROLE_ARN is missing" }, { status: 500, headers: CORS_HEADERS });
    }

    const mcClient = new MediaConvertClient({
      region: process.env.AWS_REGION || "us-east-1",
      // endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT // Will auto-discover if omitted
    });

    const fileInputPath = `s3://${inputBucket}/${objectKey}`;
    const baseName = objectKey.replace(/^raw\//, "").replace(/\.[^.]+$/, "");
    const outputPrefix = `s3://${outputBucket}/processed/${baseName}`;

    const params = {
      Role: roleArn,
      Settings: {
        Inputs: [
          {
            FileInput: fileInputPath,
            AudioSelectors: {
              "Audio Selector 1": { DefaultSelection: "DEFAULT" }
            },
            VideoSelector: {}
          }
        ],
        OutputGroups: [
          {
            Name: "File Group",
            OutputGroupSettings: {
              Type: "FILE_GROUP_SETTINGS",
              FileGroupSettings: {
                Destination: outputPrefix
              }
            },
            Outputs: [
              {
                ContainerSettings: {
                  Container: "MP4",
                  Mp4Settings: {
                    MoovPlacement: "NORMAL"
                  }
                },
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      MaxBitrate: 2000000,
                      RateControlMode: "QVBR",
                      QvbrSettings: { QvbrQualityLevel: 7 },
                      FramerateControl: "INITIALIZE_FROM_SOURCE",
                      GopSize: 2,
                      GopSizeUnits: "SECONDS"
                    }
                  },
                  Width: 432,
                  Height: 240
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: {
                        Bitrate: 96000,
                        CodingMode: "CODING_MODE_2_0",
                        SampleRate: 48000
                      }
                    }
                  }
                ],
                Extension: "mp4"
              }
            ]
          }
        ]
      }
    };

    const command = new CreateJobCommand(params as any);
    const result = await mcClient.send(command);

    return NextResponse.json({
      jobId: result.Job?.Id,
      message: "Transcoding started"
    }, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error("[MediaConvert Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to start transcode" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
