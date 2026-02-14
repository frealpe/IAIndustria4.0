const { Router } = require("express");
const chatController = require("../controllers/ChatController");

const router = Router();

router.post("/", (req, res) => chatController.chat(req, res));
router.get("/test", (req, res) => res.json({ status: "ok", message: "Servidor AI en línea" }));

module.exports = router;
