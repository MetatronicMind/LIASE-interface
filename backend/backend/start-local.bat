@echo off
echo 🚀 LIASE Backend Local Setup
echo.

echo 📦 Installing dependencies...
call npm install

echo.
echo 🔍 Checking if Cosmos DB Emulator is running...
curl -k -s https://localhost:8081/_explorer/index.html > nul
if %errorlevel% neq 0 (
    echo ❌ Cosmos DB Emulator is not running
    echo 💡 Please start the Azure Cosmos DB Emulator first
    echo    Download: https://docs.microsoft.com/en-us/azure/cosmos-db/local-emulator
    pause
    exit /b 1
)

echo ✅ Cosmos DB Emulator is running

echo.
echo 🗄️ Setting up local database...
call npm run setup-local-db

echo.
echo 🌱 Seeding test data...
timeout /t 2 > nul
call npm run seed-data

echo.
echo 🎉 Setup complete! Starting development server...
echo.
echo 📋 Test Accounts:
echo    Admin: admin / TestAdmin123!
echo    PV User: pharmacovigilance1 / TestPV123!
echo    Auditor: auditor1 / TestAuditor123!
echo.
echo 🌐 Access URLs:
echo    Backend: http://localhost:3001/api
echo    Health: http://localhost:3001/api/health
echo.

call npm run dev
