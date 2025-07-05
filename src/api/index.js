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
import { mongoDB_connection } from '../Database/db.js';
import serverless from 'serverless-http';

dotenv.config();

let isConnected = false;
const handler = serverless(app);

const wrappedHandler = async (req, res) => {
  if (!isConnected) {
    await mongoDB_connection();
    isConnected = true;
  }
  return handler(req, res);
};

export default wrappedHandler;
