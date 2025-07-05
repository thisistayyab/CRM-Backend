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
//   app.listen(port, () => {
//     console.log(`Example app listening on port ${port}`)
//   })
console.log("working correctly")
})
.catch((err)=>{
  console.log(err)
})

app.use(cors({
    origin: "https://crm-frontend-tawny-nine.vercel.app/",
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


export default app