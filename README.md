# EcoPulse – AI-Powered Carbon Footprint & Reduction Advisor

EcoPulse is a Node.js web application that helps individuals and businesses estimate carbon emissions and receive practical reduction suggestions. The project combines a carbon-footprint calculator, an industry calculator, MongoDB-backed user sessions, Stripe checkout support, and a Retrieval-Augmented Generation (RAG) sustainability advisor powered by Google Gemini with a local fallback mode.

## Features

* Individual carbon-footprint calculator for electricity, LPG, travel, food, and recycling-related inputs.
* Industry carbon-footprint estimator based on company sector and employee count.
* AI-powered sustainability recommendations using a custom RAG pipeline.
* Local sustainability knowledge base covering electricity, LPG/cooking, transportation, and diet.
* Top-K vector similarity search with cosine similarity.
* Google Gemini generation and embedding support with deterministic local vector fallback.
* Offline/local recommendation fallback when Gemini is unavailable.
* User signup and login with password hashing using `bcrypt`.
* MongoDB + Mongoose for persistence and MongoDB-backed Express sessions.
* Stripe Checkout integration for carbon-offset products.
* Server-rendered EJS pages with static CSS and image assets.

## Tech Stack

**Frontend:** EJS, HTML, CSS, JavaScript
**Backend:** Node.js, Express.js
**Database:** MongoDB, Mongoose
**Authentication/Sessions:** bcrypt, express-session, connect-mongo, Passport dependencies
**AI / RAG:** Google Gemini API, custom vector store, cosine similarity, local term-frequency fallback
**Payments:** Stripe
**Configuration:** dotenv

## Project Structure

```text
Eco Pulse/
├── app.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── routes/
│   └── aiRoutes.js
├── rag/
│   ├── chunker.js
│   ├── ingest.js
│   ├── ragService.js
│   ├── test_rag.js
│   └── vectorStore.js
├── data/
│   ├── vectorStore.json
│   └── knowledge_base/
│       ├── cooking_lpg.md
│       ├── diet_food.md
│       ├── electricity_energy.md
│       └── transportation.md
├── Views/
│   ├── home.ejs
│   ├── calculator.ejs
│   ├── result.ejs
│   ├── industry-calculator.ejs
│   ├── result-industry.ejs
│   ├── login.ejs
│   ├── signup.ejs
│   └── ...
└── Public/
    ├── css/
    └── images/
```

## Prerequisites

Before running the project, install:

* Node.js and npm
* MongoDB locally, or use a MongoDB Atlas connection string
* A Stripe secret key if you want to use checkout
* A Google Gemini API key if you want Gemini-generated AI recommendations

The RAG module includes a local fallback, but the application still requires its normal backend configuration to run correctly.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

On Windows Command Prompt:

```bat
copy .env.example .env
```

Then configure:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/netzeroDB
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
STRIPE_PRIVATE_KEY=YOUR_STRIPE_SECRET_KEY
SESSION_SECRET=YOUR_LONG_RANDOM_SESSION_SECRET
SERVER_URL=http://localhost:3000
```

> Never commit your real `.env` file or API keys to GitHub.

### 4. Prepare the RAG knowledge base

A generated `data/vectorStore.json` is already included.

If you modify the files inside `data/knowledge_base/`, regenerate it using:

```bash
node rag/ingest.js
```

### 5. Start MongoDB

Make sure your local MongoDB service is running, or configure `MONGODB_URI` with a MongoDB Atlas connection string.

### 6. Start the application

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Useful pages:

```text
/                     Home
/calculator           Individual carbon calculator
/industry-calculator  Industry calculator
/result               Individual result
/signup               Create account
/login                Login
/offset               Offset page
/faq                  FAQ
/about                 About
/vision                Vision
/team                  Team
```

## AI Recommendation API

Endpoint:

```http
POST /api/ai/recommendations
```

Example request:

```json
{
  "footprint": 520,
  "percentages": [30, 10, 45, 15]
}
```

The array represents:

```text
[Electricity %, LPG %, Travel %, Food %]
```

The RAG service identifies the largest emission categories, retrieves relevant sustainability information from the local vector store, and uses Gemini to produce grounded recommendations.

If Gemini is unavailable, EcoPulse falls back to recommendations generated directly from retrieved knowledge-base content.

## RAG Flow

```text
User Calculator Data
        |
        v
Emission Category Breakdown
        |
        v
Query Builder
        |
        v
Vector Similarity Search (Top K = 3)
        |
        v
Relevant Knowledge Base Chunks
        |
        +--------------------------+
        |                          |
        v                          v
Google Gemini Available?       No / API Failure
        |                          |
        v                          v
Grounded AI Response        Local Grounded Fallback
        |                          |
        +------------+-------------+
                     |
                     v
          Recommendations + Sources
```

## Security Notes

* `.env` is ignored by Git and should contain private keys and connection strings.
* `node_modules` is ignored and should never be pushed to GitHub.
* Use a strong random value for `SESSION_SECRET`.
* Never expose Stripe secret keys, Gemini API keys, or MongoDB credentials.
* For production deployment, review authentication, session cookies, Stripe redirects, validation, logging, and error handling.

## Commands

Start the application:

```bash
npm start
```

Rebuild the RAG vector store:

```bash
node rag/ingest.js
```

## Contributing

1. Create a new branch.
2. Make your changes.
3. Test locally.
4. Commit with a clear message.
5. Push the branch and create a pull request.

## License

The current `package.json` declares the project license as `ISC`.
