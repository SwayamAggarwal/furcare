const express = require("express");
const { registerPet } = require("../controllers/petController");

const router = express.Router();

router.post("/register", registerPet);
router.get('/owner/:phone', require('./../controllers/petController').getPetsByOwner);
router.post('/:id/lost', require('./../controllers/petController').setLostStatus);

module.exports = router;
