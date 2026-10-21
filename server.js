import express from "express";
import rooms from "./routes/rooms.js";
import ghost from "./routes/ghost.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));
app.use(rooms);
app.use(ghost);

app.listen(PORT, () => {
  console.log(`Terms of Dread is haunting http://localhost:${PORT}`);
});
