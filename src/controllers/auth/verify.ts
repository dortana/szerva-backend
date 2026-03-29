import type { Request, Response } from "express";
import prisma from "@/config/db";
import { success, z } from "zod";
import {
  formatZodError,
  sendEmailWithTemplate,
  sendSMS,
} from "@/utils/functions";
import { createToken, tokenMaxAge } from "@/utils/jwt";
import crypto from "crypto";
import { t } from "@/utils/i18nContext";
import bcrypt from "bcrypt";
import { OnBoardingStatus, User, UserRole } from "@/generated/prisma/client";
import { NewPasswordEmailTemplate } from "@/emails/NewPasswordEmailTemplate";
import logger from "@/utils/logger";
import { ApiError } from "@/utils/api-error";
import { generateCode } from "./signup";
import VerifyEmailTemplate from "@/emails/VerifyEmailTemplate";
import { isValidPhoneNumber } from "libphonenumber-js";

const createVerifyEmailSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .email(t("Email address is invalid"))
      .min(5, { message: t("Email must be at least 5 characters long") }),

    code: z
      .string(t("Verification code is required"))
      .length(6, t("Verification code must be 6 digits"))
      .regex(/^\d+$/, t("Verification code must be numeric")),
  });

const createVerifyPhoneSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .email(t("Email address is invalid"))
      .min(5, { message: t("Email must be at least 5 characters long") }),
    phone: z
      .string(t("Phone number is invalid"))
      .refine((value) => isValidPhoneNumber(value), {
        message: t("Phone number is invalid"),
      }),
    code: z
      .string(t("Verification code is required"))
      .length(6, t("Verification code must be 6 digits"))
      .regex(/^\d+$/, t("Verification code must be numeric")),
  });

export const verifyEmailHandler = async (req: Request, res: Response) => {
  const schema = createVerifyEmailSchema(t);

  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(parsed.error),
      });
    }

    const { email, code } = parsed.data;

    const record = await verifyEmailCode(email, code, t);

    const { user, session } = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUniqueOrThrow({
        where: { email },
      });

      if (!user.emailVerified) {
        user = await tx.user.update({
          where: { email },
          data: { emailVerified: new Date() },
        });
      }

      const session = await tx.session.create({
        data: createSessionData(user.id, req),
      });

      await tx.verification.delete({ where: { id: record.id } });

      return { user, session };
    });

    const access_token = createToken({
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    });

    return res.status(200).json({ user: sanitizeUser(user), access_token });
  } catch (error) {
    logger.error("Email verification failed", {
      error,
    });
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }
    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const verifyPhoneHandler = async (req: Request, res: Response) => {
  const schema = createVerifyPhoneSchema(t);

  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(parsed.error),
      });
    }

    const { email, phone, code } = parsed.data;

    const record = await verifyPhoneCode(phone, code, t);

    const { user, status } = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUniqueOrThrow({
        where: { email },
      });

      if (!user.phoneVerified) {
        user = await tx.user.update({
          where: { email },
          data: { phoneVerified: new Date(), phone },
        });
      }

      if (
        user.role === UserRole.EXPERT &&
        user.onBoardingStatus === OnBoardingStatus.PHONE_VERIFICATION
      ) {
        user = await tx.user.update({
          where: { phone },
          data: { onBoardingStatus: OnBoardingStatus.ADDRESS_INFO },
        });
      }

      await tx.verification.delete({ where: { id: record.id } });

      return { user, status: "success" };
    });

    return res.status(200).json({ user: sanitizeUser(user), status });
  } catch (error) {
    logger.error("Phone verification failed", {
      error,
    });
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }
    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const sendPhoneVerificationHandler = async (
  req: Request,
  res: Response,
) => {
  const phoneSchema = z.object({
    phone: z
      .string(t("Phone number is invalid"))
      .refine((value) => isValidPhoneNumber(value), {
        message: t("Phone number is invalid"),
      }),
    email: z
      .email({
        message: t("Email address is invalid"),
      })
      .min(5, {
        message: t("Email must be at least 5 characters long"),
      }),
  });
  try {
    const result = phoneSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const { phone, email } = result.data;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (!existingUser || existingUser.phone) {
      return res.status(409).json({
        message: t(
          "No user found with this email or phone number already exists",
        ),
      });
    }

    await prisma.verification.deleteMany({
      where: { phone },
    });

    const code = generateCode();
    console.log("OTP Code For Phone Verification: ", code); // TODO: remove later
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    await prisma.verification.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    await sendSMS({
      to: phone,
      text: `Your verification code is: ${code}`,
    });

    return res.status(200).json({
      message: t("A verification code has been sent to your phone"),
    });
  } catch (error) {
    logger.error("Phone verification failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const forgotPasswordVerifyEmailHandler = async (
  req: Request,
  res: Response,
) => {
  const schema = createVerifyEmailSchema(t);

  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(parsed.error),
      });
    }

    const { email, code } = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: t("No user found with this email"),
      });
    }

    const record = await verifyEmailCode(email, code, t);

    await prisma.verification.delete({ where: { id: record.id } });

    const password = crypto.randomBytes(6).toString("hex").slice(0, 12);

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
      },
    });

    console.log("New Password: ", password);

    await sendEmailWithTemplate({
      to: email,
      subject: "New Password",
      template: NewPasswordEmailTemplate({
        // @ts-ignore
        firstName: existingUser.firstName,
        password,
      }),
    });

    return res.status(200).json({
      message: t(
        "Verification successful. You will recevice your new password within a few minutes by email.",
      ),
    });
  } catch (error) {
    logger.error("Forgot password verification failed", {
      error,
    });

    if (error instanceof ApiError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};
export const resendVerificationEmailHandler = async (
  req: Request,
  res: Response,
) => {
  const loginSchema = z.object({
    email: z
      .email({
        message: t("Email address is invalid"),
      })
      .min(5, {
        message: t("Email must be at least 5 characters long"),
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

    const { email } = result.data;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: t("No user found with this email"),
      });
    }

    const code = generateCode();
    console.log("OTP Code For Resend Code: ", code); // TODO: remove later
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    await prisma.verification.upsert({
      where: { email },
      update: {
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      },
      create: {
        email,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
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
        "A new verification code has been sent to your email, Please check your inbox.",
      ),
    });
  } catch (error) {
    logger.error("Resend failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const verifyEmailCode = async (
  email: string,
  code: string,
  t: (key: string) => string,
) => {
  const record = await prisma.verification.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new ApiError(t("Code not found"), 404);
  }

  if (record.expiresAt < new Date()) {
    throw new ApiError(t("Code has expired"), 410);
  }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  if (codeHash !== record.codeHash) {
    await prisma.verification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    throw new ApiError(t("Invalid verification code"), 400);
  }

  return record;
};

export const verifyPhoneCode = async (
  phone: string,
  code: string,
  t: (key: string) => string,
) => {
  const record = await prisma.verification.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new ApiError(t("Code not found"), 404);
  }

  if (record.expiresAt < new Date()) {
    throw new ApiError(t("Code has expired"), 410);
  }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  if (codeHash !== record.codeHash) {
    await prisma.verification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    throw new ApiError(t("Invalid verification code"), 400);
  }

  return record;
};

export const createSessionData = (userId: string, req: Request) => {
  return {
    userId,
    expiresAt: new Date(Date.now() + tokenMaxAge * 1000),
    sessionToken: crypto.randomBytes(32).toString("hex"),
    userAgent: req.headers["user-agent"] || null,
    ipAddress: req.ip || null,
  };
};

export const sanitizeUser = (user: User) => {
  // this is what we send to clients
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    onBoardingStatus: user.onBoardingStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
