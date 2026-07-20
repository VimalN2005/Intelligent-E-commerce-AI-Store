from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
import requests
import threading
from .models import Product

def send_webhook_async(url, data):
    """
    Send POST request asynchronously to avoid blocking database transactions.
    """
    try:
        # 2-second timeout to fail fast
        response = requests.post(url, json=data, timeout=2.0)
        print(f"Stock webhook successfully sent to Node: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Could not connect to Node stock server webhook: {e}")

@receiver(post_save, sender=Product)
def product_stock_updated(sender, instance, created, **kwargs):
    """
    Signal handler that sends stock updates to the Node.js server.
    """
    webhook_url = getattr(settings, 'NODE_STOCK_URL', 'http://localhost:5001/api/update-stock')
    
    # Check if stock webhook is active
    if webhook_url:
        data = {
            'product_id': instance.id,
            'product_name': instance.name,
            'stock': instance.stock,
            'price': float(instance.price),
            'image_url': instance.image_url or (instance.image.url if instance.image else None)
        }
        
        # Run in a separate thread so Django remains highly responsive
        thread = threading.Thread(target=send_webhook_async, args=(webhook_url, data))
        thread.start()
