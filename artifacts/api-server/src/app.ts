import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow server-to-server (no origin) and Replit/localhost preview origins
      if (!origin) return cb(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /\.replit\.dev$/.test(origin) ||
        /\.repl\.co$/.test(origin) ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
