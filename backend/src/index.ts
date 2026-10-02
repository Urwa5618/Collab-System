import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import routes from "./routes";
import { pool } from "./config/db";
import { redisClient } from "./config/redis";
import { initWebSocket } from "./ws";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use("/api", routes);
app.use(errorHandler);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

initWebSocket(io);

const port = Number(process.env.PORT) || 8080;

void pool
  .connect()
  .then((client) => client.release())
  .catch((err) => {
    console.error("Postgres connection error", err);
  });

redisClient.on("error", (err) => {
  console.error("Redis connection error", err);
});

httpServer.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
