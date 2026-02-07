const { Router } = require("express");
const chatController = require("../controllers/ChatController");

const router = Router();

router.post("/", (req, res) => chatController.chat(req, res));

module.exports = router;
