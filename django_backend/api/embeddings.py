import os
import json
import math
import numpy as np
from PIL import Image
import requests
from io import BytesIO
from django.conf import settings

# Try importing google-generativeai for text embeddings
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

# ----------------- TEXT EMBEDDINGS -----------------

def get_text_embedding_gemini(text):
    """
    Get text embedding from Gemini API
    """
    api_key = getattr(settings, 'GEMINI_API_KEY', '')
    if not api_key or not HAS_GEMINI:
        return None
    
    try:
        genai.configure(api_key=api_key)
        # Using the standard text embedding model from Google
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        print(f"Error calling Gemini Embedding API: {e}")
        return None


def get_local_tfidf_embedding(text, vocabulary, idf):
    """
    Simple local TF-IDF vectorizer fallback.
    Returns a normalized vector (list of floats).
    """
    if not vocabulary:
        return []
    
    # Tokenize and clean text
    words = [w.strip(".,!?\"'()").lower() for w in text.split()]
    words = [w for w in words if len(w) > 2]
    
    # Calculate Term Frequency (TF)
    tf = {}
    for word in words:
        if word in vocabulary:
            tf[word] = tf.get(word, 0) + 1
            
    # Calculate TF-IDF vector
    vector = np.zeros(len(vocabulary))
    for i, word in enumerate(vocabulary):
        if word in tf:
            # log normalization for TF
            tf_val = 1 + math.log(tf[word])
            vector[i] = tf_val * idf.get(word, 1.0)
            
    # Normalize the vector (L2 norm)
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
        
    return vector.tolist()


def build_vocabulary_and_idf(products_list):
    """
    Build TF-IDF vocabulary and IDF dict from a list of products.
    """
    doc_count = len(products_list)
    if doc_count == 0:
        return [], {}
        
    df = {}
    vocabulary_set = set()
    
    # Clean and tokenize each product description/name
    tokenized_docs = []
    for p in products_list:
        text = f"{p.name} {p.description}".lower()
        words = set([w.strip(".,!?\"'()").lower() for w in text.split()])
        words = {w for w in words if len(w) > 2}
        tokenized_docs.append(words)
        
        for word in words:
            df[word] = df.get(word, 0) + 1
            vocabulary_set.add(word)
            
    vocabulary = sorted(list(vocabulary_set))
    
    # Calculate Inverse Document Frequency (IDF)
    idf = {}
    for word, count in df.items():
        idf[word] = math.log(1 + (doc_count / count))
        
    return vocabulary, idf


def calculate_cosine_similarity(vec1, vec2):
    """
    Calculate cosine similarity between two lists of numbers.
    """
    if not vec1 or not vec2:
        return 0.0
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    
    # Check shape match
    if v1.shape != v2.shape:
        return 0.0
        
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
        
    return float(np.dot(v1, v2) / (norm1 * norm2))


# ----------------- IMAGE FEATURE EXTRACTION (VISUAL SEARCH) -----------------

def get_image_color_histogram(image_source):
    """
    Extracts a 3D color histogram from an image.
    Supports file path, PIL Image, URL, or Django uploaded file.
    Returns a list of 512 normalized floats (8 bins per channel in RGB).
    """
    try:
        img = None
        if isinstance(image_source, Image.Image):
            img = image_source
        elif isinstance(image_source, str):
            if image_source.startswith(('http://', 'https://')):
                response = requests.get(image_source, timeout=5)
                img = Image.open(BytesIO(response.content))
            else:
                img = Image.open(image_source)
        else:
            # Handle Django uploaded file
            img = Image.open(image_source)
            
        if img is None:
            return []
            
        # Convert to RGB if not already
        img = img.convert('RGB')
        
        # Resize to speed up calculation
        img = img.resize((150, 150))
        
        # Convert to numpy array
        data = np.array(img)
        
        # Calculate 3D histogram: 8 bins per channel (8x8x8 = 512 dimensions)
        # Bins: 0-31, 32-63, 64-95, 96-127, 128-159, 160-191, 192-223, 224-255
        hist, _ = np.histogramdd(
            data.reshape(-1, 3), 
            bins=(8, 8, 8), 
            range=((0, 256), (0, 256), (0, 256))
        )
        
        # Flatten and L2 Normalize
        vector = hist.flatten()
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
            
        return vector.tolist()
    except Exception as e:
        print(f"Error extracting image color histogram: {e}")
        return []
