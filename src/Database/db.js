import mongoose from "mongoose";
import dns from "dns";

const dnsServers = (process.env.DNS_SERVERS || "8.8.8.8,8.8.4.4,1.1.1.1").split(",").map(s => s.trim());
dns.setServers(dnsServers);

const mongoDB_connection = async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/CRM`);
    } catch {
        process.exit(1);
    }
};

export { mongoDB_connection };
