@echo off
setlocal enabledelayedexpansion

cd /d "c:\persal\persal-fresh"
set PATH=C:\Program Files\PostgreSQL\18\bin;C:\Program Files\nodejs;%PATH%

REM Reload PostgreSQL config
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" reload -D "C:\Program Files\PostgreSQL\18\data"
timeout /t 2

REM Create setup SQL script
(
  echo CREATE USER persal_user WITH PASSWORD '990302';
  echo CREATE DATABASE persal_fresh OWNER persal_user;
  echo GRANT ALL PRIVILEGES ON DATABASE persal_fresh TO persal_user;
  echo ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO persal_user;
  echo ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO persal_user;
) > setup.sql

REM Execute setup
psql -U postgres -h localhost -f setup.sql
if %errorlevel% EQU 0 (
  echo Database setup completed successfully
) else (
  echo Database setup failed with error code %errorlevel%
)

REM Run npm ci if not already done
if not exist "node_modules" (
  call "C:\Program Files\nodejs\npm.cmd" ci
)

REM Generate Prisma client
call "C:\Program Files\nodejs\npm.cmd" run prisma -- generate

REM Run migrations
call "C:\Program Files\nodejs\npm.cmd" run prisma -- migrate deploy

REM Start dev server
call "C:\Program Files\nodejs\npm.cmd" run dev
