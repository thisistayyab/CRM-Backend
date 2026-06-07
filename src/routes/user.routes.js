import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccount, getAllUsers, verifyCode, resendCode, forgotPassword, resetPassword } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authLimiter, emailLimiter } from "../middlewares/rateLimiter.js";

const router = Router()

router.route("/register").post(emailLimiter, registerUser)
router.route("/login").post(authLimiter, loginUser)
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/get-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT, upload.single("profilepic"), updateAccount)
router.route("/all").get(verifyJWT, getAllUsers)
router.route("/verify-code").post(authLimiter, verifyCode)
router.route("/resend-code").post(emailLimiter, resendCode)
router.route("/forgot-password").post(emailLimiter, forgotPassword)
router.route("/reset-password").post(authLimiter, resetPassword)

export {router}