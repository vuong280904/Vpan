const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/play", async (req, res) => {

  try {

    const response = await axios.post(
      "http://127.0.0.1:8002/play",
      req.body
    );

    res.json(response.data);

  } catch (err) {

    console.error("Shiritori error:", err.message);

    res.status(500).json({
      error: "Shiritori AI server error"
    });

  }

});

module.exports = router;