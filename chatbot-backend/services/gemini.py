import os
import pathlib
from google import genai
from groq import Groq
from dotenv import load_dotenv
from services.rag import search_company_knowledge
from services.financial_data import get_stock_price
import re

# Load .env using an absolute path so it always works regardless of working directory
env_path = pathlib.Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# Common financial/general acronyms that are NOT stock tickers
NON_TICKER_WORDS = {
    "SIP", "EMI", "GDP", "GST", "KYC", "UPI", "NAV", "NFO", "FD", "RD",
    "PPF", "EPF", "NPS", "IPO", "NSE", "BSE", "RBI", "SEBI", "AMFI", "PAN",
    "ATM", "PIN", "OTP", "CEO", "CFO", "FAQ", "USA", "UAE", "US", "UK",
    "ETF", "SGB", "FPI", "FII", "DII", "HNI", "ELSS", "LTCG", "STCG",
    "TDS", "TCS", "ITR", "CAGR", "XIRR", "AI", "API", "URL", "HTTP"
}

# Common Hinglish stopwords and colloquial terms used in Hindi/Hinglish but NOT English
HINGLISH_WORDS = {
    "kya", "chahiye", "batao", "bataiye", "kaise", "bhi", "toh", "agar",
    "nivesh", "paise", "karu", "karun", "kr", "kra", "samjhao", "dikhao",
    "chalo", "chalte", "hain", "hai", "aur", "ki", "ka", "ke", "mein", "ko", "se",
    "kese", "ese", "karna", "krna", "he", "h", "na", "ab", "isse", "kis", "pe",
    "ho", "jaata", "jaati", "gaya", "gayi", "gya", "gyi", "tyohar", "din", "raat",
    "bhai", "behen", "rakhi", "aata", "aati", "kaunsa", "kaunsi", "konse", "kon",
    "kya", "kyu", "kyoon", "kyun", "kab", "kahan", "kahin", "puchu", "pucha", "ans",
    "jawab", "de", "rha", "rhi", "rhey", "raha", "rahi", "rahay"
}

def extract_ticker(query: str) -> str:
    """
    Extracts a stock ticker symbol from a query.
    Skips known financial acronyms that are not stock tickers.
    Only triggers if the query explicitly mentions price/stock/share.
    """
    # Only look for tickers if the user is asking about price or stock
    price_keywords = ["price", "stock", "share", "trading", "nifty", "sensex", "rate of"]
    if not any(kw in query.lower() for kw in price_keywords):
        return ""

    matches = re.findall(r'\b([A-Z]{2,5})\b', query)
    for match in matches:
        if match not in NON_TICKER_WORDS:
            return match
    return ""


