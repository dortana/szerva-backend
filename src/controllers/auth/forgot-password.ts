import type { Request, Response } from "express";
import prisma from "@/config/db";
import { z } from "zod";
import { formatZodError } from "@/utils/functions";
import crypto from "crypto";
import { t } from "@/utils/i18nContext";
import logger from "@/utils/logger";

export const forgotPasswordHandler = async (req: Request, res: Response) => {
  const forgotPasswordSchema = z.object({
    email: z
      .email({
        message: t("Email address is invalid"),
      })
      .min(5, {
        message: t("Email must be at least 5 characters long"),
      }),
  });
  try {
    const result = forgotPasswordSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const { email } = result.data;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (!existingUser) {
      return res.status(409).json({
        message: t("No user found with this email"),
      });
    }

    await prisma.verification.deleteMany({
      where: { email, expiresAt: { gt: new Date() } },
    });

    const code = generateCode();
    console.log("OTP Code For Forgot Password: ", code); // TODO: remove later
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    await prisma.verification.create({
      data: {
        email,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    return res.status(200).json({
      message: t(
        "If the email exists, A verification code has been sent to your email, Please check your inbox.",
      ),
    });
  } catch (error) {
    logger.error("Forgot password request failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
