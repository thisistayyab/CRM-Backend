import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv'
import { mongoDB_connection } from './Database/db.js'
const app = express();
dotenv.config()

// const port = process.env.PORT||3000

mongoDB_connection()
.then(()=>{
  // app.listen(port, () => {
  //   console.log(`Example app listening on port ${port}`)
  // })
console.log("working correctly")
})
.catch((err)=>{
  console.log(err)
})

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            "https://crm-frontend-tawny-nine.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000"
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log("CORS blocked origin:", origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
import { router } from './routes/user.routes.js';
import { router as productRouter } from './routes/product.routes.js';

app.use("/v1/api/user",router)
app.use("/v1/api/product", productRouter)


export default app