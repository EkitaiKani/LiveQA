# Slido from Temu

Hi hi hiiii this is my website thingy that shows questions from that Google thing with forms! It's like magic but also not really? You send stuff and then BOOM 💥 it shows up on the screen!! Great for like school stuff or when you're doing a big talk and people are like “what is happening” and you’re like “idk ask it in the form pls.”

## ✨ What This Does (I Think)

- 🐸 **Questions just show up!!** From the Google Form!! No touching needed.
- 🌀 **They fly in kinda nicely** when someone types a new one.
- ✅ **You can check them off like "I ANSWERED U STOP ASKING"**
- 🔧 **Change stuff if you want idk**
- 🔢 **Sort the questions** if you care about time or if people clicked the up-arrow thing a lot (but not sure how that works lol)
- 🌟 **questions get like a badge or something** so they look important I guess??
- 🖱️ **CLICKY QUESTION = BIG POPUP WOW** like BOOM the question EXPLODES (not really) and takes over your screen so you can read it like a nerd.
- 🕳️ **you wanna close it?** just click somewhere. ANYWHERE. Like bye bye question, go back to the shadow realm
- 🔥 **MOD SMASH = QUESTION OBLITERATED** some crusty troll drops a stinky question? GONE. YEETED. MODS HIT THE BIG RED NUKE BUTTON 💣💥 and it’s like bye forever loser. No trial. No jury. Just ✨instant vaporization✨.

## 🧠 How 2 Start

### Stuff You Gotta Have First

- A Google Form (duh)
- The sheet that gets the answers from that form
- A Google API key (which is like a password but for robots??)

### Okay now follow these steps or don't idk

1. Make a Google Form
   - Ask something like “What’s your question?” and “What’s your name?” or “Name pls” or whatever
   - Make a column named "display?" (For moderation purposes). Order your questions by priority through this column

2. Get a Google Sheets robot key thingy:
   - Go here 👉 [Google Cloud Console](https://console.cloud.google.com/)
   - Click a lot until you find “Enable Sheets API”
   - Make a key and copy it like it’s very secret spy stuff
   - Paste it inside the `script.js` file where it says `YOUR_API_KEY_HERE` (don’t yell)

3. Get your Sheet ID thing:
   - Open your sheet
   - Copy the loooong bit in the URL like this:
     ```
     https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
     ```

4. Run the thing:
   - Put all the files on the internet or like, just open with something called "http-server" (I used one from a YouTube tutorial lol)

## 🕹 How to Use the Thing

1. Open the site
2. Paste your super cool Sheet ID in the box
3. If your sheet tab isn’t called “Form Responses 1” then say what it *is* called
4. Pick how fast you want new stuff to appear (but like don’t go faster than 5 seconds or it dies)
5. Tell it what your form columns are called (Default is “Your question” and “Your name” but you do you)
6. Click “CONNECT TO THE THING”
7. BAM it works probably

## 🤯 Settings Table Because Fancy

| What it is | What it do | What it normally is |
|------------|------------|---------------------|
| Google Sheet ID | Your magic paper's secret code | Required!! |
| Refresh Rate | How fast it peeks for new questions | 5 |
| Question Column Name | What your form calls the question | "Your question" |

## 🕸 It Works On Stuff Like:

- Chrome (duh)
- Firefox (the fox one)
- Safari (not the jungle one)
- Edge (that one your school uses)

## 🚫 Stuff That Might Break

- You need JavaScript or it just sits there doing nothing
- Your Sheet needs to be publicish or your key needs robot access
- Google says "too many requests" if you spam it 😭

## ❓ HELP IT’S BROKEN

**Questions not showing?**
- Is your Sheet ID wrong? Try again slowly
- Are your column names typed weirdly? They’re picky!
- Is your API key expired or fake? Refresh it!
- Look at the DevTools console thingy (Ctrl + Shift + I) and pretend you know what it means

**No animations??**
- Maybe your browser is from the dinosaur times
- Or you made the refresh thing too small and it’s panicking

## 📜 Legal Boring Stuff

MIT License = basically you can do anything but don’t sue me

## ❤️ Thanks and Random Shoutouts

- Google for making the Sheets thing
- Me for not giving up halfway
- Whoever made Slido but this is totally different ok
