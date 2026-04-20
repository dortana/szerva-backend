import { getCategories } from "@/controllers/app/categories";
import { getLocations } from "@/controllers/app/locations";
import { getServices, getServiceCarousel } from "@/controllers/app/services";
import { logoutHandler } from "@/controllers/app/logout";
import { UserRole } from "@/generated/prisma/enums";
import requiresAuth from "@/middlewares/auth";
import { Router } from "express";
import {
  getUserInformation,
  setLocationHandler,
  setLanguageHandler,
} from "@/controllers/app/user-info";
import { getExperts } from "@/controllers/app/experts";
import {
  resendVerificationPhoneHandler,
  sendPhoneVerificationHandler,
  verifyPhoneHandler,
} from "@/controllers/auth/verify";
import {
  newAddressHandler,
  searchAddressHandler,
} from "@/controllers/app/addresses";

const router = Router();

router.get("/categories", getCategories);
router.get("/services", getServices);
router.get("/service-carousel", getServiceCarousel);
router.get("/locations", getLocations);
router.get("/experts", getExperts);

router.use(
  requiresAuth(
    UserRole.CUSTOMER,
    UserRole.EXPERT,
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
  ),
);
router.get("/me", getUserInformation);
// router.put("/me", updateUserInformation);
router.post("/me/send-phone-verification", sendPhoneVerificationHandler);
router.post("/me/verify-phone", verifyPhoneHandler);
router.post("/me/resend-verification-phone", resendVerificationPhoneHandler);
router.get("/me/search-address", searchAddressHandler);
router.post("/me/add-address", newAddressHandler);

router.put("/set-location", setLocationHandler);
router.put("/set-language", setLanguageHandler);

router.get("/logout", logoutHandler);

export default router;
