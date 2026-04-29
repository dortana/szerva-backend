import { forgotPasswordHandler } from "@/controllers/auth/forgot-password";
import { googleAuthHandler } from "@/controllers/auth/google";
import { loginHandler } from "@/controllers/auth/login";
import { signUpHandler } from "@/controllers/auth/signup";
import {
  forgotPasswordVerifyEmailHandler,
  verifyEmailHandler,
  resendVerificationEmailHandler,
} from "@/controllers/auth/verify";
import { Router } from "express";

const router = Router();

router.post("/signup", signUpHandler);
router.post("/login", loginHandler);
router.post("/verify-email", verifyEmailHandler);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/verify-email-forgot-password", forgotPasswordVerifyEmailHandler);
router.post("/resend-verification-email", resendVerificationEmailHandler);
router.post("/google", googleAuthHandler);

export default router;
