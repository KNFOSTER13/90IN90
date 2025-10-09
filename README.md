90 in 90: Kimberly's Creative SprintThis project is a web application to track and display entries for a 90-day creative challenge. It features a public-facing page to view entries and a secure admin panel for content management.The application is built with vanilla HTML, CSS, and JavaScript, and it uses Firebase for its backend services, including Authentication, Firestore, and Cloud Functions.Project Structure/: Contains the main HTML files (index.html, admin.html)./js/: Houses the modular client-side JavaScript./css/: Contains the site's stylesheets./functions/: Contains the backend Node.js code for Firebase Cloud Functions.firestore.rules: Defines the security rules for the Firestore database.Hosting & ArchitectureThis project uses a hybrid hosting model:Frontend: The static website (index.html, CSS, JS) is hosted on GitHub Pages.Backend: The database (Firestore) and server-side logic (Cloud Functions) are hosted on Firebase.How to Set Up and DeployFollow these steps to get the project running and deployed.1. Initial Firebase SetupBefore you begin, ensure you have a Firebase project created and the Firebase CLI installed (npm install -g firebase-tools).Initialize Firebase: In your project root, run firebase init. Select Firestore and Functions. This will create the firestore.rules file and the functions directory.Copy Code:Place the provided Cloud Functions code into functions/index.js.Place the provided security rules into firestore.rules.Install Function Dependencies: Navigate into the functions directory and install the necessary packages:cd functions
npm install firebase-admin firebase-functions
cd ..
Deploy Backend: Deploy your functions and rules to Firebase.firebase deploy --only functions,firestore
Set Your First Admin: Run the set-admin.js script (as previously discussed) to grant your account admin privileges.2. GitHub Repository SetupCreate a Repository: Create a new, public repository on your GitHub account.Push Your Code: Initialize a Git repository in your project folder and push it to GitHub.git init
git add .
git commit -m "Initial project setup"
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
Your .gitignore file will prevent your node_modules and sensitive keys from being uploaded.3. Securing API Keys for GitHub PagesYour Firebase API keys in js/firebase-config.js are needed for the site to work, but they should not be visible in your public code. We use GitHub Secrets and a GitHub Action to solve this.Add Secrets to GitHub:In your GitHub repository, go to Settings > Secrets and variables > Actions.Click New repository secret for each of the following keys from your Firebase project settings, adding the corresponding value:FIREBASE_API_KEYFIREBASE_AUTH_DOMAINFIREBASE_STORAGE_BUCKETFIREBASE_MESSAGING_SENDER_IDFIREBASE_APP_IDCreate a GitHub Action for Deployment:Create a folder path in your project: .github/workflows/.Inside that folder, create a new file named deploy.yml.Add the following code to deploy.yml. This action will automatically run every time you push code to your main branch.name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout 🛎️
        uses: actions/checkout@v3

      - name: Replace Firebase Config Tokens 🔑
        run: |
          sed -i 's/%FIREBASE_API_KEY%/${{ secrets.FIREBASE_API_KEY }}/g' js/firebase-config.js
          sed -i 's/%FIREBASE_AUTH_DOMAIN%/${{ secrets.FIREBASE_AUTH_DOMAIN }}/g' js/firebase-config.js
          sed -i 's/%FIREBASE_STORAGE_BUCKET%/${{ secrets.FIREBASE_STORAGE_BUCKET }}/g' js/firebase-config.js
          sed -i 's/%FIREBASE_MESSAGING_SENDER_ID%/${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}/g' js/firebase-config.js
          sed -i 's/%FIREBASE_APP_ID%/${{ secrets.FIREBASE_APP_ID }}/g' js/firebase-config.js

      - name: Deploy 🚀
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          branch: gh-pages # The branch the action should deploy to.
          folder: . # The folder the action should deploy.
4. Enable GitHub PagesPush the Action: Commit and push the deploy.yml file to your repository. This will trigger the action for the first time.Set the Source Branch:In your GitHub repository, go to Settings > Pages.Under "Build and deployment," change the Source to Deploy from a branch.Set the Branch to gh-pages and the folder to /(root). Click Save.After a few minutes, your site will be live at the URL shown on the GitHub Pages settings page. The live site will have the correct API keys, while your source code on the main branch remains secure with only placeholders.