def generate_chat_response(messages: list) -> str:
    # Check if Groq API Key is available
    groq_key = os.getenv("GROQ_API_KEY")
    api_key = os.getenv("GEMINI_API_KEY")

    if not groq_key and (not api_key or api_key == "your_gemini_api_key_here"):
        return "System Error: No API Key configured. Please set GEMINI_API_KEY or GROQ_API_KEY in backend/.env"

    try:
        user_query = messages[-1].content if messages else ""

        # 1. Determine Language Directive dynamically
        is_hindi_script = bool(re.search(r'[\u0900-\u097F]', user_query))
        query_words = set(re.findall(r'\b[a-zA-Z]+\b', user_query.lower()))
        has_hinglish_words = bool(query_words.intersection(HINGLISH_WORDS))

        if is_hindi_script:
            lang_directive = "\n\n(Response instruction: Reply in Devanagari Hindi script only. Do NOT use Roman script. Do NOT use English.)"
        elif has_hinglish_words:
            lang_directive = "\n\n(Response instruction: Reply in Hinglish (Roman script, e.g., 'Bilkul! Agar aap...') only. Do NOT reply in Devanagari script. Do NOT reply in English.)"
        else:
            lang_directive = "\n\n(Response instruction: Reply in pure English only. Do NOT write in Hinglish. Do NOT write in Hindi or Devanagari script. Start your response in English and continue in English.)"

        # 2. Retrieve Company Knowledge
        company_context = search_company_knowledge(user_query)

        # 3. Retrieve Live Financial Data
        ticker = extract_ticker(user_query)
        financial_context = ""
        if ticker:
            price_data = get_stock_price(ticker)
            financial_context = f"Live data for {ticker}: {price_data}"

        # 4. Construct the System Instructions
        system_instruction = (
            "You are a smart financial assistant for SBS Financial Services, a trusted finance company based in Ahmedabad, Gujarat.\n\n"

            "LANGUAGE RULES (CRITICAL - YOU MUST FOLLOW THIS):\n"
            "1. Analyze the script and vocabulary of the user's LATEST message to determine the response language.\n"
            "2. If the user's message is written in English script and uses English vocabulary (e.g. 'what is SIP', 'Insurance Plans', 'Goal 1cr in 10 years then what should be monthly investment amount'), you MUST reply in 100% English. Do NOT write in Hindi script, and do NOT write in Hinglish. Start your response in English and keep it in English.\n"
            "3. If the user's message is written in English script but uses Hindi vocabulary (Hinglish, e.g. 'sip kya hai', 'lumpsum batao', 'mujhe 1 crore chahiye 10 saal mein'), you MUST reply in natural Hinglish (Roman script, e.g. 'Bilkul! Agar aap 10 saal mein...').\n"
            "4. If the user's message is written in Devanagari Hindi script (e.g. 'एसआईपी क्या है'), you MUST reply in Devanagari Hindi script.\n"
            "5. Always match the user's script and language instantly. Never let previous messages in the history lock you into a language.\n\n"

            "SMART GOAL DETECTION:\n"
            "If the user mentions a financial goal with a time frame (e.g. '1 crore 10 saal mein chahiye', 'I want 50 lakh in 5 years', 'retirement ke liye 5 crore chahiye 20 saal mein'):\n"
            "1. Calculate the required monthly SIP amount using 12% annual return (standard assumed return).\n"
            "   Formula: PMT = FV * r / ((1+r)^n - 1) where r = monthly rate (0.12/12 = 0.01), n = months (years * 12), FV = Future Value.\n"
            "   (For example: 1 Crore in 10 years is approx ₹43,000/month SIP).\n"
            "2. Show the result clearly in the user's language.\n"
            "3. Ask if they want to explore this in the calculator (provide a redirect button/link).\n"
            "4. Also mention the lumpsum option if relevant (assume 12% annual compound growth. PV = FV / (1+r)^n).\n\n"

            "CALCULATOR REDIRECT RULES:\n"
            "- Here is our website complete sitemap:\n"
            "  - Home Page: /\n"
            "  - About Us: /about\n"
            "  - Services (Main): /services\n"
            "  - Financial Planning Service: /services/financial-planning\n"
            "  - Retirement Planning Service: /services/retirement-planning\n"
            "  - Investment Management Service: /services/investment-management\n"
            "  - Mutual Fund & SIP Advisory Service: /services/mutual-fund-sip\n"
            "  - Tax Planning Service: /services/tax-planning\n"
            "  - Corporate & Retail Loans Service: /services/corporate-retail-loans\n"
            "  - Insurance Solutions Service: /services/insurance-solutions\n"
            "  - NRI Investment Services: /services/nri-investment\n"
            "  - Portfolio Review & Rebalancing Service: /services/portfolio-review\n"
            "  - Estate Planning Service: /services/estate-planning\n"
            "  - Products: /products\n"
            "  - Calculators (Main Hub): /calculator\n"
            "  - Investment Calculator (Lumpsum/Growth): /calculators/investment\n"
            "  - Mutual Fund & SIP Calculator: /calculators/mutual-funds\n"
            "  - Contact Page: /contact\n"
            "- AUTOMATIC REDIRECTS vs CLICKABLE LINKS:\n"
            "  1. If the user EXPLICITLY asks to navigate (e.g. 'take me to the calculator', 'open services', 'go to contact page', 'calculator open karo'), you MUST output the JSON command `{\"action\": \"REDIRECT\", \"url\": \"/path\"}` on a new line to trigger automatic page redirection.\n"
            "  2. If the user is just asking a question (e.g. 'Goal 1cr in 10 years...', 'what is SIP', 'loan packages'), do NOT output the JSON redirect command. Instead, output a clickable markdown link inside your response text, formatted as `[Link Text](/path)` (e.g., '[Mutual Fund Calculator](/calculators/mutual-funds)'). This allows the user to read your answer and click the link when they are ready.\n"
            "- Mapping for redirects and links:\n"
            "  - Monthly SIP, goal amount, future value, mutual fund returns -> `/calculators/mutual-funds`\n"
            "  - Lumpsum invest, ek baar mein paisa, general investment growth -> `/calculators/investment`\n"
            "  - Home loan, car loan, EMI, FD, RD -> `/calculator` (Main Hub)\n"
            "  - For any page navigation requests -> Redirect/link to the exact sitemap URL.\n"
            "- CRITICAL LINK RULE: When you mention any page in your text response, you MUST link to it using the EXACT relative path from the sitemap, formatted as [Link Text](/path). For example: [Mutual Fund Calculator](/calculators/mutual-funds). NEVER use external placeholder domains like 'example.com' or 'google.com'. All internal website links must start with a single slash '/'.\n\n"

            "TONE & PERSONALITY:\n"
            "- Be warm, helpful, and conversational — like a knowledgeable friend, not a robot.\n"
            "- Use simple language. Avoid heavy financial jargon unless the user uses it first.\n"
            "- Always give a number or estimate when the user asks 'kitna lagega' or 'how much do I need'.\n"
            "- Never just say 'please consult a financial advisor' without first giving a helpful estimate.\n"
            "- Use ₹ symbol for Indian Rupees. Use Indian number system (lakhs, crores — not millions/billions).\n\n"

            "KNOWLEDGE & SCOPE RULES (STRICT):\n"
            "- ONLY answer questions related to finance, investments, mutual funds, SIPs, loans, tax planning, calculators, and our company services.\n"
            "- IF the user asks about ANY topic outside of finance (e.g., festival dates like Rakshabandhan, religious nights like Amavasya, holidays, International Yoga Day, general knowledge, recipes, sports, politics), you MUST politely refuse to answer. Do NOT try to answer the question, and do NOT try to connect/pivot it to finance. Refuse directly and politely.\n"
            "- Refusal Style (English): 'I am FinAI, your financial assistant. I can only help you with finance-related questions like mutual funds, SIP, loans, and tax planning. Please ask a financial query!'\n"
            "- Refusal Style (Hinglish): 'Main SBS Financial Services ka AI assistant hoon. Main aapki sirf finance, mutual funds, loans aur investment related questions me help kar sakta hoon. Please finance se related query puchein!'\n"
            "- Refusal Style (Hindi): 'मैं FinAI हूँ, आपका वित्तीय सहायक। मैं केवल म्यूचुअल फंड, एसआईपी, ऋण और कर योजना जैसे वित्त-संबंधित प्रश्नों में आपकी सहायता कर सकता हूँ। कृपया कोई वित्तीय प्रश्न पूछें!'\n"
            "- What you don't do: Do not give specific stock tips ('buy this stock'), do not guarantee returns, do not ask for sensitive personal data (PAN, Aadhaar, bank details).\n"
            "- Use company knowledge below only for company-specific questions.\n\n"

            f"--- COMPANY KNOWLEDGE ---\n{company_context}\n\n"
            f"--- LIVE FINANCIAL DATA ---\n{financial_context if financial_context else 'Not requested'}"
        )

        # 5. Generate response using Groq (Structured API)
        if groq_key:
            try:
                groq_client = Groq(api_key=groq_key)
                
                # Build messages array for Groq (with dynamic language directive on the latest message)
                groq_messages = [{"role": "system", "content": system_instruction}]
                for msg in messages[:-1]:
                    role = "user" if msg.role == "user" else "assistant"
                    groq_messages.append({"role": role, "content": msg.content})
                if messages:
                    groq_messages.append({"role": "user", "content": messages[-1].content + lang_directive})

                completion = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile", # Groq's most stable high-speed reasoning model
                    messages=groq_messages
                )
                return completion.choices[0].message.content
            except Exception as e:
                return f"⚠️ **Groq Error:** {str(e)[:200]}"
                
        # 6. Generate response using Gemini (Structured Fallback)
        else:
            client = genai.Client(api_key=api_key)
            from google.genai import types
            
            # Build messages array for Gemini (with dynamic language directive on the latest message)
            gemini_messages = []
            for msg in messages[:-1]:
                role = "user" if msg.role == "user" else "model"
                gemini_messages.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg.content)]
                ))
            if messages:
                gemini_messages.append(types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=messages[-1].content + lang_directive)]
                ))

            models_to_try = [
                'gemini-2.5-flash',
                'gemini-2.0-flash',
                'gemini-1.5-flash'
            ]
            
            response = None
            last_error = None
            
            for model_name in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=gemini_messages,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction
                        )
                    )
                    break # Success!
                except Exception as e:
                    err_str = str(e)
                    last_error = err_str
                    if '404' in err_str or '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str:
                        continue
                    else:
                        raise e
                        
            if not response:
                if '429' in last_error or 'RESOURCE_EXHAUSTED' in last_error:
                    return (
                        "⚠️ **Daily limit reached.** You have exhausted the free tier quota for all available models.\n\n"
                        "Please try again tomorrow, or enable billing in Google Cloud to remove limits."
                    )
                raise Exception(last_error)
    
            return response.text
            
    except Exception as e:
        err = str(e)
        if '429' in err or 'RESOURCE_EXHAUSTED' in err:
            return (
                "⚠️ **Rate limit reached.** The free API tier allows limited requests per minute.\n\n"
                "Please wait **30–60 seconds** and try again. "
                "To remove this limit, enable billing on your Google Cloud project."
            )
        if '403' in err or 'PERMISSION_DENIED' in err:
            return "⚠️ **API key error.** Please check your Gemini API key in the `.env` file."
        if '400' in err or 'INVALID_ARGUMENT' in err:
            return "⚠️ **Invalid API key.** Please generate a new key from Google AI Studio."
        return f"⚠️ **Error:** {err[:200]}"
