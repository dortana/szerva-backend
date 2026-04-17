import { getCustomers } from "@/controllers/customers";
import { UserRole } from "@/generated/prisma/enums";
import requiresAuth from "@/middlewares/auth";
import { Router } from "express";

const router = Router();

// everything below this line is protected
router.use(requiresAuth(UserRole.CUSTOMER));

router.get("/test", getCustomers);

export default router;
