// import { app } from './app.js'
// import dotenv from 'dotenv'
// import { mongoDB_connection } from './Database/db.js'
// dotenv.config()

// // const port = process.env.PORT||3000

// mongoDB_connection()
// .then(()=>{
//   // app.listen(port, () => {
//   //   console.log(`Example app listening on port ${port}`)
//   // })
//   console.log("working")
// })
// .catch((err)=>{
//   console.log(err)
// })

import { app } from '../app.js';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import { mongoDB_connection } from '../Database/db.js';

dotenv.config();

let isConnected = false;

const handlerFn = serverless(app);

export default async function handler(req, res) {
  try {
    if (!isConnected) {
      await mongoDB_connection();
      isConnected = true;
      console.log("✅ MongoDB connected");
    }
    return handlerFn(req, res);
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).send("Server error: " + err.message);
  }
}
