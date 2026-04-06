import type { Request, Response } from "express";
import prisma from "@/config/db";
import { z } from "zod";
import { formatZodError, sendEmailWithTemplate } from "@/utils/functions";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { createToken } from "@/utils/jwt";
import { createSessionData, sanitizeUser } from "./verify";
import { VerifyEmailTemplate } from "@/emails/VerifyEmailTemplate";
import logger from "@/utils/logger";
import { generateCode } from "./signup";
import { t } from "@/utils/i18nContext";
import { UserRole } from "@/generated/prisma/enums";
import { OTP_EXPIRATION_MS } from "@/utils/app_data";

export const loginHandler = async (req: Request, res: Response) => {
  const loginSchema = z.object({
    email: z
      .email({
        message: t("Email address is invalid"),
      })
      .min(5, {
        message: t("Email must be at least 5 characters long"),
      }),
    password: z
      .string(t("Password is required"))
      .min(8, {
        message: t("Password must be at least 8 characters long"),
      })
      .regex(/[A-Z]/, {
        message: t("Password must contain an uppercase letter"),
      })
      .regex(/[a-z]/, {
        message: t("Password must contain a lowercase letter"),
      })
      .regex(/[0-9]/, { message: t("Password must contain a number") })
      .regex(/[^A-Za-z0-9]/, {
        message: t("Password must contain a special character"),
      }),
  });
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const { email, password } = result.data;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (!existingUser) {
      return res.status(409).json({
        message: t("No user found with this email"),
      });
    }

    //  Check header for source-app
    const srouceApp = String(req.headers["source-app"] || "").toLowerCase();
    if (
      srouceApp.toLowerCase() === "expert" &&
      existingUser?.role !== UserRole.EXPERT
    ) {
      return res.status(409).json({
        message: t("No user found with this email"),
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.passwordHash,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: t("Invalid email or password"),
      });
    }

    if (!existingUser.twoFactorEnabled && existingUser.emailVerified) {
      // generate access token and return it
      const session = await prisma.session.create({
        data: createSessionData(existingUser.id, req),
      });

      const access_token = createToken({
        userId: existingUser.id,
        role: existingUser.role,
        sessionId: session.id,
      });

      return res.status(200).json({
        user: sanitizeUser(existingUser),
        access_token,
      });
    }

    await prisma.verification.deleteMany({
      where: { email },
    });

    const code = generateCode();
    console.log("OTP Code For Login: ", code); // TODO: remove later
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    await prisma.verification.create({
      data: {
        email,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRATION_MS),
      },
    });

    await sendEmailWithTemplate({
      to: email,
      subject: "OTP Verification",
      template: VerifyEmailTemplate({
        firstName: existingUser.firstName,
        validationCode: code,
      }),
    });

    return res.status(200).json({
      otpRequired: true,
      message: t(
        "If the email exists, A verification code has been sent to your email, Please check your inbox.",
      ),
    });
  } catch (error) {
    logger.error("Login failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};
