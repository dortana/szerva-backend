import {
  onboardingAddPersonalInfo,
  onboardingUploadDocuments,
} from "@/controllers/experts";
import { UserRole } from "@/generated/prisma/enums";
import requiresAuth from "@/middlewares/auth";
import { upload } from "@/middlewares/upload";
import { Router } from "express";
import multer from "multer";
import { t } from "@/utils/i18nContext";

const router = Router();

// everything below this line is protected
router.use(requiresAuth(UserRole.EXPERT));

router.post("/onboarding/personal-info", onboardingAddPersonalInfo);

router.post(
  "/onboarding/documents-upload",
  (req, res, next) => {
    upload.fields([
      { name: "idCardFront" },
      { name: "idCardBack" },
      { name: "selfie" },
      { name: "addressCard" },
    ])(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: t("File is too large. Maximum size is 5MB"),
          });
        }

        return res.status(400).json({
          message: err.message,
        });
      }

      if (err) {
        return res.status(400).json({
          message: err.message,
        });
      }

      next();
    });
  },
  onboardingUploadDocuments,
);

export default router;
