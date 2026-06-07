import mongoose from "mongoose";
import dns from "dns";

// Windows/ISP DNS often fails SRV lookups for mongodb+srv:// (Compass & Vercel still work).
// Use reliable DNS servers — override via DNS_SERVERS=8.8.8.8,1.1.1.1 in .env if needed.
const dnsServers = (process.env.DNS_SERVERS || "8.8.8.8,8.8.4.4,1.1.1.1").split(",").map(s => s.trim());
dns.setServers(dnsServers);

const mongoDB_connection = async () =>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI }/CRM`);
        console.log("mongoDB connected successfully")
    } catch (error) {
        console.log("Connection failed", error);
        process.exit();
    }
}

export { mongoDB_connection}