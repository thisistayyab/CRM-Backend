import { Router } from "express";
import { getStore, updateStore } from "../controllers/store.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.use(verifyJWT)
router.route("/get-store").get(getStore)
router.route("/update-store").post(updateStore)

export { router as storeRouter } 