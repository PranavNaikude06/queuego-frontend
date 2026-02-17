const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const logUserLogin = async (userName, email) => {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
            console.warn('Google Sheets credentials missing. Skipping log.');
            return;
        }

        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        await sheet.addRow({
            Name: userName,
            Email: email,
            Timestamp: new Date().toLocaleString(),
        });
    } catch (error) {
        console.error('Google Sheets Error:', error);
    }
};

const logCustomer = async (user) => {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID_CUSTOMERS) {
            console.warn('Google Sheets tokens missing for Customers. Skipping log.');
            return;
        }

        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID_CUSTOMERS, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        await sheet.addRow({
            'User Name': user.name || 'N/A',
            'Email ID': user.email || 'N/A',
            'Contact Number': user.phoneNumber || 'N/A',
            'Timestamp': new Date().toLocaleString(),
            'Access Type': 'Login/Register',
            'Subscription Status': user.subscription?.status || 'free'
        });
    } catch (error) {
        console.error('Google Sheets Customer Log Error:', error);
    }
};

const logBusiness = async (business, user) => {
    try {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID_BUSINESSES) {
            console.warn('Google Sheets tokens missing for Businesses. Skipping log.');
            return;
        }

        const auth = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID_BUSINESSES, auth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];

        await sheet.addRow({
            'Business Name': business.name || 'N/A',
            'Address': business.address || 'N/A',
            'Person Name': user.name || 'N/A',
            'Contact Number': user.phoneNumber || 'N/A',
            'Email ID': user.email || 'N/A',
            'Timestamp': new Date().toLocaleString()
        });
    } catch (error) {
        console.error('Google Sheets Business Log Error:', error);
    }
};

module.exports = { logUserLogin, logCustomer, logBusiness };
