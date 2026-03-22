import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import i18n from "i18n";
import routes from "@/routes";
import path from "path";
import { t } from "@/utils/i18nContext";
import { i18nContextMiddleware } from "./middlewares/i18nContextMiddleware";

// const messagesDir =
//   process.env.NODE_ENV === "production"
//     ? path.join(process.cwd(), "dist/messages")
//     : path.join(process.cwd(), "src/messages");

i18n.configure({
  locales: ["en-US", "hu-HU"],
  directory: path.join(process.cwd(), "src/messages"),
  defaultLocale: "en-US",
  objectNotation: true,
});

const app = express();

app.use(i18n.init);
app.use(i18nContextMiddleware);

app.use(express.json());

app.use("/api", routes);

app.get("/", (req: Request, res: Response) => {
  return res.status(200).json({
    message:
      t("Welcome to the Szerva API") + ` ==> ENV: ${process.env.NODE_ENV}`,
  });
});

export default app;
