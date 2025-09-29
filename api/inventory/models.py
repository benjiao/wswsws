from django.db import models

# Create your models here.
class Medicine(models.Model):
    OUT_OF_STOCK = 0
    LOW_STOCK = 1
    IN_STOCK = 2

    STOCK_STATUS_CHOICES = (
        (OUT_OF_STOCK, 'Out of Stock'),
        (LOW_STOCK, 'Low Stock'),
        (IN_STOCK, 'In Stock'),
    )

    name = models.CharField(max_length=255)
    stock_status = models.IntegerField(choices=STOCK_STATUS_CHOICES, default=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
