const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Business = require('./models/Business');
const User = require('./models/User');
const Service = require('./models/Service');

dotenv.config();

const demoData = [
    {
        name: 'City Care Clinic',
        slug: 'city-care-clinic',
        admin: { name: 'Dr. Smith', email: 'clinic@demo.com', password: 'password123' },
        services: [
            { name: 'General Consultation', price: 50, duration: 20, category: 'Medical' },
            { name: 'Flu Shot', price: 25, duration: 10, category: 'Vaccination', isPopular: true },
            { name: 'Pediatric Checkup', price: 60, duration: 30, category: 'Medical' }
        ]
    },
    {
        name: 'Luxe Hair Salon',
        slug: 'luxe-hair-salon',
        admin: { name: 'Sarah Styles', email: 'salon@demo.com', password: 'password123' },
        services: [
            { name: 'Men\'s Haircut', price: 35, duration: 30, category: 'Hair' },
            { name: 'Women\'s Haircut & Blowdry', price: 65, duration: 60, category: 'Hair', isPopular: true },
            { name: 'Color Treatment', price: 120, duration: 120, category: 'Color' }
        ]
    },
    {
        name: 'Techfix Repairs',
        slug: 'techfix-repairs',
        admin: { name: 'Mike Tech', email: 'tech@demo.com', password: 'password123' },
        services: [
            { name: 'Screen Replacement', price: 100, duration: 60, category: 'Phone' },
            { name: 'Battery Replacement', price: 50, duration: 30, category: 'Phone', isPopular: true },
            { name: 'Diagnostics', price: 0, duration: 15, category: 'General' }
        ]
    },
    {
        name: 'Bistro 42',
        slug: 'bistro-42',
        admin: { name: 'Chef Gordon', email: 'bistro@demo.com', password: 'password123' },
        services: [
            { name: 'Table for 2', price: 0, duration: 90, category: 'Dining' },
            { name: 'Table for 4', price: 0, duration: 90, category: 'Dining', isPopular: true },
            { name: 'Patio Seating', price: 0, duration: 90, category: 'Dining' }
        ]
    },
    {
        name: 'Metro Bank',
        slug: 'metro-bank',
        admin: { name: 'Branch Manager', email: 'bank@demo.com', password: 'password123' },
        services: [
            { name: 'Teller Service', price: 0, duration: 10, category: 'General' },
            { name: 'Loan Consultation', price: 0, duration: 45, category: 'Advisory', isPopular: true },
            { name: 'New Account', price: 0, duration: 30, category: 'Sales' }
        ]
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const data of demoData) {
            // Check if business exists
            let business = await Business.findOne({ slug: data.slug });

            if (business) {
                console.log(`Business ${data.name} already exists. Updating...`);
            } else {
                console.log(`Creating ${data.name}...`);
                business = await Business.create({
                    name: data.name,
                    slug: data.slug,
                    email: data.admin.email
                });
            }

            // Check/Create Admin
            let user = await User.findOne({ email: data.admin.email });
            if (!user) {
                console.log(`Creating admin for ${data.name}... Business ID: ${business._id}`);
                try {
                    await User.create({
                        name: data.admin.name,
                        email: data.admin.email,
                        password: data.admin.password,
                        role: 'admin',
                        businessId: business._id
                    });
                } catch (userErr) {
                    console.error(`Failed to create user for ${data.name}:`, userErr.message);
                }
            }

            // Check/Create Services
            for (const s of data.services) {
                const serviceExists = await Service.findOne({ businessId: business._id, name: s.name });
                if (!serviceExists) {
                    console.log(`Adding service ${s.name}...`);
                    await Service.create({
                        ...s,
                        businessId: business._id
                    });
                }
            }
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error details:', err);
        process.exit(1);
    }
};

seedDB();
