# 🗄️ Oracle Database Setup Guide

## ⚠️ Important Note

**Oracle Live SQL** is a web-based SQL playground and **cannot be directly connected** from Node.js applications. You need **Oracle Database** instead.

## Option 1: Oracle Database Express Edition (XE) - FREE

### Download & Install Oracle XE
1. **Download**: https://www.oracle.com/database/technologies/xe-downloads.html
   - Choose your OS (Windows/Linux/Mac)
   - Free for development/testing

2. **Install**:
   - Run installer
   - Set SYS password (remember this!)
   - Default port: 1521

3. **Verify Installation**:
   ```bash
   sqlplus sys/password@localhost:1521/XE as sysdba
   ```

### Create User & Schema
```sql
-- Connect as SYS
sqlplus sys/your_password@localhost:1521/XE as sysdba

-- Create user
CREATE USER clinic_user IDENTIFIED BY clinic_password;
GRANT CONNECT, RESOURCE, DBA TO clinic_user;
GRANT UNLIMITED TABLESPACE TO clinic_user;

-- Exit
EXIT;
```

## Option 2: Oracle Cloud - FREE Tier

1. **Sign up**: https://www.oracle.com/cloud/free/
2. **Create Database**:
   - Go to "Autonomous Database"
   - Create "Always Free" database
   - Download wallet (credentials)
3. **Get Connection String** from wallet files

## Configuration

Update your `.env` file or `config.js`:

```env
ORACLE_USER=clinic_user
ORACLE_PASSWORD=clinic_password
ORACLE_CONNECTION_STRING=localhost:1521/XE
```

Or for Oracle Cloud:
```env
ORACLE_USER=admin
ORACLE_PASSWORD=your_password
ORACLE_CONNECTION_STRING=your_adb_name_high.oraclecloud.com:1522/your_service_name
```

## Connection String Formats

### Local Oracle XE:
```
localhost:1521/XEPDB1
```

### Oracle Cloud (from wallet):
```
your_host:1522/your_service_name
```

### TNS Connection String:
```
(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=localhost)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=XEPDB1)))
```

## Testing Connection

```bash
cd clinic-queue/backend
node -e "const db = require('./database/oracle'); db.initialize().then(() => console.log('✅ Connected!')).catch(err => console.error('❌', err));"
```

## Troubleshooting

### Error: "ORA-12154: TNS:could not resolve the connect identifier"
- Check connection string format
- Verify Oracle service is running
- Check firewall settings

### Error: "ORA-01017: invalid username/password"
- Verify username and password
- Check if user has proper permissions

### Error: "Cannot find module 'oracledb'"
```bash
cd clinic-queue/backend
npm install oracledb
```

### Windows: "NJS-045: Oracle Client library not loaded"
1. Download Oracle Instant Client: https://www.oracle.com/database/technologies/instant-client/downloads.html
2. Extract to a folder (e.g., `C:\oracle\instantclient_21_3`)
3. Add to PATH environment variable
4. Restart terminal/server

---

**Note**: The table will be created automatically when you start the server!
