from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ProductViewSet, OrderViewSet, ChatAPIView, ChatHistoryView

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
    path('chat/', ChatAPIView.as_view(), name='chat'),
    path('chat/history/', ChatHistoryView.as_view(), name='chat-history'),
]
