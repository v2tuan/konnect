import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import authRoute from './routes/authRoute.js';
import connectDB from './lib/connectDB.js';
import { env } from './config/environment.js';
import { APIs_V1 } from './routes/index.js';
import seedUsers from './seeds/seedUsers.js'; // Import the seed function
import cookieParser from 'cookie-parser';

const app = express();
const PORT =env.LOCAL_DEV_APP_PORT || 3000;

// Dùng để parse request body dạng JSON sang javaScript object
app.use(bodyParser.json());
// Dùng để parse request body dạng x-www-form-urlencoded sang javaScript object
// Extended true cho phép sử dụng các kiểu dữ liệu phức tạp hơn như object lồng nhau, mảng, v.v.
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(
    {
        origin: env.WEBSITE_DOMAIN_DEVELOPMENT,
        credentials: true
    }
));

app.use(cookieParser()); // Middleware to parse cookies

app.use('/api', APIs_V1);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://${env.LOCAL_DEV_APP_HOST}:${PORT}`);
    connectDB();
    // seedUsers(); // Call the seed function to populate the database
});