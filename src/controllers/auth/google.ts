import type { Request, Response } from "express";
import prisma from "@/config/db";
import { z } from "zod";
import { formatZodError } from "@/utils/functions";
import logger from "@/utils/logger";
import { t } from "@/utils/i18nContext";
import { OAuth2Client } from "google-auth-library";
import { UserRole } from "@/generated/prisma/enums";
import { createSessionData, sanitizeUser } from "./verify";
import { createToken } from "@/utils/jwt";

export const googleAuthHandler = async (req: Request, res: Response) => {
  const googleAuthSchema = z.object({
    idToken: z.string(t("Google token is required")).min(10, {
      message: t("Invalid Google token"),
    }),

    type: z
      .string(t("Auth type is required"))
      .refine((val) => ["login", "register"].includes(val), {
        message: t("Type must be login or register"),
      }),
  });
  try {
    const result = googleAuthSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const { idToken, type } = result.data;

    const srouceApp = String(req.headers["source-app"] || "").toLowerCase();
    const role = srouceApp === "expert" ? UserRole.EXPERT : UserRole.CUSTOMER;

    const client = new OAuth2Client();

    const ticket = await client.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_IOS_CLIENT_ID!,
        process.env.GOOGLE_ANDROID_CLIENT_ID!,
        process.env.GOOGLE_WEB_CLIENT_ID!,
      ],
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        message: t("Invalid Google token"),
      });
    }

    const googleUser = {
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      emailVerified: payload.email_verified,
    };

    if (!googleUser.email) {
      return res.status(401).json({
        message: t("Email is required"),
      });
    }

    if (!googleUser.emailVerified) {
      return res.status(403).json({
        message: t("Email not verified"),
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: googleUser.email! },
    });

    if (type === "register") {
      if (existingUser) {
        return res.status(409).json({
          message: t("User already exists"),
        });
      }
      const user = await prisma.user.create({
        data: {
          email: googleUser.email!,
          firstName: googleUser.firstName!,
          lastName: googleUser.lastName!,
          googleId: googleUser.googleId!,
          role,
          passwordHash: "",
        },
      });

      const session = await prisma.session.create({
        data: createSessionData(user.id, req),
      });

      const access_token = createToken({
        userId: user.id,
        role: user.role,
        sessionId: session.id,
      });

      return res.status(200).json({
        user: sanitizeUser(user),
        access_token,
      });
    }

    if (!existingUser) {
      return res.status(409).json({
        message: t("No user found with this email"),
      });
    }

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
  } catch (error) {
    logger.error("Google authentication failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};
