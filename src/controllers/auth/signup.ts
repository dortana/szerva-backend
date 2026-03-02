import type { Request, Response } from "express";
import prisma from "@/config/db";
import { z } from "zod";
import { formatZodError, sendEmailWithTemplate } from "@/utils/functions";
import crypto from "crypto";
import { getTranslator } from "@/utils/i18nContext";
import bcrypt from "bcrypt";
import { VerifyEmailTemplate } from "@/emails/VerifyEmailTemplate";
import logger from "@/utils/logger";
import { UserRole } from "@/generated/prisma/enums";

export const signUpHandler = async (req: Request, res: Response) => {
  const t = getTranslator();
  const signUpSchema = z.object({
    email: z
      .email({
        message: t("Email address is invalid"),
      })
      .min(5, {
        message: t("Email must be at least 5 characters long"),
      }),
    firstName: z.string(t("First name is required")).min(2, {
      message: t("Firstname must be at least 2 characters long"),
    }),
    lastName: z.string(t("Last name is required")).min(2, {
      message: t("Lastname must be at least 2 characters long"),
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
    const result = signUpSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const { email, firstName, lastName, password } = result.data;

    // 🔎 Check header for register-type
    const registerType = String(
      req.headers["register-type"] || "",
    ).toLowerCase();

    const role =
      registerType === "expert" ? UserRole.EXPERT : UserRole.CUSTOMER;

    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: t("A user with this email already exists"),
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        role,
      },
    });

    await prisma.verification.deleteMany({
      where: { email, expiresAt: { gt: new Date() } },
    });

    const code = generateCode();
    console.log("OTP Code For Sign Up: ", code); // TODO: remove later
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    await prisma.verification.create({
      data: {
        email,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    await sendEmailWithTemplate({
      to: email,
      subject: "OTP Verification",
      template: VerifyEmailTemplate({
        firstName: user.firstName,
        validationCode: code,
      }),
    });

    return res.status(201).json({
      message: t(
        "A verification code has been sent to your email, Please check your inbox.",
      ),
    });
  } catch (error) {
    logger.error("Signup failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
