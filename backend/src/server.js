import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import authRoute from './routes/authRoute.js';
import connectDB from './lib/connectDB.js';
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Dùng để parse request body dạng JSON sang javaScript object
app.use(bodyParser.json());
// Dùng để parse request body dạng x-www-form-urlencoded sang javaScript object
// Extended true cho phép sử dụng các kiểu dữ liệu phức tạp hơn như object lồng nhau, mảng, v.v.
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(
    {
        origin: 'http://localhost:5173',
        credentials: true
    }
));

app.use('/api/auth', authRoute);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    connectDB();
});