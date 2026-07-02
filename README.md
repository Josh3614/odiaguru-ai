# OdiaGuru AI — Play Store tak pahunchane ka step-by-step guide

## STEP 1 — Anthropic API key lo
1. https://console.anthropic.com pe account banao
2. Left menu me "API Keys" → "Create Key"
3. Key copy karke safe rakho (kisi ko mat dena, ye paisa kharch karti hai)

## STEP 2 — Code ko GitHub pe daalo
1. https://github.com pe free account banao (agar nahi hai)
2. Naya repository banao, naam do `odiaguru-ai`
3. Is poore folder (`odiaguru-app`) ko us repo me upload/push karo
   - Agar terminal se comfortable ho:
     ```
     cd odiaguru-app
     git init
     git add .
     git commit -m "first version"
     git branch -M main
     git remote add origin https://github.com/<tumhara-username>/odiaguru-ai.git
     git push -u origin main
     ```
   - Nahi to GitHub website pe "uploading an existing file" wala option use kar sakte ho

## STEP 3 — Vercel pe deploy karo (free)
1. https://vercel.com pe jao, GitHub se login karo
2. "Add New Project" → apna `odiaguru-ai` repo select karo
3. "Environment Variables" me ek entry add karo:
   - Name: `ANTHROPIC_API_KEY`
   - Value: (Step 1 wali key)
4. "Deploy" dabao — 1-2 minute me live URL milega, jaise `odiaguru-ai.vercel.app`
5. Us URL ko phone ke Chrome me khol ke check karo sab kaam kar raha hai

## STEP 4 — Apna domain (optional par professional lagta hai)
1. Namecheap/GoDaddy se sasta `.com` ya `.in` domain lo (~₹700-1000/saal)
2. Vercel project → Settings → Domains → apna domain add karo
3. Domain provider ke DNS settings me Vercel ke diye records daalo

## STEP 5 — Android app (AAB file) banao
1. https://www.pwabuilder.com pe jao
2. Apna live URL daalo (Step 3 ya 4 wala)
3. "Start" dabao — ye tumhari site ko scan karega (manifest.json, service worker already daal diya hai maine)
4. "Android" package select karo → package name do jaise `com.dibu.odiaguru`
5. "Generate" dabao — ye `.aab` file download hogi (Play Store isi format ko accept karta hai)

## STEP 6 — Play Console account banao
1. https://play.google.com/console pe jao
2. Google account se login karo, one-time $25 (~₹2100) developer fee pay karo
3. Identity verification karna padega (ID proof)

## STEP 7 — App submit karo
1. Play Console me "Create app" → naam "OdiaGuru AI" do
2. Step 5 wali `.aab` file upload karo
3. Ye sab fill karna padega:
   - Screenshots (phone se app khol ke screenshots le lo)
   - App icon (512x512 PNG)
   - Short & full description
   - Privacy Policy URL (zaroori hai — simple sa page bana ke apni site pe daal do)
   - Content rating questionnaire
   - Data safety form (batana hoga ki AI ko user input bhejte ho)
4. "Submit for review" — Google ko usually 1-7 din lagte hain approve karne me

---

## Kharcha (approx)
| Cheez | Cost |
|---|---|
| Anthropic API usage | pay-as-you-go, shuru me ₹few sau kaafi |
| Vercel hosting | Free |
| Domain (optional) | ~₹700-1000/saal |
| Play Console fee | $25 one-time (~₹2100) |

## Zaroori note
- `ANTHROPIC_API_KEY` kabhi bhi frontend code me mat likhna — hamesha Vercel environment variable me hi rakhna, warna koi bhi tumhari key chura ke bill badha sakta hai.
- App ka data storage ab `localStorage` use karta hai (phone/browser me hi save hota hai), Claude.ai wala `window.storage` yahan available nahi hai.
