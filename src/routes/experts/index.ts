import { onboardingAddPersonalInfo } from "@/controllers/experts";
import { UserRole } from "@/generated/prisma/enums";
import requiresAuth from "@/middlewares/auth";
import { Router } from "express";

const router = Router();

// everything below this line is protected
router.use(requiresAuth(UserRole.EXPERT));

router.post("/onboarding/personal-info", onboardingAddPersonalInfo);

export default router;
