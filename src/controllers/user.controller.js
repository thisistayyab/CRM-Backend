import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from 'jsonwebtoken'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendMail } from "../utils/sendMail.js";
import crypto from 'crypto';
import { getRedisClient } from '../utils/redisClient.js';
import { PRODUCT_NAME } from '../constants/brand.js';
import { verificationEmail, resendVerificationEmail, passwordResetEmail } from '../utils/emailTemplates.js';
import { ensureUniqueUsername } from '../utils/username.js';
import { Store } from '../models/store.model.js';

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const generateAcessAndRefreshToken = async (userid)=>{
    try {
        const user = await User.findById(userid)
        if (!user) {
            throw new ApiError(404, "User not found for token generation");
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong at the end")
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    const redis = await getRedisClient();
    const { password, email, fullname, phone, storeName } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    if ([password, normalizedEmail, fullname, storeName].some((field) => !String(field || '').trim())) {
        throw new ApiError(400, 'Full name, store name, email, and password are required');
    }
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
        throw new ApiError(400, 'Please enter a valid email address');
    }
    if (normalizedPhone.length < 10) {
        throw new ApiError(400, 'Please enter a valid phone number (at least 10 digits)');
    }

    const existedUser = await User.findOne({ email: normalizedEmail });
    if (existedUser) {
        throw new ApiError(409, 'An account with this email already exists');
    }
    // Check if a pending signup exists in Redis
    const redisKey = `signup:${normalizedEmail}`;
    const pending = await redis.get(redisKey);
    if (pending) {
        throw new ApiError(429, 'A verification code was already sent. Please check your email or wait before retrying.');
    }
    // Generate code and store signup data in Redis
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const signupData = {
        password,
        email: normalizedEmail,
        fullname: fullname.trim(),
        phone: normalizedPhone,
        storeName: storeName.trim(),
        code,
    };
    await redis.set(redisKey, JSON.stringify(signupData), { EX: 15 * 60 }); // 15 min expiry
    // Send code by email
    try {
        const { html, text } = verificationEmail(code);
        await sendMail({
            to: normalizedEmail,
            subject: `Verify your email — ${PRODUCT_NAME}`,
            html,
            text,
        });
    } catch (err) {
        await redis.del(redisKey);
        throw new ApiError(500, 'Failed to send verification email. Please try again.');
    }
    return res.status(201).json(
        new ApiResponse(200, { email: normalizedEmail }, 'Verification code sent. Please check your inbox.')
    )
})

const verifyCode = asyncHandler(async (req, res) => {
    const redis = await getRedisClient();
    const { email, code } = req.body;
    if (!email || !code) throw new ApiError(400, 'Email and code are required');
    const redisKey = `signup:${email}`;
    const pending = await redis.get(redisKey);
    if (!pending) throw new ApiError(400, 'No pending verification found. Please sign up again.');
    const signupData = JSON.parse(pending);
    if (signupData.code !== code) {
        throw new ApiError(400, 'Invalid or expired verification code');
    }
    const existedUser = await User.findOne({ email: signupData.email });
    if (existedUser) {
        await redis.del(redisKey);
        throw new ApiError(409, 'An account with this email already exists');
    }

    const username = signupData.username
        ? signupData.username.toLowerCase()
        : await ensureUniqueUsername(signupData.email);
    const user = await User.create({
        fullname: signupData.fullname,
        email: signupData.email,
        password: signupData.password,
        phone: signupData.phone || '',
        username,
        isVerified: true,
    });

    if (signupData.storeName) {
        await Store.create({
            name: signupData.storeName,
            phone: signupData.phone || '',
            email: signupData.email,
            owner: user._id,
        });
    }

    await redis.del(redisKey);
    return res.status(200).json(new ApiResponse(200, {}, 'Email verified successfully. You can now log in.'));
});

