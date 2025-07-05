import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from 'jsonwebtoken'
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAcessAndRefreshToken = async (userid)=>{
    try {
        console.log("Starting token generation for user:", userid);
        const user = await User.findById(userid)
        if (!user) {
            throw new ApiError(404, "User not found for token generation");
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        console.log("Tokens generated and saved successfully");
        return {accessToken,refreshToken}
    } catch (error) {
        console.error("Token generation error:", error);
        throw new ApiError(500, "Something went wrong at the end")
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    const{ username, password, email, fullname} = req.body
    if([username,password,email,fullname].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"All fields are required");
    }
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, "User Already existed")
    }
    const user = await User.create({
        fullname, 
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Something went wrong at the end");
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser,"User created successfully")
    )
})

const loginUser = asyncHandler(async(req,res)=>{
    const {username, email, password} = req.body
    if(!username&&!email)throw new ApiError(400,"Email or username required");
    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    if(!user){
        throw new ApiError(400, "User not found")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid Credentials")
    }
    
    console.log("Generating tokens for user:", user._id);
    const {accessToken, refreshToken} = await generateAcessAndRefreshToken(user._id)
    console.log("Tokens generated successfully");
    
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
    const {accessToken , newrefreshToken} = await generateAcessAndRefreshToken(user._id)
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newrefreshToken, options).json(
        new ApiResponse(
            200,
            {
                accessToken, refreshToken: newrefreshToken
            },
            "New Token Created Successfully"
        )
    )
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user._id)
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
        const cloudinaryResult = await uploadOnCloudinary(req.file.path);
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


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccount,
}