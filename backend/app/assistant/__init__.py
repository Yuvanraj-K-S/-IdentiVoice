import datetime
import webbrowser
import requests
import json
import os
import subprocess
import wikipedia
from urllib.request import urlopen

def process_command(query):
    query = query.lower()
    response = ""
    action = None
    url = None
    query_term = None

    try:
        # Time-based greeting
        hour = datetime.datetime.now().hour
        if hour < 12:
            response = "Good Morning! "
        elif hour < 18:
            response = "Good Afternoon! "
        else:
            response = "Good Evening! "

        # Command processing
        if 'wikipedia' in query:
            query = query.replace("wikipedia", "")
            results = wikipedia.summary(query, sentences=2)
            response += "According to Wikipedia: " + results

        elif 'open youtube' in query:
            response += "Opening YouTube"
            action = "open"
            url = "https://youtube.com"

        elif 'open google' in query:
            response += "Opening Google"
            action = "open"
            url = "https://google.com"

        elif 'open stackoverflow' in query:
            response += "Opening Stack Overflow"
            action = "open"
            url = "https://stackoverflow.com"

        elif 'the time' in query:
            strTime = datetime.datetime.now().strftime("%H:%M:%S")
            response += f"The time is {strTime}"

        elif 'search' in query:
            search_query = query.replace("search", "").strip()
            response += f"Searching for {search_query}"
            action = "search"
            query_term = search_query

        elif 'who are you' in query or "what's your name" in query:
            response += "I am your voice assistant"

        elif 'logout' in query or 'exit' in query:
            response += "Logging out"
            action = "logout"

        elif 'joke' in query:
            response += "Why don't scientists trust atoms? Because they make up everything!"

        elif 'weather' in query:
            city = query.split('weather in ')[-1] if 'weather in ' in query else "New York"
            response += f"Showing weather for {city}"
            action = "search"
            query_term = f"weather in {city}"

        elif 'news' in query:
            response += "Here are the latest news headlines"
            action = "open"
            url = "https://news.google.com"

        else:
            response = "I'm not sure how to help with that. Try asking something else."

        return {
            'response': response,
            'action': action,
            'url': url,
            'query': query_term
        }

    except Exception as e:
        return {
            'response': f"Sorry, I encountered an error: {str(e)}"
        }