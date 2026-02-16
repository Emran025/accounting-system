# 💖 Contributing to Shafeea 💖

Hey there, awesome developer! 👋

First off, a huge **thank you** for considering contributing to our project. It's passionate people like you that make our community and this project thrive. Every single contribution is deeply appreciated. 🙏

This guide is here to make your journey as smooth as possible. Following these steps helps us all work together effectively and respectfully.

> **Please Note:** This project is governed by our **[Code of Conduct](CODE_OF_CONDUCT.md)**. By participating, you agree to uphold its principles. Let's build a kind and collaborative space! 🌈

---

<details>
  <summary>🗺️ **Quick Navigation (Table of Contents)**</summary>
  
  * [Ways to Contribute](#-ways-to-contribute)
  * [How You Can Contribute](#-how-you-can-contribute)
  * [Your First Code Contribution](#-your-first-code-contribution)
  * [The Development Workflow](#-the-development-workflow)
  * [Development Corner](#-development-corner)
    * [Architectural Philosophy](#-architectural-philosophy)
    * [Coding Standards](#-coding-standards)
    * [Our Testing Culture](#-our-testing-culture)
  * [Getting Help](#-getting-help)
</details>

---

## 🌟 Ways to Contribute

There are many amazing ways to get involved:

- 🐛 **Report Bugs:** Find something broken? Open a [Bug Report](https://github.com/Emran025/shafeea/issues/new/choose) and help us squash it!
- ✨ **Suggest Features:** Have a brilliant idea? We're all ears! Share it as a [Feature Request](https://github.com/Emran025/shafeea/issues/new/choose).
- 💻 **Write Code:** Ready to dive in? This is the guide for you. Fix a bug or build something new.
- 📚 **Improve Documentation:** See a typo or a confusing section? Help us make our docs better for everyone.
- 🌐 **Translate:** Help us bring Shafeea to more communities around the world.
- 🧪 **Test & Review:** Try out new features, review pull requests, and help us catch issues early.
- 🎨 **Design:** Suggest UI/UX improvements or contribute graphics and assets.

## 🤔 How You Can Contribute

Pick any of the above or suggest your own way to help! Every bit counts.

## 🚀 Your First Code Contribution

Ready to get your hands on the code? Let's get your local environment set up in just a few steps.

#### **1. Prerequisites 🛠️**

Make sure you have these tools installed on your system:

- PHP 8.2+
- Composer
- Node.js & npm
- A local database server (MySQL is recommended)

#### **2. Fork & Clone 🍴**

- **Fork** this repository to your personal GitHub account.
- **Clone** your fork to your local machine:
    ```bash
    git clone https://github.com/YOUR_USERNAME/shafeea.git
    cd shafeea
    ```

#### **3. Local Setup ⚙️**

Run these commands one by one in your project's root directory.

1.  **Install PHP Dependencies:**

    ```bash
    composer install
    ```

    <details>
      <summary>ℹ️ What does this do?</summary>
      This command reads the `composer.json` file and installs all the necessary PHP packages, including the Laravel framework itself.
    </details>

2.  **Install JavaScript Dependencies:**

    ```bash
    npm install
    ```

    <details>
      <summary>ℹ️ What does this do?</summary>
      This installs all the front-end packages needed for compiling assets, like Tailwind CSS and Vue/React.
    </details>

3.  **Create Your Environment File:**

    ```bash
    cp .env.example .env
    ```

    <details>
      <summary>ℹ️ What does this do?</summary>
      This creates your personal configuration file. You'll store your database credentials and other secrets here. This file is ignored by Git for security.
    </details>

4.  **Generate Application Key:**

    ```bash
    php artisan key:generate
    ```

    <details>
      <summary>ℹ️ What does this do?</summary>
      This command generates a unique, 32-character string that Laravel uses to keep user sessions and other encrypted data secure.
    </details>

5.  **Configure Database:**
    - Open your `.env` file and update the `DB_*` variables with your local database credentials.

6.  **Run Migrations & Seeding:**

    ```bash
    php artisan migrate --seed
    ```

    <details>
      <summary>ℹ️ What does this do?</summary>
      `migrate` creates all the necessary tables in your database. `--seed` populates those tables with essential starting data (like user roles).
    </details>

7.  **Build Front-End Assets:**
    ```bash
    npm run dev
    ```
    <details>
      <summary>ℹ️ What does this do?</summary>
      This compiles all the JavaScript and CSS files and starts a server that automatically rebuilds them when you make a change.
    </details>

🎉 **You're all set!** You can now run `php artisan serve` and access your local version of the application.

---

## ✨ The Development Workflow

Follow this simple workflow to ensure your contributions are smooth and easy to review.

#### **Step 1: Create a New Branch 🌿**

Always work on a new branch, never directly on `main`. Name it descriptively.

```bash
# For a new feature:
git checkout -b feat/user-profile-avatars

# For a bug fix:
git checkout -b fix/incorrect-attendance-calculation
```

#### **Step 2: Code & Test! 💻**

Make your changes, write your code, and most importantly, **add or update tests** that cover your changes. Run the test suite often to make sure you haven't broken anything.

```bash
php artisan test
```

#### **Step 3: Commit Your Changes 💾**

Write clear, concise commit messages. This helps everyone understand the history of the project.

```bash
git commit -m "feat: Add avatar upload functionality to user profiles"
```

#### **Step 4: Push to Your Fork 📤**

Push your new branch and its commits to your forked repository on GitHub.

```bash
git push origin feat/user-profile-avatars
```

#### **Step 5: Open a Pull Request 📬**

- Go to your fork on GitHub. You'll see a prompt to create a Pull Request from your new branch.
- Fill out the PR template with as much detail as possible. Explain the "why" behind your changes.
- Submit the PR! Our team will review it as soon as possible.

---

## 🛠️ Development Corner

A few notes on our philosophy and standards.

### **🏛️ Architectural Philosophy**

- **Keep it Clean:** We strive to keep our Controllers thin and our Models focused on relationships.
- **Services for Logic:** Complex business logic lives in `app/Services`. This makes our code reusable and easy to test.
- **Observers for Side-Effects:** To handle actions that happen after a model event (like sending an email after a user registers), we use `Observers`.
- **Form Requests for Validation:** All request validation is handled by dedicated `FormRequest` classes.

### **🎨 Coding Standards**

- **PSR-12:** We follow the PSR-12 coding standard.
- **Laravel Pint:** We use Laravel Pint for automatic code styling. Before you commit, always run:
    ```bash
    ./vendor/bin/pint
    ```

### **🧪 Our Testing Culture**

- **Quality is a Shared Goal:** We believe tests are essential for building a stable and reliable application.
- **Pest is our Tool:** We use Pest for its elegant and readable syntax.
- **Coverage is Key:** Your Pull Request is much more likely to be accepted quickly if it includes thorough tests for any new code.

---

## 🆘 Getting Help

If you get stuck or have questions:

- Check the [Discussions](https://github.com/Emran025/shafeea/discussions) for help or to ask questions.
- Open an issue if you think you've found a bug.
- Reach out to the maintainers via the contact info in the README.

Thank you again for your time and effort. We're excited to see your contributions! 🎉
