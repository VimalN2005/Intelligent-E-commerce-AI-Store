from django.core.management.base import BaseCommand
from api.models import Category, Product
from api.embeddings import build_vocabulary_and_idf, get_local_tfidf_embedding, get_text_embedding_gemini
import json
import random
import numpy as np

class Command(BaseCommand):
    help = 'Seeds the database with initial categories and products, calculating their text embeddings'

    def handle(self, *args, **kwargs):
        self.stdout.write('Clearing existing database...')
        Product.objects.all().delete()
        Category.objects.all().delete()

        self.stdout.write('Creating categories...')
        electronics = Category.objects.create(name='Electronics', description='State-of-the-art gadgets and devices.')
        apparel = Category.objects.create(name='Apparel', description='Fashionable clothing and premium wear.')
        home = Category.objects.create(name='Home & Living', description='Exquisite home decor and kitchenware.')

        seed_data = [
            # ELECTRONICS
            {
                'category': electronics,
                'name': 'Aura Smart Watch Pro',
                'description': 'Advanced activity tracker with 1.43 inch AMOLED display, heart rate sensor, SPO2 tracking, built-in GPS, and 14-day battery life. Water resistant up to 50m.',
                'price': 149.99,
                'stock': 25,
                'image_url': 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=600&auto=format&fit=crop&q=80'
            },
            {
                'category': electronics,
                'name': 'SonicBuds Wireless ANC',
                'description': 'Premium noise-cancelling wireless earbuds with 10mm dynamic drivers, Bluetooth 5.3, transparent mode, IPX4 sweat resistance, and 30 hours of playback.',
                'price': 89.99,
                'stock': 40,
                'image_url': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80'
            },
            {
                'category': electronics,
                'name': 'Apex Mechanical Keyboard',
                'description': 'Tenkeyless mechanical gaming keyboard with hot-swappable tactile switches, RGB per-key backlighting, aluminum top plate, and detachable USB-C cable.',
                'price': 119.99,
                'stock': 15,
                'image_url': 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&auto=format&fit=crop&q=80'
            },
            {
                'category': electronics,
                'name': 'Optima Portable Projector',
                'description': 'Full HD 1080p pocket projector. Features 500 ANSI lumens brightness, built-in stereo speakers, HDMI, Wi-Fi casting, and up to 120-inch screen display capability.',
                'price': 299.99,
                'stock': 8,
                'image_url': 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600&auto=format&fit=crop&q=80'
            },
            
            # APPAREL
            {
                'category': apparel,
                'name': 'Vanguard Waterproof Jacket',
                'description': 'All-weather breathable windbreaker and rain jacket. Features seam-sealed technology, adjustable hood, utility pockets, and warm fleece inner lining.',
                'price': 79.99,
                'stock': 30,
                'image_url': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80'
            },
            {
                'category': apparel,
                'name': 'Urban Comfort Knit Sneakers',
                'description': 'Ultra-lightweight walking shoes with breathable knit mesh upper, memory foam cushioning sole, and elastic slip-on collar for daily comfort.',
                'price': 64.99,
                'stock': 50,
                'image_url': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'
            },
            {
                'category': apparel,
                'name': 'Classic Leather Satchel Bag',
                'description': 'Handcrafted genuine top-grain leather messenger bag with magnetic clasp closures, padded 15-inch laptop compartment, and adjustable shoulder strap.',
                'price': 125.00,
                'stock': 12,
                'image_url': 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&auto=format&fit=crop&q=80'
            },
            
            # HOME & LIVING
            {
                'category': home,
                'name': 'Zen Ceramic Essential Oil Diffuser',
                'description': 'Ultrasonic cool mist humidifier and aromatherapy diffuser. Features silent ultrasonic operation, handmade porcelain cover, and 7-color warm ambient LED light.',
                'price': 39.99,
                'stock': 60,
                'image_url': 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80'
            },
            {
                'category': home,
                'name': 'Luna Glass Decanter Set',
                'description': 'Elegant lead-free crystal whiskey decanter with four matching geometric glasses. Features solid heavy base design and airtight geometric stopper.',
                'price': 49.99,
                'stock': 20,
                'image_url': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=80'
            },
            {
                'category': home,
                'name': 'Nordic Brass Desk Lamp',
                'description': 'Minimalist industrial desk light with adjustable brass neck, heavy marble base, and soft-glow LED Edison bulb included.',
                'price': 55.00,
                'stock': 18,
                'image_url': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80'
            }
        ]

        self.stdout.write('Saving products...')
        created_products = []
        for item in seed_data:
            product = Product.objects.create(
                category=item['category'],
                name=item['name'],
                description=item['description'],
                price=item['price'],
                stock=item['stock'],
                image_url=item['image_url']
            )
            created_products.append(product)

        self.stdout.write('Calculating embeddings for catalog similarity...')
        
        # 1. Try calculation using Gemini API
        gemini_success = False
        for p in created_products:
            vector = get_text_embedding_gemini(f"{p.name} {p.description}")
            if vector:
                p.set_embedding(vector)
                p.save()
                gemini_success = True
                
        # 2. Fallback to Local TF-IDF + Random Dense dimensions so we have consistent vectors
        if not gemini_success:
            self.stdout.write('Gemini API key not active. Seeding local TF-IDF vectors...')
            vocab, idf = build_vocabulary_and_idf(created_products)
            
            # Save vocabulary configuration for consistent local vector sizes
            for p in created_products:
                local_vector = get_local_tfidf_embedding(f"{p.name} {p.description}", vocab, idf)
                
                # To make vectors matches standard length in testing and fit a dense matrix space,
                # we pad it with deterministic small random floats matching the seed of product ID.
                random.seed(p.id)
                dense_size = 512
                dense_vector = [0.0] * dense_size
                for idx, val in enumerate(local_vector):
                    if idx < dense_size:
                        dense_vector[idx] = val
                        
                # Fill remaining spots with tiny noise to emulate vector spaces
                for idx in range(len(local_vector), dense_size):
                    dense_vector[idx] = random.uniform(-0.01, 0.01)
                    
                # Normalize final dense representation
                v_arr = np.array(dense_vector)
                v_norm = np.linalg.norm(v_arr)
                if v_norm > 0:
                    v_arr = v_arr / v_norm
                
                p.set_embedding(v_arr.tolist())
                p.save()

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(created_products)} products and computed embeddings!'))
