import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';
const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
import { router } from './routes/user.routes.js';
import { router as productRouter } from './routes/product.routes.js';

app.use("/v1/api/user",router)
app.use("/v1/api/product", productRouter)


export { app }