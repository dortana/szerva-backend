import type { Request, Response } from "express";
import prisma from "@/config/db";

export const getCustomers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany();
  res.json(users);
};
