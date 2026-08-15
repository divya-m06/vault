import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to register...');
  await page.goto('http://localhost:5173/register');
  await page.fill('input[type="email"]', 'riya_test@gmail.com');
  await page.fill('input[placeholder="Enter your password"]', 'riya12345');
  await page.fill('input[placeholder="Confirm your password"]', 'riya12345');
  await page.click('button:has-text("Create account")');
  
  await page.waitForTimeout(2000); // wait for redirect
  
  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'riya_test@gmail.com');
  await page.fill('input[type="password"]', 'riya12345');
  await page.click('button:has-text("Sign in")');
  
  await page.waitForTimeout(1000);
  
  try {
    // The error banner might not have the .bg-error-container class, let's look for text
    const errorBanner = await page.locator('text="db is not defined"').innerText({ timeout: 2000 });
    console.log('--- UI ERROR DETECTED ---');
    console.log(errorBanner);
  } catch (e) {
    try {
        const anyError = await page.locator('.text-error, .bg-error-container').innerText({ timeout: 2000 });
        console.log('--- OTHER UI ERROR DETECTED ---');
        console.log(anyError);
    } catch(e2) {
        console.log('No error banner found.');
    }
  }
  
  await browser.close();
})();
