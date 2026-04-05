import { t } from "@/utils/i18nContext";
import type { Request, Response } from "express";
import prisma from "@/config/db";
import logger from "@/utils/logger";
import { DocumentType, OnBoardingStatus } from "@/generated/prisma/enums";
import { generateFileName, uploadToR2 } from "@/utils/functions";
import { z } from "zod";
import { formatZodError } from "@/utils/functions";

export const onboardingAddPersonalInfo = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user?.userId!;

  try {
    const { firstName, lastName, dateOfBirth } = req.body;
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: t("No user found"),
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        dateOfBirth,
        onBoardingStatus: OnBoardingStatus.PHONE_VERIFICATION,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        image: true,
        dateOfBirth: true,
        updatedAt: true,
      },
    });

    const { id, ...rest } = updatedUser;

    return res.status(200).json({
      user: { userId: id, ...rest },
    });
  } catch (error) {
    logger.error("Update user info failed", {
      error,
    });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

export const onboardingUploadDocuments = async (
  req: Request,
  res: Response,
) => {
  const userId = req.user?.userId!;

  try {
    if (!req.files) {
      return res.status(400).json({
        message: t("No files uploaded"),
      });
    }

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    // Map files → validation object
    const input = {
      idCardFront: files?.idCardFront?.[0],
      idCardBack: files?.idCardBack?.[0],
      selfie: files?.selfie?.[0],
      addressCard: files?.addressCard?.[0],
    };

    // Zod schema
    const uploadSchema = z.object({
      idCardFront: z.any().refine(Boolean, {
        message: t("ID card front is required"),
      }),
      idCardBack: z.any().refine(Boolean, {
        message: t("ID card back is required"),
      }),
      selfie: z.any().refine(Boolean, {
        message: t("Selfie is required"),
      }),
      addressCard: z.any().refine(Boolean, {
        message: t("Address card is required"),
      }),
    });

    const result = uploadSchema.safeParse(input);

    if (!result.success) {
      return res.status(400).json({
        message: t("Invalid input"),
        errors: formatZodError(result.error),
      });
    }

    const validatedFiles = result.data;

    const uploadedUrls: Record<string, string> = {};

    await prisma.$transaction(async (tx) => {
      for (const [field, file] of Object.entries(validatedFiles)) {
        const typedField = field as keyof typeof fieldToDocumentType;

        const fileName = generateFileName(file, field);
        const key = `users/${userId}/documents/${fileName}`;

        const url = await uploadToR2(file, key);

        uploadedUrls[field] = url;

        await tx.document.create({
          data: {
            type: fieldToDocumentType[typedField],
            size: file.size,
            fileUrl: url,
            userId,
          },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          onBoardingStatus: OnBoardingStatus.UNDER_REVIEW,
        },
      });
    });

    return res.status(200).json({
      message: t("Files uploaded successfully"),
      files: uploadedUrls,
    });
  } catch (error) {
    logger.error("Upload documents failed", { error });

    return res.status(500).json({
      message: t("Internal server error"),
    });
  }
};

const fieldToDocumentType = {
  idCardFront: DocumentType.ID_CARD_FRONT,
  idCardBack: DocumentType.ID_CARD_BACK,
  selfie: DocumentType.SELFIE,
  addressCard: DocumentType.ADDRESS_CARD,
} as const;
