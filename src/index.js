import { app } from './app.js'
import dotenv from 'dotenv'
import { mongoDB_connection } from './Database/db.js'
dotenv.config()

const port = process.env.PORT||3000

mongoDB_connection()
.then(()=>{
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
})
.catch((err)=>{
  console.log(err)
})