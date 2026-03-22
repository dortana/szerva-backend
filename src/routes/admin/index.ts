import { getCustomers } from "@/controllers/admin";
import {
  addLocationHandler,
  editLocationHandler,
} from "@/controllers/admin/locations";
import { UserRole } from "@/generated/prisma/enums";
import requiresAuth from "@/middlewares/auth";
import { Router } from "express";

const router = Router();

// everything below this line is protected
router.use(requiresAuth(UserRole.ADMIN));

router.get("/users", getCustomers);

router.post("/locations", addLocationHandler);
router.put("/locations", editLocationHandler);

export default router;
