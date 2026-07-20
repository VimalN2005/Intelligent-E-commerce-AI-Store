import os
from django.conf import settings
from .models import Product, ChatSession, ChatMessage
from .embeddings import calculate_cosine_similarity, get_text_embedding_gemini
import json

# Try importing google-generativeai
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

class AIChatbot:
    """
    Intelligent AI Chatbot for E-commerce queries, descriptions, and recommendations.
    Supports real Gemini API and high-quality local rule-based fallback.
    """
    def __init__(self, session_id):
        self.session_id = session_id
        self.session, _ = ChatSession.objects.get_or_create(session_id=session_id)
        self.api_key = getattr(settings, 'GEMINI_API_KEY', '')

    def get_history(self, limit=10):
        messages = ChatMessage.objects.filter(session=self.session).order_by('created_at')
        history_list = []
        for msg in messages:
            history_list.append({
                'role': 'user' if msg.sender == 'user' else 'model',
                'parts': [msg.message]
            })
        return history_list

    def save_message(self, sender, text):
        ChatMessage.objects.create(
            session=self.session,
            sender=sender,
            message=text
        )

    def get_catalog_context(self):
        """
        Serialize all catalog products into a text string for the AI's context.
        """
        products = Product.objects.all()
        catalog_lines = []
        for p in products:
            catalog_lines.append(
                f"- ID: {p.id} | Name: {p.name} | Category: {p.category.name} | Price: ${p.price} | Stock: {p.stock} units | Description: {p.description[:100]}..."
            )
        return "\n".join(catalog_lines)

    def ask(self, user_message):
        # Save user message to history
        self.save_message('user', user_message)
        
        # Check if Gemini API is available
        if self.api_key and HAS_GEMINI:
            response_text = self._ask_gemini(user_message)
        else:
            response_text = self._ask_local_fallback(user_message)
            
        # Save AI response to history
        self.save_message('ai', response_text)
        return response_text

    def _ask_gemini(self, user_message):
        try:
            genai.configure(api_key=self.api_key)
            
            catalog = self.get_catalog_context()
            
            system_instruction = (
                "You are 'Aetheria AI', the intelligent product assistant for Aetheria Smart Shop.\n"
                "Your goal is to guide users, recommend products from our catalog, answer customer queries, and generate descriptive content.\n\n"
                "Here is our live product catalog:\n"
                f"{catalog}\n\n"
                "Rules:\n"
                "1. If recommending products, ALWAYS link them using markdown: `[Product Name](/products/ID)`. E.g., '[Wireless Earbuds](/products/3)'.\n"
                "2. Be concise, polite, and helpful.\n"
                "3. If a product is out of stock (Stock: 0), mention that but suggest an alternative category item.\n"
                "4. If the user asks you to 'generate a description' for a product, write a rich, compelling, marketing-ready product description with key features, suitable for a product details page.\n"
                "5. Only recommend products that are actually in the catalog provided above. If you don't have a matching product, offer similar categories."
            )
            
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_instruction
            )
            
            # Fetch past conversation messages
            history = self.get_history()[:-1] # Exclude the user message we just saved
            
            chat = model.start_chat(history=history)
            response = chat.send_message(user_message)
            return response.text
        except Exception as e:
            print(f"Gemini API Chat Error: {e}. Falling back to local assistant.")
            return self._ask_local_fallback(user_message)

    def _ask_local_fallback(self, user_message):
        """
        Intelligent Local chatbot fallback. Uses keyword routing, simple vector search
        on catalog, and template descriptions.
        """
        query = user_message.lower()
        products = list(Product.objects.all())
        
        # 1. GREETINGS & INTRO
        if any(greet in query for greet in ['hello', 'hi', 'hey', 'greetings', 'who are you', 'help']):
            return (
                "👋 **Welcome to Aetheria E-Commerce!** I am your **Aetheria AI Product Assistant**.\n\n"
                "I can help you with:\n"
                "- 🔍 **Recommendations**: Ask me 'Recommend a gadget' or 'Suggest wireless headphones'.\n"
                "- 📝 **Description Generation**: Ask 'Generate a description for [Product Name]'.\n"
                "- 🛒 **Store Queries**: Ask about shipping, stock levels, or store hours.\n\n"
                "What can I do for you today?"
            )
            
        # 2. GENERATE DESCRIPTION FOR PRODUCT
        if 'generate a description' in query or 'write description' in query or 'describe' in query:
            # Find which product they are talking about
            target_prod = None
            for p in products:
                if p.name.lower() in query:
                    target_prod = p
                    break
            
            if target_prod:
                return (
                    f"### ✨ Premium Description for **{target_prod.name}**\n\n"
                    f"Elevate your lifestyle with the all-new **{target_prod.name}**! Engineered to deliver class-leading performance in the **{target_prod.category.name}** category.\n\n"
                    f"#### 🚀 Key Features:\n"
                    f"- **Superior Design**: Crafted with premium materials for durability and comfort.\n"
                    f"- **Advanced Integration**: Built specifically to blend into your daily routine seamlessly.\n"
                    f"- **Value for Money**: Priced at just **${target_prod.price}**.\n\n"
                    f"*{target_prod.description}*\n\n"
                    f"🛒 [View and Add to Cart](/products/{target_prod.id})"
                )
            else:
                return "I couldn't identify the product. Please specify the exact name, e.g., 'Generate a description for Smart Watch Pro'."

        # 3. STOCK LEVEL INQUIRY
        if 'stock' in query or 'inventory' in query or 'how many' in query:
            target_prod = None
            for p in products:
                if p.name.lower() in query:
                    target_prod = p
                    break
                    
            if target_prod:
                status = "🟢 In Stock" if target_prod.stock > 0 else "🔴 Out of Stock"
                return (
                    f"📦 **Stock Update** for **{target_prod.name}**:\n"
                    f"- Current Status: **{status}**\n"
                    f"- Available Inventory: **{target_prod.stock} units**\n"
                    f"- Price: **${target_prod.price}**\n\n"
                    f"Would you like to buy this item? [View Product](/products/{target_prod.id})"
                )

        # 4. STORE POLICY / HOURS
        if any(k in query for k in ['shipping', 'delivery', 'return', 'refund', 'hours', 'open']):
            return (
                "ℹ️ **Aetheria Store Information**:\n"
                "- 🚚 **Shipping**: Free standard delivery on all orders over $50. Standard shipping takes 3-5 business days.\n"
                "- 🔄 **Returns**: 30-day money-back guarantee. Return label provided in your dashboard.\n"
                "- ⏰ **Support Hours**: Our customer support lines are open 24/7. Chat assistant is always online."
            )

        # 5. RECOMMENDATIONS / PRODUCT SEARCH
        # Let's perform a simple keyword match or similarity check
        recommendations = []
        
        # Check by category name first
        for p in products:
            if p.category.name.lower() in query or any(word in p.description.lower() for word in query.split() if len(word) > 4):
                if p not in recommendations:
                    recommendations.append(p)
                    
        # Limit to 3 items
        recommendations = recommendations[:3]
        
        if recommendations:
            res = "🎯 Based on your request, here are my top recommendations for you:\n\n"
            for r in recommendations:
                status = "Available" if r.stock > 0 else "Out of stock"
                res += f"- **[{r.name}](/products/{r.id})** ({r.category.name}) - **${r.price}** | *{status}*\n"
                res += f"  > {r.description[:80]}...\n\n"
            res += "Would you like me to tell you more about any of these?"
            return res
            
        # 6. GENERIC FALLBACK
        # If we couldn't match anything specifically, return a friendly guide
        return (
            "🔍 I couldn't find a direct match for that in our current catalog.\n\n"
            "Here are some of our popular products you might like:\n"
            + "\n".join([f"- **[{p.name}](/products/{p.id})** - ${p.price}" for p in products[:3]]) +
            "\n\nFeel free to ask me to 'recommend electronic gadgets' or 'generate a description for Smart Watch Pro'!"
        )
