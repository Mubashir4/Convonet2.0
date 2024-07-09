# Convonet2.0

=======

# mediscribe

#Building Frontend:

- npm install --legacy-peer-dps
- npm run build

# Run Nodejs

- node server

#Mongo DB Installation:

### Step 1: Fixing the GPG Key Issue

1. **Import the Correct GPG Key**:

```sh
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg
```

2. **Create the MongoDB Source List File**:

```sh
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

3. **Update Package List**:

```sh
sudo apt-get update
```

### Step 2: Addressing the `libssl1.1` Dependency Issue

The error indicates that `libssl1.1` is not available in your distribution. This might be because Ubuntu 22.04 and later versions use `libssl3` instead. Here's how to handle this:

1. **Download and Install `libssl1.1`**:

   Download the `libssl1.1` package from the Ubuntu archives and install it manually.

```sh
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb
```

### Step 3: Installing MongoDB

1. **Install MongoDB Packages**:

```sh
sudo apt-get install -y mongodb-org
```

### Step 4: Starting MongoDB

1. **Start and Enable MongoDB Service**:

```sh
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Verify MongoDB Installation

To check the status of the MongoDB service and verify the installation:

1. **Check MongoDB Service Status**:

```sh
sudo systemctl status mongod
```

2. **Check MongoDB Version**:

```sh
mongod --version
```

### Troubleshooting

# Setup Github

### Step 1: Generate an SSH Key

1. **Generate a New SSH Key**:

   - Open your terminal and run the following command. Replace `your_email@example.com` with your GitHub email address.
     ```sh
     ssh-keygen -t ed25519 -C "your_email@example.com"
     ```
   - When prompted to "Enter a file in which to save the key," press Enter to accept the default location.
   - You can choose to protect the key with a passphrase or leave it empty.

2. **Start the SSH Agent**:

   ```sh
   eval "$(ssh-agent -s)"
   ```

3. **Add Your SSH Key to the SSH Agent**:
   ```sh
   ssh-add ~/.ssh/id_ed25519
   ```

### Step 2: Add Your SSH Key to Your GitHub Account

1. **Copy the SSH Key to Your Clipboard**:

   - Use the following command to copy the SSH key. You can also manually open the `id_ed25519.pub` file and copy its contents.
     ```sh
     cat ~/.ssh/id_ed25519.pub
     ```

2. **Add the SSH Key to GitHub**:
   - Log in to your GitHub account.
   - Go to **Settings** > **SSH and GPG keys**.
   - Click on **New SSH key**.
   - Give your SSH key a descriptive title.
   - Paste the SSH key you copied earlier into the "Key" field.
   - Click **Add SSH key**.

### Step 3: Clone Your Repository Using SSH

1. **Clone Your Repository**:

   ```sh
   git clone git@github.com:Mubashir4/Convonet2.0.git

   ```

This should successfully clone your repository using SSH.

### Troubleshooting SSH Issues

- **Verify Your SSH Configuration**:
  ```sh
  ssh -T git@github.com
  ```
  This command should output a success message if your SSH key is correctly set up and recognized by GitHub.

If you encounter any issues during these steps, please let me know, and I can help troubleshoot further!

# HTTPS setup

If you don't have a domain, you can still set up HTTPS using a self-signed certificate for development purposes, or you can use the public IP address of your EC2 instance. However, using a public IP address with Let's Encrypt is not possible since Let's Encrypt requires a valid domain name to issue certificates.

Here's how to set up HTTPS using a self-signed certificate on your EC2 instance:

### Step 1: Generate a Self-Signed Certificate

1. **Generate the certificate and key files**:

   ```sh
   sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout selfsigned.key -out selfsigned.crt
   ```

   Follow the prompts to enter details for the certificate. For `Common Name (CN)`, you can use the public IP address of your EC2 instance.

To achieve this, you'll need to set up Nginx as a reverse proxy to handle HTTPS requests and forward them to your Node.js server running on HTTP. PM2 will be used to manage your Node.js application. Here's how you can set this up:

### Step 1: Install Nginx

1. **Install Nginx**:
   ```sh
   sudo apt update
   sudo apt install nginx
   ```

### Step 2: Configure Nginx

1. **Open the Nginx configuration file**:

   ```sh
   sudo nano /etc/nginx/sites-available/default
   ```

2. **Update the configuration file to look like this** (replace `yourdomain.com` with your public IP `54.189.189.201`):

```
server {
    listen 80;
    server_name 54.189.189.201;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 54.189.189.201;

    ssl_certificate /home/ubuntu/mediscribe/selfsigned.crt;
    ssl_certificate_key /home/ubuntu/mediscribe/selfsigned.key;

    # Proxy pass API requests to the Node.js server
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files or other routes
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}


```

### Step 2: Generate Diffie-Hellman Parameters

To enhance security, generate Diffie-Hellman parameters:

```bash
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
```

### Step 3: Install Let's Encrypt SSL Certificate (Recommended)

Instead of a self-signed certificate, it's recommended to use Let's Encrypt for a free SSL certificate. Install Certbot and the Nginx plugin:

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

Obtain and install the certificate:

```bash
sudo certbot --nginx -d convonote.com -d www.convonote.com
```

Certbot will automatically configure your Nginx configuration to use the Let's Encrypt certificate and key.

### Step 4: Test the Configuration

Check your Nginx configuration for syntax errors:

```bash
sudo nginx -t
```

3. **Save and close the file** (press `CTRL + X`, then `Y`, then `ENTER`).

4. **Test the Nginx configuration**:

```sh
sudo nginx -t
```

```
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d convonote.com -d www.convonote.com


```

5. **Reload Nginx**:
   ```sh
   sudo systemctl reload nginx
   ```

### Step 3: Install and Configure PM2

1. **Install PM2**:

   ```sh
   sudo npm install pm2@latest -g
   ```

2. **Start your Node.js application using PM2**:

   ```sh
   pm2 start server.js --name "mediscribe"
   ```

3. **Set PM2 to start on boot**:
   ```sh
   pm2 startup systemd
   pm2 save
   ```

### Step 4: Update Your React Frontend

1. **Update your API calls** to use HTTPS and the new server address. Locate all instances of `http://54.189.189.201:5000` and replace them with `https://54.189.189.201`.

### Example of Changing API Calls in Your React Code

```javascript
// Before
const res = await axios.post("http://54.189.189.201:5000/api/login", {
  email,
  password,
});

// After
const res = await axios.post("https://54.189.189.201/api/login", {
  email,
  password,
});
```

### Step 5: Update Environment Variables

Make sure your `.env` file in your React project reflects the correct API endpoints. For example:

```env
REACT_APP_SERVER_IP=54.189.189.201
REACT_APP_SERVER_PORT=443
```

### Step 6: Restart Your Services

1. **Restart PM2**:

   ```sh
   pm2 restart mediscribe
   ```

2. **Reload Nginx**:
   ```sh
   sudo systemctl reload nginx
   ```

With these steps, you should have:

- Nginx configured to handle HTTPS requests and redirect HTTP to HTTPS.
- Your Node.js backend managed by PM2.
- Your React frontend making HTTPS requests to your backend.

Now, when users visit `https://54.189.189.201`, they should be able to access your React frontend over HTTPS, and the frontend should make secure API calls to the backend.

# For help

[nodejs-ssl-server](https://github.com/saasscaleup/nodejs-ssl-server)
