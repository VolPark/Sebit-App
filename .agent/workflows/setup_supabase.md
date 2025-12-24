---
description: How to setup Supabase CLI and dump database schema
---
# Setup Supabase CLI

1.  **Install Supabase CLI** (via npm)
    Run this command in your terminal:
    ```powershell
    npm install -g supabase
    ```

2.  **Login to Supabase**
    Run:
    ```powershell
    supabase login
    ```
    -   This will open your browser.
    -   Generate a new Access Token on the Supabase page.
    -   Paste the token back into the terminal.

3.  **Link your Project**
    You need your **Project Ref** (ID).
    -   Go to your Supabase Dashboard.
    -   The ID is the part of the URL: `https://app.supabase.com/project/<PROJECT_ID>`.
    -   Or go to Project Settings -> General -> Reference ID.
    
    Run:
    ```powershell
    supabase link --project-ref <YOUR_PROJECT_ID>
    ```
    -   You will be asked for your database password.

4.  **Dump Schema**
    Once linked, you can download the full schema:
    ```powershell
    supabase db dump > db/schema.sql
    ```
