const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/auth');
  
  // Click Sign Up tab
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text === 'Sign Up') {
      await btn.click();
      break;
    }
  }
  
  await page.waitForTimeout(500);
  
  // Fill email and password
  await page.type('input[type="email"]', 'puppeteer@test.com');
  const pwdInputs = await page.$$('input[type="password"]');
  await pwdInputs[0].type('mypassword123');
  await pwdInputs[1].type('mypassword123');
  
  // Submit form
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(2000);
  
  // See where we are
  const url = page.url();
  console.log("Current URL after submit:", url);
  
  // check for error messages
  const body = await page.evaluate(() => document.body.innerHTML);
  if (body.includes('rgba(255, 74, 74, 0.05)')) {
    console.log("ERROR BOX FOUND on page!");
  }
  
  await browser.close();
})();
