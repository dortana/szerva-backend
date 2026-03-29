import { createS3Client } from "@/config/aws";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { ZodError } from "zod";
import { Resend } from "resend";
import { appName } from "./app_data";

export const formatZodError = (error: ZodError) => {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join(".") : "body",
    message: issue.message,
  }));
};

export async function uploadToS3(file: File, path: string = "uploads") {
  const awsS3 = createS3Client();
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileHashName = generateFileName(file);
    const key = `${path}/${fileHashName}-${Date.now()}`;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    };

    const command = new PutObjectCommand(params);
    await awsS3.send(command);

    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return publicUrl;
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error(error?.message ?? "Failed to upload file to storage");
  }
}

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

export const generateFileName = (file: File) => {
  // Get extension from MIME type → jpg/jpeg/png
  const ext = file.type.split("/")[1] || "bin";
  // Remove dashes to get a cleaner long hash
  const uuid = crypto.randomUUID().replace(/-/g, "");
  return `${uuid}.${ext}`;
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
