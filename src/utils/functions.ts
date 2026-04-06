import { createS3Client } from "@/config/aws";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { ZodError } from "zod";
import { Resend } from "resend";
import { appName } from "./app_data";
import { MapboxFeature } from "./addressUtils";
import crypto from "crypto";
import path from "path";
import { r2, s3 } from "./s3";

export const formatZodError = (error: ZodError) => {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join(".") : "body",
    message: issue.message,
  }));
};

export const uploadToS3 = async (file: Express.Multer.File, key: string) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
};

export async function deleteFromS3(fileUrl?: string | null) {
  if (!fileUrl) return;

  const awsS3 = createS3Client();

  try {
    const bucket = process.env.AWS_S3_BUCKET_NAME!;
    const region = process.env.AWS_REGION!;

    const prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;

    if (!fileUrl.startsWith(prefix)) {
      // safety check – don't delete unknown URLs
      return;
    }

    const key = fileUrl.replace(prefix, "");

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await awsS3.send(command);
  } catch (error: any) {
    console.error("Delete S3 error:", error);
  }
}

export const uploadToR2 = async (file: Express.Multer.File, key: string) => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await r2.send(command);

  return `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${key}`;
};

export const deleteFromR2 = async (key: string) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });

    await r2.send(command);

    return true;
  } catch (error) {
    console.error("Failed to delete from R2:", { key, error });
    return false;
  }
};

export const generateFileName = (file: Express.Multer.File, key: string) => {
  const ext = path.extname(file.originalname);

  const randomHash = crypto.randomBytes(16).toString("hex"); // 32 chars

  return `${key}-${Date.now()}-${randomHash}${ext}`;
};

export const sendEmailWithTemplate = async ({
  to,
  subject,
  template,
}: {
  to: string;
  subject: string;
  template: React.ReactElement;
}) => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: appName + " <onboarding@resend.dev>",
    to: [to],
    subject: subject,
    react: template,
  });
};

export const sendSMS = async ({ to, text }: { to: string; text: string }) => {
  const apiKey = process.env.INFOBIP_API_KEY;
  if (!apiKey) {
    throw new Error("INFOBIP_API_KEY is not set");
  }

  try {
    const response = await fetch(
      "https://6z952z.api.infobip.com/sms/3/messages",
      {
        method: "POST",
        headers: {
          Authorization: `App ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              destinations: [{ to }],
              sender: process.env.INFOBIP_SENDER || "Dortana",
              content: { text },
            },
          ],
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.requestError?.serviceException?.text || "Failed to send SMS",
      );
    }

    return data;
  } catch (error: any) {
    console.error("SMS sending failed:", error.message);

    throw error; // let caller handle it
  }
};

export const searchAddress = async (
  query: string,
): Promise<MapboxFeature[]> => {
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

  if (!MAPBOX_TOKEN) {
    throw new Error("Missing MAPBOX_TOKEN");
  }

  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query,
    )}.json?access_token=${MAPBOX_TOKEN}&country=hu&types=address&autocomplete=true&limit=10&language=hu`,
  );

  if (!res.ok) {
    throw new Error("Mapbox request failed");
  }

  const data = await res.json();
  return data.features;
};
