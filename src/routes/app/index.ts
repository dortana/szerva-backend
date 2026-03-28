import { getCategories } from "@/controllers/app/categories";
import { getLocations } from "@/controllers/app/locations";
import { getServices } from "@/controllers/app/services";
import { logoutHandler } from "@/controllers/app/logout";
import { UserRole } from "@/generated/prisma/enums";
import requiresAuth from "@/middlewares/auth";
import { Router } from "express";
import {
  getUserInformation,
  updateUserInformation,
} from "@/controllers/app/user-info";
import { getExperts } from "@/controllers/app/experts";

const router = Router();

router.get("/categories", getCategories);
router.get("/services", getServices);
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
router.put("/me", updateUserInformation);
router.get("/logout", logoutHandler);

export default router;
