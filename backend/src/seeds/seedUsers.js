import connectDB from '../lib/connectDB.js';
import User from '../models/userModel.js';

// Kết nối đến MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
// .then(() => console.log('MongoDB connected for seeding'))
// .catch((err) => console.error('MongoDB connection error:', err));

// Dữ liệu mẫu
const users = [
    {
        phone: '+841234567890',
        email: 'user1@example.com',
        password: 'password123',
        avatarUrl: 'https://example.com/avatar1.png',
        fullName: 'Nguyen Van A',
        dateOfBirth: new Date('1995-01-01'),
        bio: 'Xin chào, tôi là A!'
    },
    {
        phone: '+849876543210',
        email: 'user2@example.com',
        password: 'password456',
        avatarUrl: 'https://example.com/avatar2.png',
        fullName: 'Tran Thi B',
        dateOfBirth: new Date('1998-05-10'),
        bio: 'Xin chào, tôi là B!'
    },
    {
        phone: '+84911223344',
        email: 'user3@example.com',
        password: 'password789',
        fullName: 'Le Van C',
        dateOfBirth: new Date('2000-12-12'),
        bio: 'Xin chào, tôi là C!'
    }
];

// Hàm tạo dữ liệu
const seedUsers = async () => {

    try {
        await connectDB();

        // Xóa tất cả dữ liệu cũ (nếu muốn)
        // await User.deleteMany({});
        // console.log('Existing users removed');


        // Thêm dữ liệu mới
        await User.insertMany(users);
        console.log('Users seeded successfully');

        process.exit(); // thoát process khi hoàn thành
    } catch (err) {
        console.error('Error seeding users:', err);
        process.exit(1);
    }
};

export default seedUsers;
