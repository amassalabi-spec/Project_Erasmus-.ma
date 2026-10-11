# Exemple de Backend pour Lumina

## 🔧 Configuration Backend

Voici des exemples de code backend pour connecter Lumina à votre API existante.

## Option 1 : Express.js (Node.js)

### Installation
```bash
npm install express cors body-parser
```

### Code Complet
```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
  origin: '*', // En développement - Restreindre en production!
  methods: ['POST', 'GET', 'OPTIONS'],
  credentials: true
}));
app.use(bodyParser.json());

// Endpoint de test
app.get('/', (req, res) => {
  res.json({ status: 'Backend Lumina is running!' });
});

// Endpoint principal du chatbot
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Question reçue:', message);

    // ICI : Intégrez votre logique IA/chatbot
    // Exemples : OpenAI, Anthropic Claude, modèle local, etc.
    const response = await generateResponse(message);

    res.json({ response });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Désolé, une erreur est survenue lors du traitement de votre demande.'
    });
  }
});

// Fonction exemple pour générer une réponse
async function generateResponse(userMessage) {
  // OPTION A : Réponses prédéfinies (à remplacer par votre IA)
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('candidat') || lowerMessage.includes('postuler')) {
    return "Pour candidater à Erasmus+, vérifiez d'abord votre éligibilité auprès de votre coordinateur pédagogique, puis soumettez votre dossier via le portail de votre établissement avant la date limite.";
  }
  
  if (lowerMessage.includes('pays') || lowerMessage.includes('destination')) {
    return "Plus de 30 pays participent à Erasmus+ : les 27 États membres de l'UE, ainsi que la Turquie, la Norvège, l'Islande et d'autres. Quel pays vous intéresse en particulier ?";
  }

  // Réponse par défaut
  return "Merci pour votre question ! Notre équipe peut vous apporter une réponse précise. Comment puis-je vous orienter ?";

  // OPTION B : Intégration OpenAI (exemple commenté)
  /*
  const { Configuration, OpenAIApi } = require('openai');
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const completion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "Tu es Lumina, une assistante spécialisée dans le programme Erasmus+. Tu aides les étudiants avec leurs questions sur la mobilité internationale."
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.data.choices[0].message.content;
  */
}

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Backend Lumina démarré sur http://localhost:${PORT}`);
  console.log(`📡 Endpoint API: http://localhost:${PORT}/api/chat`);
});
```

---

## Option 2 : Python + Flask

### Installation
```bash
pip install flask flask-cors
```

### Code Complet
```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Active CORS pour toutes les routes

@app.route('/', methods=['GET'])
def home():
    return jsonify({"status": "Backend Lumina is running!"})

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')

        if not message:
            return jsonify({"error": "Message is required"}), 400

        print(f"Question reçue: {message}")

        # ICI : Intégrez votre logique IA/chatbot
        response = generate_response(message)

        return jsonify({"response": response})

    except Exception as e:
        print(f"Erreur: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "message": "Désolé, une erreur est survenue lors du traitement de votre demande."
        }), 500

def generate_response(user_message):
    """Génère une réponse basée sur le message de l'utilisateur"""
    message_lower = user_message.lower()

    # Réponses prédéfinies (à remplacer par votre IA)
    if 'candidat' in message_lower or 'postuler' in message_lower:
        return "Pour candidater à Erasmus+, vérifiez d'abord votre éligibilité auprès de votre coordinateur pédagogique, puis soumettez votre dossier via le portail de votre établissement avant la date limite."
    
    if 'pays' in message_lower or 'destination' in message_lower:
        return "Plus de 30 pays participent à Erasmus+ : les 27 États membres de l'UE, ainsi que la Turquie, la Norvège, l'Islande et d'autres. Quel pays vous intéresse en particulier ?"
    
    if 'bourse' in message_lower or 'aide' in message_lower:
        return "Les bourses Erasmus+ couvrent partiellement vos frais de séjour. Le montant dépend du pays de destination et de votre situation."

    # Réponse par défaut
    return "Merci pour votre question ! Notre équipe peut vous apporter une réponse précise. Comment puis-je vous orienter ?"

    # OPTION : Intégration OpenAI (exemple commenté)
    """
    import openai
    openai.api_key = 'votre-clé-api'
    
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Tu es Lumina, une assistante Erasmus+."},
            {"role": "user", "content": user_message}
        ],
        max_tokens=500,
        temperature=0.7
    )
    
    return response.choices[0].message.content
    """

if __name__ == '__main__':
    print("🚀 Backend Lumina démarré sur http://localhost:3000")
    print("📡 Endpoint API: http://localhost:3000/api/chat")
    app.run(host='0.0.0.0', port=3000, debug=True)
```

---

## Option 3 : Python + FastAPI

### Installation
```bash
pip install fastapi uvicorn python-multipart
```

### Code Complet
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En développement - Restreindre en production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.get("/")
def home():
    return {"status": "Backend Lumina is running!"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        if not request.message:
            raise HTTPException(status_code=400, detail="Message is required")

        print(f"Question reçue: {request.message}")

        # ICI : Intégrez votre logique IA/chatbot
        response = generate_response(request.message)

        return ChatResponse(response=response)

    except Exception as e:
        print(f"Erreur: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Désolé, une erreur est survenue lors du traitement de votre demande."
        )

def generate_response(user_message: str) -> str:
    """Génère une réponse basée sur le message de l'utilisateur"""
    message_lower = user_message.lower()

    # Réponses prédéfinies
    if 'candidat' in message_lower or 'postuler' in message_lower:
        return "Pour candidater à Erasmus+, vérifiez d'abord votre éligibilité auprès de votre coordinateur pédagogique."
    
    if 'pays' in message_lower or 'destination' in message_lower:
        return "Plus de 30 pays participent à Erasmus+. Quel pays vous intéresse ?"

    return "Merci pour votre question ! Comment puis-je vous aider davantage ?"

if __name__ == "__main__":
    import uvicorn
    print("🚀 Backend Lumina démarré sur http://localhost:3000")
    print("📡 Endpoint API: http://localhost:3000/api/chat")
    uvicorn.run(app, host="0.0.0.0", port=3000)
```

---

## 🧪 Tests de l'API

### Avec cURL
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Comment candidater à Erasmus ?"}'
```

### Avec Postman
1. Méthode : **POST**
2. URL : `http://localhost:3000/api/chat`
3. Headers : `Content-Type: application/json`
4. Body (raw JSON) :
```json
{
  "message": "Comment candidater à Erasmus ?"
}
```

### Avec JavaScript (Fetch)
```javascript
fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Comment candidater à Erasmus ?'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erreur:', error));
```

---

## 🔌 Intégration avec des IA

### OpenAI GPT
```javascript
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const response = await openai.createChatCompletion({
  model: "gpt-4",
  messages: [
    { role: "system", content: "Tu es Lumina, assistante Erasmus+" },
    { role: "user", content: userMessage }
  ],
});
```

### Anthropic Claude
```javascript
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    { role: "user", content: userMessage }
  ],
  system: "Tu es Lumina, une assistante Erasmus+."
});
```

---

## 📋 Checklist de Démarrage

- [ ] Backend installé et démarré sur port 3000
- [ ] CORS activé
- [ ] Endpoint `/api/chat` répond correctement
- [ ] Test avec cURL ou Postman réussi
- [ ] Frontend configuré avec la bonne URL (`API_CONFIG`)
- [ ] Mode "API Live" activé dans le chatbot
- [ ] Conversation de test fonctionnelle

---

**Bon développement ! 🚀**