const loginUser = asyncHandler(async(req,res)=>{
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new ApiError(400, 'Email is required');
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if(!user){
        throw new ApiError(400, "User not found")
    }
    if (!user.isVerified) {
        throw new ApiError(403, 'Please verify your email before logging in.');
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid Credentials")
    }
    
    const {accessToken, refreshToken} = await generateAcessAndRefreshToken(user._id)
    
    const logedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(
        new ApiResponse(
            200,
            {
                user:logedInUser,accessToken,refreshToken
            },
            "user loggedIn successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    }
    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(
        new ApiResponse(
            200,
            {},
            "User loggedout successfully"
        )
    )
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request")
    }
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id)
    if(!user){
        throw new ApiError(401,"Invalid Refresh Token")
    }
    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401, "Refresh Token is expired")
    }
    const {accessToken, refreshToken} = await generateAcessAndRefreshToken(user._id)
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(
            200,
            {
                accessToken, refreshToken
            },
            "New Token Created Successfully"
        )
    )
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user._id).select('+password')
    const checkPass = await user.isPasswordCorrect(oldPassword)
    if(!checkPass){
        throw new ApiError(400,"Password doesn't match")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})
    return res.status(200).json(
        new ApiResponse(200,{}, "Password Changed successfully")
    )
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched Successfully"))
})

const updateAccount = asyncHandler(async(req,res)=>{
    const {fullname, email, phone, address} = req.body;
    let profilepicUrl = undefined;
    if (req.file) {
        const cloudinaryResult = await uploadOnCloudinary(req.file.buffer);
        profilepicUrl = cloudinaryResult?.secure_url;
    }
    const updateFields = {};
    if(fullname) updateFields.fullname = fullname;
    if(email) updateFields.email = email;
    if(phone) updateFields.phone = phone;
    if(address) updateFields.address = address;
    if(profilepicUrl) updateFields.profilepic = profilepicUrl;
    if(Object.keys(updateFields).length === 0){
        throw new ApiError(400, "No fields to update");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: updateFields },
        { new:true }
    ).select("-password");
    return res.status(200).json(new ApiResponse(200, user, "Profile updated successfully"));
})

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}, '-password -refreshToken');
    return res.status(200).json(new ApiResponse(200, users, 'Users fetched successfully'));
});

const resendCode = asyncHandler(async (req, res) => {
    const redis = await getRedisClient();
    const { email } = req.body;
    if (!email) throw new ApiError(400, 'Email is required');
    const redisKey = `signup:${email}`;
    const pending = await redis.get(redisKey);
    if (!pending) throw new ApiError(400, 'No pending verification found. Please sign up again.');
    const signupData = JSON.parse(pending);
    // Generate new code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    signupData.code = code;
    await redis.set(redisKey, JSON.stringify(signupData), { EX: 15 * 60 }); // reset expiry
    try {
        const { html, text } = resendVerificationEmail(code);
        await sendMail({
            to: email,
            subject: `New verification code — ${PRODUCT_NAME}`,
            html,
            text,
        });
    } catch (err) {
        throw new ApiError(500, 'Failed to resend verification email. Please try again.');
    }
    return res.status(200).json(new ApiResponse(200, { email }, 'A new verification code has been sent.'));
});

const forgotPassword = asyncHandler(async (req, res) => {
    const redis = await getRedisClient();
    const { email } = req.body;
    if (!email) throw new ApiError(400, 'Email is required');
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, 'No account found with that email.');
    }
    const redisKey = `reset:${email}`;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(redisKey, code, { EX: 10 * 60 }); // 10 min expiry
    try {
        const { html, text } = passwordResetEmail(code);
        await sendMail({
            to: email,
            subject: `Reset your password — ${PRODUCT_NAME}`,
            html,
            text,
        });
    } catch (err) {
        // Do not reveal error to user
    }
    return res.status(200).json(new ApiResponse(200, {}, 'A reset code has been sent to your email.'));
});

const resetPassword = asyncHandler(async (req, res) => {
    const redis = await getRedisClient();
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) throw new ApiError(400, 'Email, code, and new password are required');
    const redisKey = `reset:${email}`;
    const storedCode = await redis.get(redisKey);
    if (!storedCode || storedCode !== code) {
        throw new ApiError(400, 'Invalid or expired reset code');
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new ApiError(400, 'User not found');
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    await redis.del(redisKey);
    return res.status(200).json(new ApiResponse(200, {}, 'Password has been reset. You can now log in.'));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccount,
    getAllUsers,
    verifyCode,
    resendCode,
    forgotPassword,
    resetPassword
}