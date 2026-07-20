from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.files.storage import default_storage

from .models import Category, Product, Order, OrderItem, ChatSession, ChatMessage
from .serializers import (
    CategorySerializer, ProductSerializer, OrderSerializer, 
    OrderItemSerializer, ChatMessageSerializer, ChatSessionSerializer
)
from .embeddings import (
    calculate_cosine_similarity, get_image_color_histogram, 
    build_vocabulary_and_idf, get_local_tfidf_embedding
)
from .chatbot import AIChatbot

import numpy as np
import os


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    @action(detail=True, methods=['get'])
    def similar(self, request, pk=None):
        """
        Endpoint: GET /api/products/<id>/similar/
        Returns similar products using text embeddings (vector cosine similarity).
        """
        target_product = self.get_object()
        all_products = Product.objects.exclude(id=target_product.id)
        
        if not all_products.exists():
            return Response([])
            
        target_emb = target_product.get_embedding()
        similarities = []

        # If we have pre-calculated embedding (e.g., Gemini)
        if target_emb:
            for p in all_products:
                p_emb = p.get_embedding()
                if p_emb:
                    sim = calculate_cosine_similarity(target_emb, p_emb)
                    similarities.append((p, sim))
        
        # Fallback: compute local TF-IDF similarity on the fly
        if not similarities:
            # Build tf-idf representation
            products_list = list(Product.objects.all())
            vocab, idf = build_vocabulary_and_idf(products_list)
            
            target_vec = get_local_tfidf_embedding(
                f"{target_product.name} {target_product.description}", vocab, idf
            )
            
            for p in all_products:
                p_vec = get_local_tfidf_embedding(
                    f"{p.name} {p.description}", vocab, idf
                )
                sim = calculate_cosine_similarity(target_vec, p_vec)
                similarities.append((p, sim))

        # Sort by similarity descending
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Take top 4 similar products
        top_similar = [item[0] for item in similarities[:4]]
        serializer = self.get_serializer(top_similar, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def search_image(self, request):
        """
        Endpoint: POST /api/products/search_image/
        Find products visual-wise by uploading an image.
        """
        uploaded_image = request.FILES.get('image')
        if not uploaded_image:
            return Response({'error': 'No image file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # 1. Calculate color histogram for uploaded image
        query_vector = get_image_color_histogram(uploaded_image)
        if not query_vector:
            return Response({'error': 'Failed to process uploaded image.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # 2. Compare with all products in catalog
        all_products = Product.objects.all()
        scored_products = []
        
        for p in all_products:
            # Check if product has an image to compare
            product_img = None
            if p.image:
                product_img = p.image
            elif p.image_url:
                # If image is stored as a web URL
                product_img = p.image_url
                
            if product_img:
                # Extract image vector (cached color histogram can be simulated here)
                p_vector = get_image_color_histogram(product_img)
                if p_vector:
                    sim = calculate_cosine_similarity(query_vector, p_vector)
                    # Add category matching weight (visual search often focuses on item types)
                    scored_products.append((p, sim))
                    
        # Sort products by similarity descending
        scored_products.sort(key=lambda x: x[1], reverse=True)
        
        # Serialize top matches
        results = [item[0] for item in scored_products[:6]]
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Override order creation to decrement stock atomically.
        """
        items_data = request.data.get('items', [])
        if not items_data:
            return Response({'error': 'Order must contain items.'}, status=status.HTTP_400_BAD_REQUEST)
            
        customer_name = request.data.get('customer_name')
        customer_email = request.data.get('customer_email')
        
        if not customer_name or not customer_email:
            return Response({'error': 'Customer name and email are required.'}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.create(
            customer_name=customer_name,
            customer_email=customer_email,
            status='Pending'
        )

        total_price = 0.0
        for item_data in items_data:
            product_id = item_data.get('product')
            quantity = int(item_data.get('quantity', 1))
            
            product = get_object_or_404(Product, id=product_id)
            
            # Check stock
            if product.stock < quantity:
                # Raise database exception to rollback transaction
                transaction.set_rollback(True)
                return Response(
                    {'error': f"Insufficient stock for {product.name}. Available: {product.stock}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Decrement stock (will trigger django post_save signal -> webhook)
            product.stock -= quantity
            product.save()
            
            price = float(product.price)
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                price=price
            )
            total_price += price * quantity
            
        order.total_price = total_price
        order.status = 'Completed'
        order.save()
        
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatAPIView(APIView):
    """
    Endpoint: POST /api/chat/
    Send message to AI assistant and receive response.
    """
    def post(self, request):
        session_id = request.data.get('session_id')
        message = request.data.get('message')
        
        if not session_id or not message:
            return Response(
                {'error': 'session_id and message are required parameters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        chatbot = AIChatbot(session_id)
        response_text = chatbot.ask(message)
        
        # Load conversation history for the return payload
        history = ChatMessage.objects.filter(session__session_id=session_id).order_by('created_at')
        serializer = ChatMessageSerializer(history, many=True)
        
        return Response({
            'response': response_text,
            'history': serializer.data
        }, status=status.HTTP_200_OK)


class ChatHistoryView(APIView):
    """
    Endpoint: GET /api/chat/history/?session_id=<session_id>
    Retrieve message history for a specific session.
    """
    def get(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response({'error': 'session_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        session = ChatSession.objects.filter(session_id=session_id).first()
        if not session:
            return Response({'history': []})
            
        messages = ChatMessage.objects.filter(session=session).order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True)
        return Response({'history': serializer.data})
