const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const resetPasswords = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const demoEmails = [
            'clinic@demo.com',
            'salon@demo.com',
            'tech@demo.com',
            'bistro@demo.com',
            'bank@demo.com'
        ];

        for (const email of demoEmails) {
            const user = await User.findOne({ email });
            if (user) {
                console.log(`Resetting password for ${email}...`);
                user.password = 'password123';
                await user.save(); // This triggers the pre-save hash hook
                console.log(`Password reset successful for ${email}`);
            } else {
                console.warn(`User not found: ${email}`);
            }
        }

        console.log('All passwords processed.');
        process.exit(0);
    } catch (err) {
        console.error('Error resetting passwords:', err);
        process.exit(1);
    }
};

resetPasswords();
