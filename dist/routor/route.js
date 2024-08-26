const express = require("express");
const router = express.Router();
router.get("/", (req, res) => {
    res.send("Hello World");
});
router.use("/auth", require("./userRoute"));
router.use("/tender", require("./tenderRoute"));
module.exports = router;
//# sourceMappingURL=route.js.map