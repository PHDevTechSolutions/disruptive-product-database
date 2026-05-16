const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, '../.env.local'));
loadEnvFile(path.join(__dirname, '../.env'));

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
