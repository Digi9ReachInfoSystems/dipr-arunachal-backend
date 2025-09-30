import express  from 'express';
import cors  from 'cors';
const app = express();
import  dotenv  from 'dotenv';
dotenv.config();
import bodyParser from 'body-parser';
import axios from 'axios';
app.use(cors());




app.use(bodyParser.json({ limit: '2048mb' }));
app.use(express.urlencoded({ limit: '2048mb', extended: true }));

app.use(express.json());


app.use((req, res, next) => {
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0] || // first IP in the chain
    req.headers["x-real-ip"] ||                      // fallback
    req.socket.remoteAddress;                        // fallback

//   console.log("Client IP:", clientIp);
  req.clientIp = clientIp; // you can save it in your ActionLog
  next();
});

import actionLogRoute from "./src/routes/actionLogRoute.js"
import newsPaperJobAllocationRoute from "./src/routes/newsPaperJobAllocationRoutes.js"






app.use("/actionLogs", actionLogRoute);
app.use("/newsPaperJobAllocation", newsPaperJobAllocationRoute);




 




app.get("/", (req, res) => {
  req.headers['']
    res.send("Server is running healthy in development mode");
});


// Start the Server
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
 
