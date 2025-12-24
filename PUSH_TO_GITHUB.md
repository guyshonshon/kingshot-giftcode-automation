# Push Existing Project to GitHub

## Option 1: Using GitHub CLI (if installed)

```bash
gh repo create kingshot-giftcode-automation --public --source=. --remote=origin --push
```

This will:
- Create the repo on GitHub
- Add it as remote
- Push your code

## Option 2: Manual Steps

### Step 1: Create Repo on GitHub
1. Go to: https://github.com/new
2. Repository name: `kingshot-giftcode-automation`
3. **Don't** initialize with README, .gitignore, or license
4. Click "Create repository"

### Step 2: Push Existing Code
GitHub will show you commands. Use these:

```bash
git remote add origin https://github.com/YOUR_USERNAME/kingshot-giftcode-automation.git
git branch -M main
git push -u origin main
```

Or if you prefer master:
```bash
git remote add origin https://github.com/YOUR_USERNAME/kingshot-giftcode-automation.git
git push -u origin master
```

## That's it!

Your code will be on GitHub and ready for Render deployment.

