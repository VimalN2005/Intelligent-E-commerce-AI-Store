from django.contrib import admin
from .models import Category, Product, Order, OrderItem, ChatSession, ChatMessage

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'price')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'price', 'stock', 'created_at')
    list_filter = ('category',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('General Info', {
            'fields': ('name', 'slug', 'category', 'description')
        }),
        ('Inventory & Pricing', {
            'fields': ('price', 'stock')
        }),
        ('Media & Layout', {
            'fields': ('image_url', 'image')
        }),
        ('System Fields', {
            'classes': ('collapse',),
            'fields': ('embedding_data', 'created_at', 'updated_at')
        })
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer_name', 'customer_email', 'total_price', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('customer_name', 'customer_email')
    readonly_fields = ('customer_name', 'customer_email', 'total_price', 'created_at')
    inlines = [OrderItemInline]


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ('sender', 'message', 'created_at')


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'created_at')
    search_fields = ('session_id',)
    inlines = [ChatMessageInline]
