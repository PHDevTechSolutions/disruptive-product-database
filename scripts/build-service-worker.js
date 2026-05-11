const fs = require('fs');
const path = require('path');

// Read the template file
const templatePath = path.join(__dirname, '../public/firebase-messaging-sw-template.js');
const outputPath = path.join(__dirname, '../public/firebase-messaging-sw.js');

let template = fs.readFileSync(templatePath, 'utf8');

// Replace environment variables
const replacements = {
  '%NEXT_PUBLIC_FIREBASE_API_KEY%': process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  '%NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN%': process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  '%NEXT_PUBLIC_FIREBASE_PROJECT_ID%': process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  '%NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET%': process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  '%NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID%': process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  '%NEXT_PUBLIC_FIREBASE_APP_ID%': process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  '%NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID%': process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Replace all placeholders
for (const [placeholder, value] of Object.entries(replacements)) {
  template = template.replace(new RegExp(placeholder, 'g'), value || '');
}

// Write the final service worker
fs.writeFileSync(outputPath, template, 'utf8');

console.log('✅ Service worker built successfully with environment variables');
