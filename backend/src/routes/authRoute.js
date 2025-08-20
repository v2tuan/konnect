import e from 'express';
import express from 'express';

let router = express.Router();

router.post('/login', (req, res) => {
    res.send('Login Page');
});

router.post('/register', (req, res) => {
    res.send('Register Page');
});

router.post('/logout', (req, res) => {
    res.send('Logout Page');
});

export default router;