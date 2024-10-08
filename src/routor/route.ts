const express = require("express");
const router = express.Router();
router.get("/", (req: any, res: any) => {
  res.send("Hello World");
});

router.use("/auth", require("./userRoute"));
router.use("/tender", require("./tenderRoute"));
router.use("/ads", require("./adsRoute"));
router.use('/blog', require('./blogRoute'));

module.exports = router;
